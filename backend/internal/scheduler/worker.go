package scheduler

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"time"

	"github.com/go-co-op/gocron"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/school-camera-platform/school-camera-platform/internal/database"
	"github.com/school-camera-platform/school-camera-platform/internal/database/sqlc"
	"github.com/school-camera-platform/school-camera-platform/internal/schoolschedule"
)

// Worker applies recording schedule state to camera_stream_states.
type Worker struct {
	cfg       WorkerConfig
	clock     *Clock
	q         *sqlc.Queries
	schedEval *schoolschedule.Evaluator
	logger    *slog.Logger
}

// NewWorker constructs a scheduler worker.
func NewWorker(cfg WorkerConfig, q *sqlc.Queries, logger *slog.Logger) (*Worker, error) {
	clock, err := NewClock(cfg)
	if err != nil {
		return nil, err
	}
	return &Worker{
		cfg:    cfg,
		clock:  clock,
		q:      q,
		schedEval: schoolschedule.NewEvaluator(q, cfg.toEnvDefaults()),
		logger: logger,
	}, nil
}

// Run starts gocron polling until ctx is cancelled.
func (w *Worker) Run(ctx context.Context) error {
	w.apply(ctx)

	sched := gocron.NewScheduler(w.clock.loc)
	_, err := sched.Every(w.cfg.PollInterval).Do(func() {
		w.apply(ctx)
	})
	if err != nil {
		return err
	}
	sched.StartAsync()

	<-ctx.Done()
	sched.Stop()
	w.writeHeartbeat(context.Background(), "STOPPING", Window{})
	return nil
}

func (w *Worker) apply(ctx context.Context) {
	now := time.Now().UTC()
	globalWindow := w.clock.Evaluate(now)

	cameras, err := w.q.ListCamerasForScheduler(ctx)
	if err != nil {
		w.logger.Error("list cameras for scheduler", "error", err)
		w.writeHeartbeat(ctx, "ERROR", globalWindow)
		return
	}

	// Cache per-school eval results to avoid repeated DB lookups.
	type schoolResult struct {
		desired string
		reason  string
	}
	schoolCache := make(map[uuid.UUID]schoolResult, 8)

	schoolResultFor := func(schoolID uuid.UUID) schoolResult {
		if r, ok := schoolCache[schoolID]; ok {
			return r
		}
		settings, err := w.schedEval.ForSchool(ctx, schoolID)
		if err != nil {
			w.logger.Error("load school schedule", "school_id", schoolID, "error", err)
			// Fall back to global window on error.
			schoolCache[schoolID] = schoolResult{globalWindow.DesiredState, globalWindow.Reason}
			return schoolCache[schoolID]
		}
		eval := settings.Evaluate(now)
		var desired, reason string
		if eval.IsOpenNow {
			desired = DesiredRunning
			reason = ReasonWithinSchedule
		} else {
			desired = DesiredStopped
			reason = eval.ReasonCode
		}
		schoolCache[schoolID] = schoolResult{desired, reason}
		return schoolCache[schoolID]
	}

	var started, stopped int
	for _, cam := range cameras {
		prev, hadPrev, err := w.loadPrevious(ctx, cam.ID)
		if err != nil {
			w.logger.Error("load stream state", "camera_id", cam.ID, "error", err)
			continue
		}

		sr := schoolResultFor(cam.SchoolID)
		desired := sr.desired
		reason := sr.reason

		if _, err := w.q.UpsertCameraStreamState(ctx, sqlc.UpsertCameraStreamStateParams{
			CameraID:     cam.ID,
			DesiredState: desired,
			Reason:       database.TextFromString(reason),
		}); err != nil {
			w.logger.Error("upsert stream state", "camera_id", cam.ID, "error", err)
			continue
		}

		if hadPrev && prev.DesiredState == desired {
			continue
		}
		w.logger.Info("stream state transition",
			"school_id", cam.SchoolID,
			"camera_id", cam.ID,
			"desired_state", desired,
			"reason_code", reason,
		)
		if desired == DesiredRunning {
			started++
			w.recordScheduleEvent(ctx, cam.ID, cam.SchoolID, EventScheduleStarted, "Recording schedule started for camera")
		} else {
			stopped++
			w.recordScheduleEvent(ctx, cam.ID, cam.SchoolID, EventScheduleStopped, "Recording schedule stopped for camera")
		}
	}

	running, _ := w.q.CountCameraStreamStatesByDesiredState(ctx, DesiredRunning)
	stoppedCount, _ := w.q.CountCameraStreamStatesByDesiredState(ctx, DesiredStopped)
	w.logger.Info("schedule applied",
		"cameras", len(cameras),
		"schools_evaluated", len(schoolCache),
		"transitions_started", started,
		"transitions_stopped", stopped,
		"running_desired", running,
		"stopped_desired", stoppedCount,
	)
	w.writeHeartbeat(ctx, "RUNNING", globalWindow)
}

func (w *Worker) loadPrevious(ctx context.Context, cameraID uuid.UUID) (sqlc.CameraStreamState, bool, error) {
	row, err := w.q.GetCameraStreamState(ctx, cameraID)
	if errors.Is(err, pgx.ErrNoRows) {
		return sqlc.CameraStreamState{}, false, nil
	}
	if err != nil {
		return sqlc.CameraStreamState{}, false, err
	}
	return row, true, nil
}

func (w *Worker) recordScheduleEvent(ctx context.Context, cameraID, schoolID uuid.UUID, eventType, message string) {
	_, err := w.q.InsertCameraHealthEvent(ctx, sqlc.InsertCameraHealthEventParams{
		ID:        uuid.New(),
		CameraID:  cameraID,
		SchoolID:  schoolID,
		EventType: eventType,
		Severity:  "INFO",
		Message:   database.TextFromString(message),
		Metadata:  []byte(`{}`),
	})
	if err != nil {
		w.logger.Error("insert schedule health event", "camera_id", cameraID, "event_type", eventType, "error", err)
	}
}

func (w *Worker) writeHeartbeat(ctx context.Context, status string, window Window) {
	running, _ := w.q.CountCameraStreamStatesByDesiredState(ctx, DesiredRunning)
	stopped, _ := w.q.CountCameraStreamStatesByDesiredState(ctx, DesiredStopped)
	meta := map[string]any{
		"timezone":                w.clock.Timezone(),
		"recording_start_time":    w.clock.StartTime(),
		"recording_end_time":      w.clock.EndTime(),
		"recording_days":          w.clock.RecordingDaysList(),
		"current_state":           window.CurrentState,
		"reason":                  window.Reason,
		"cameras_running_desired": running,
		"cameras_stopped_desired": stopped,
	}
	if window.NextStartAt != nil {
		meta["next_start_at"] = window.NextStartAt.UTC().Format(time.RFC3339)
	}
	if window.NextStopAt != nil {
		meta["next_stop_at"] = window.NextStopAt.UTC().Format(time.RFC3339)
	}
	raw, _ := json.Marshal(meta)
	_, err := w.q.InsertWorkerHeartbeat(ctx, sqlc.InsertWorkerHeartbeatParams{
		ID:         uuid.New(),
		WorkerName: w.cfg.WorkerName,
		WorkerType: WorkerTypeScheduler,
		Status:     status,
		Metadata:   raw,
	})
	if err != nil {
		w.logger.Error("insert scheduler heartbeat", "error", err)
	}
}

// Snapshot returns the current schedule window for admin APIs.
func (w *Worker) Snapshot(ctx context.Context) (Window, int64, int64, error) {
	window := w.clock.Evaluate(time.Now().UTC())
	running, err := w.q.CountCameraStreamStatesByDesiredState(ctx, DesiredRunning)
	if err != nil {
		return window, 0, 0, err
	}
	stopped, err := w.q.CountCameraStreamStatesByDesiredState(ctx, DesiredStopped)
	if err != nil {
		return window, 0, 0, err
	}
	return window, running, stopped, nil
}

// ClockRef exposes the schedule clock for handlers.
func (w *Worker) ClockRef() *Clock {
	return w.clock
}
