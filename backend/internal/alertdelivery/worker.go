package alertdelivery

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"

	"github.com/school-camera-platform/school-camera-platform/internal/database"
	"github.com/school-camera-platform/school-camera-platform/internal/database/sqlc"
	"github.com/school-camera-platform/school-camera-platform/internal/health"
)

// Worker delivers alert notifications to configured channels.
type Worker struct {
	cfg      WorkerConfig
	q        *sqlc.Queries
	telegram *TelegramClient
	loc      *time.Location
	logger   *slog.Logger
}

// NewWorker constructs an alert delivery worker.
func NewWorker(cfg WorkerConfig, q *sqlc.Queries, logger *slog.Logger) (*Worker, error) {
	loc, err := time.LoadLocation(cfg.Timezone)
	if err != nil {
		loc = time.UTC
	}
	w := &Worker{
		cfg:    cfg,
		q:      q,
		loc:    loc,
		logger: logger,
	}
	if cfg.TelegramEnabled && cfg.TelegramBotToken != "" && cfg.TelegramChatID != "" {
		w.telegram = NewTelegramClient(cfg.TelegramBotToken, cfg.TelegramChatID)
	}
	return w, nil
}

// Run polls and delivers alerts until ctx is cancelled.
func (w *Worker) Run(ctx context.Context) error {
	ticker := time.NewTicker(w.cfg.PollInterval)
	defer ticker.Stop()

	w.tick(ctx)
	for {
		select {
		case <-ctx.Done():
			w.writeHeartbeat(context.Background(), "STOPPING")
			return nil
		case <-ticker.C:
			w.tick(ctx)
		}
	}
}

func (w *Worker) tick(ctx context.Context) {
	w.writeHeartbeat(ctx, "RUNNING")

	if !w.cfg.TelegramEnabled {
		w.logger.Debug("telegram alert delivery disabled")
		return
	}
	if w.telegram == nil {
		w.logger.Warn("telegram enabled but bot token or chat id missing; skipping delivery")
		return
	}

	recipient := w.cfg.TelegramChatID
	if err := w.processPending(ctx, recipient); err != nil {
		w.logger.Error("process pending deliveries", "error", err)
	}
	if err := w.processOpenAlerts(ctx, recipient); err != nil {
		w.logger.Error("process open alerts", "error", err)
	}
	if err := w.processResolvedAlerts(ctx, recipient); err != nil {
		w.logger.Error("process resolved alerts", "error", err)
	}
}

func (w *Worker) writeHeartbeat(ctx context.Context, status string) {
	meta, _ := json.Marshal(map[string]any{
		"telegram_enabled": w.cfg.TelegramEnabled,
		"poll_seconds":     int(w.cfg.PollInterval.Seconds()),
	})
	_, err := w.q.InsertWorkerHeartbeat(ctx, sqlc.InsertWorkerHeartbeatParams{
		ID:         uuid.New(),
		WorkerName: w.cfg.WorkerName,
		WorkerType: WorkerTypeAlert,
		Status:     status,
		Metadata:   meta,
	})
	if err != nil {
		w.logger.Error("insert alert worker heartbeat", "error", err)
	}
}

func (w *Worker) processPending(ctx context.Context, recipient string) error {
	rows, err := w.q.ListPendingAlertDeliveries(ctx, sqlc.ListPendingAlertDeliveriesParams{
		Channel:  ChannelTelegram,
		Attempts: w.cfg.MaxAttempts,
		Limit:    50,
	})
	if err != nil {
		return err
	}
	for _, d := range rows {
		if err := w.deliverRow(ctx, d, recipient); err != nil {
			w.logger.Error("retry delivery", "delivery_id", d.ID, "error", err)
		}
	}
	return nil
}

func (w *Worker) processOpenAlerts(ctx context.Context, recipient string) error {
	alerts, err := w.q.ListAlertsNeedingOpenDelivery(ctx, sqlc.ListAlertsNeedingOpenDeliveryParams{
		Channel:   ChannelTelegram,
		Recipient: recipient,
		Limit:     50,
	})
	if err != nil {
		return err
	}
	for _, alert := range alerts {
		if !w.shouldNotify(alert) {
			continue
		}
		delivery, err := w.ensureDelivery(ctx, alert.ID, recipient, DeliveryKindOpened)
		if err != nil {
			return err
		}
		if delivery.Status == StatusSent || delivery.Status == StatusSkipped {
			continue
		}
		if err := w.deliverRow(ctx, delivery, recipient); err != nil {
			w.logger.Error("deliver open alert", "alert_id", alert.ID, "error", err)
		}
	}
	return nil
}

func (w *Worker) processResolvedAlerts(ctx context.Context, recipient string) error {
	alerts, err := w.q.ListResolvedAlertsNeedingDelivery(ctx, sqlc.ListResolvedAlertsNeedingDeliveryParams{
		Channel:   ChannelTelegram,
		Recipient: recipient,
		Limit:     50,
	})
	if err != nil {
		return err
	}
	for _, alert := range alerts {
		if !w.shouldNotify(alert) {
			continue
		}
		delivery, err := w.ensureDelivery(ctx, alert.ID, recipient, DeliveryKindResolved)
		if err != nil {
			return err
		}
		if delivery.Status == StatusSent || delivery.Status == StatusSkipped {
			continue
		}
		if err := w.deliverRow(ctx, delivery, recipient); err != nil {
			w.logger.Error("deliver resolved alert", "alert_id", alert.ID, "error", err)
		}
	}
	return nil
}

func (w *Worker) shouldNotify(alert sqlc.Alert) bool {
	if !w.cfg.SendSeverities[alert.Severity] {
		return false
	}
	if alert.Severity == health.SeverityCritical {
		return true
	}
	if alert.Severity == health.SeverityWarning {
		switch alert.AlertType {
		case health.AlertFFmpegRestartSpike, health.AlertUploadFailureSpike, health.AlertStreamWorkerStale:
			return true
		default:
			return false
		}
	}
	return false
}

func (w *Worker) ensureDelivery(ctx context.Context, alertID uuid.UUID, recipient, kind string) (sqlc.AlertDelivery, error) {
	existing, err := w.q.GetAlertDeliveryByTarget(ctx, sqlc.GetAlertDeliveryByTargetParams{
		AlertID:      alertID,
		Channel:      ChannelTelegram,
		Recipient:    recipient,
		DeliveryKind: kind,
	})
	if err == nil {
		return existing, nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return sqlc.AlertDelivery{}, err
	}
	created, err := w.q.CreateAlertDelivery(ctx, sqlc.CreateAlertDeliveryParams{
		ID:           uuid.New(),
		AlertID:      alertID,
		Channel:      ChannelTelegram,
		Recipient:    recipient,
		DeliveryKind: kind,
		Status:       StatusPending,
	})
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return w.q.GetAlertDeliveryByTarget(ctx, sqlc.GetAlertDeliveryByTargetParams{
				AlertID:      alertID,
				Channel:      ChannelTelegram,
				Recipient:    recipient,
				DeliveryKind: kind,
			})
		}
		return sqlc.AlertDelivery{}, err
	}
	return created, nil
}

func (w *Worker) deliverRow(ctx context.Context, delivery sqlc.AlertDelivery, recipient string) error {
	if delivery.Status == StatusSent || delivery.Status == StatusSkipped {
		return nil
	}
	if delivery.Attempts >= w.cfg.MaxAttempts {
		return nil
	}

	updated, err := w.q.IncrementAlertDeliveryAttempt(ctx, delivery.ID)
	if err != nil {
		return err
	}
	delivery = updated

	alert, err := w.q.GetAlertByID(ctx, delivery.AlertID)
	if err != nil {
		return err
	}
	actx, err := w.loadAlertContext(ctx, alert)
	if err != nil {
		return err
	}

	var text string
	switch delivery.DeliveryKind {
	case DeliveryKindResolved:
		text = FormatResolvedMessage(alert, actx, w.loc)
	default:
		text = FormatOpenMessage(alert, actx, w.loc)
	}

	if err := w.telegram.SendMessage(ctx, text); err != nil {
		w.logger.Warn("telegram send failed",
			"delivery_id", delivery.ID,
			"alert_id", delivery.AlertID,
			"kind", delivery.DeliveryKind,
			"attempt", delivery.Attempts,
			"error", err.Error(),
		)
		_, _ = w.q.MarkAlertDeliveryFailed(ctx, sqlc.MarkAlertDeliveryFailedParams{
			ID:        delivery.ID,
			LastError: database.TextFromString(err.Error()),
		})
		return err
	}

	_, err = w.q.MarkAlertDeliverySent(ctx, delivery.ID)
	if err != nil {
		return err
	}
	w.logger.Info("telegram alert delivered",
		"delivery_id", delivery.ID,
		"alert_id", delivery.AlertID,
		"kind", delivery.DeliveryKind,
		"attempt", delivery.Attempts,
	)
	return nil
}

func (w *Worker) loadAlertContext(ctx context.Context, alert sqlc.Alert) (AlertContext, error) {
	var actx AlertContext
	if sid := schoolIDPtr(alert.SchoolID); sid != nil {
		school, err := w.q.GetSchool(ctx, *sid)
		if err != nil && !errors.Is(err, pgx.ErrNoRows) {
			return actx, err
		}
		if err == nil {
			actx.SchoolName = school.Name
		}
	}
	if cid := cameraIDPtr(alert.CameraID); cid != nil {
		cam, err := w.q.GetCamera(ctx, *cid)
		if err != nil && !errors.Is(err, pgx.ErrNoRows) {
			return actx, err
		}
		if err == nil {
			actx.CameraName = cam.Name
		}
	}
	return actx, nil
}
