package health

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	appconfig "github.com/school-camera-platform/school-camera-platform/internal/config"
	"github.com/school-camera-platform/school-camera-platform/internal/database"
	"github.com/school-camera-platform/school-camera-platform/internal/database/sqlc"
	"github.com/school-camera-platform/school-camera-platform/internal/hls"
	"github.com/school-camera-platform/school-camera-platform/internal/playback"
	"github.com/school-camera-platform/school-camera-platform/internal/storage"
)

// Monitor runs periodic health checks and manages alerts.
type Monitor struct {
	cfg      WorkerConfig
	app      *appconfig.Config
	q        *sqlc.Queries
	storage  *storage.Client
	alerts   *AlertStore
	schedule *playback.Schedule
	logger   *slog.Logger
}

// NewMonitor constructs a health monitor.
func NewMonitor(
	app *appconfig.Config,
	worker WorkerConfig,
	q *sqlc.Queries,
	s3 *storage.Client,
	logger *slog.Logger,
) (*Monitor, error) {
	sched, err := playback.NewSchedule(app)
	if err != nil {
		return nil, err
	}
	return &Monitor{
		cfg:      worker,
		app:      app,
		q:        q,
		storage:  s3,
		alerts:   NewAlertStore(q),
		schedule: sched,
		logger:   logger,
	}, nil
}

// Run executes the health check loop until ctx is cancelled.
func (m *Monitor) Run(ctx context.Context) error {
	ticker := time.NewTicker(m.cfg.CheckInterval)
	defer ticker.Stop()

	m.tick(ctx)
	for {
		select {
		case <-ctx.Done():
			m.writeHeartbeat(context.Background(), "STOPPING")
			return nil
		case <-ticker.C:
			m.tick(ctx)
		}
	}
}

func (m *Monitor) tick(ctx context.Context) {
	m.writeHeartbeat(ctx, "RUNNING")
	m.checkStreamWorker(ctx)

	cameras, err := m.q.ListActiveCamerasForHealth(ctx)
	if err != nil {
		m.logger.Error("list cameras for health", "error", err)
		return
	}

	now := time.Now().UTC()
	inRecording := m.schedule.IsWithinRecordingWindow(now)

	schoolCams := map[uuid.UUID][]sqlc.ListActiveCamerasForHealthRow{}
	for _, cam := range cameras {
		schoolCams[cam.SchoolID] = append(schoolCams[cam.SchoolID], cam)
		m.checkCamera(ctx, cam, now, inRecording)
	}

	for schoolID, cams := range schoolCams {
		m.checkSchool(ctx, schoolID, cams, now, inRecording)
	}
}

func (m *Monitor) writeHeartbeat(ctx context.Context, status string) {
	meta, _ := json.Marshal(map[string]any{
		"check_interval_seconds": int(m.cfg.CheckInterval.Seconds()),
	})
	_, err := m.q.InsertWorkerHeartbeat(ctx, sqlc.InsertWorkerHeartbeatParams{
		ID:         uuid.New(),
		WorkerName: m.cfg.WorkerName,
		WorkerType: WorkerTypeHealth,
		Status:     status,
		Metadata:   meta,
	})
	if err != nil {
		m.logger.Error("insert health worker heartbeat", "error", err)
	}
}

func (m *Monitor) checkStreamWorker(ctx context.Context) {
	hb, err := m.q.GetLatestWorkerHeartbeatByType(ctx, WorkerTypeStream)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			_, _, _ = m.alerts.OpenOrTouchGlobalAlert(ctx, AlertStreamWorkerStale, SeverityCritical,
				"Stream worker heartbeat missing",
				"No stream-worker heartbeat has been recorded",
				map[string]any{"worker_type": WorkerTypeStream})
			return
		}
		m.logger.Error("get stream worker heartbeat", "error", err)
		return
	}

	stale := time.Since(hb.LastSeenAt.Time) > m.cfg.StreamWorkerStaleAfter
	if stale {
		_, _, _ = m.alerts.OpenOrTouchGlobalAlert(ctx, AlertStreamWorkerStale, SeverityCritical,
			"Stream worker heartbeat stale",
			"Stream worker has not reported recently",
			map[string]any{
				"worker_name":     hb.WorkerName,
				"last_seen_at":    hb.LastSeenAt.Time.UTC().Format(time.RFC3339),
				"stale_threshold": m.cfg.StreamWorkerStaleAfter.String(),
			})
		return
	}
	_ = m.alerts.ResolveGlobalAlert(ctx, AlertStreamWorkerStale)
}

func (m *Monitor) checkCamera(ctx context.Context, cam sqlc.ListActiveCamerasForHealthRow, now time.Time, inRecording bool) {
	m.checkCameraOffline(ctx, cam, now)
	m.checkPlaylist(ctx, cam)
	m.checkEventSpikes(ctx, cam)

	if !inRecording {
		return
	}

	m.checkSegmentFreshness(ctx, cam, now)
}

func (m *Monitor) checkCameraOffline(ctx context.Context, cam sqlc.ListActiveCamerasForHealthRow, now time.Time) {
	if cam.Status != "OFFLINE" {
		_ = m.alerts.ResolveCameraAlert(ctx, cam.ID, AlertCameraOffline)
		return
	}
	offlineSince := cam.UpdatedAt.Time
	if !offlineSince.IsZero() && now.Sub(offlineSince) >= m.cfg.CameraOfflineAlert {
		_, created, _ := m.alerts.OpenOrTouchCameraAlert(ctx, cam.ID, cam.SchoolID,
			AlertCameraOffline, SeverityCritical,
			"Camera offline",
			"Camera has been offline longer than the configured threshold",
			map[string]any{
				"camera_status": cam.Status,
				"offline_since": offlineSince.UTC().Format(time.RFC3339),
			})
		if created {
			m.logger.Warn("camera offline alert opened", "camera_id", cam.ID)
		}
	}
}

func (m *Monitor) checkSegmentFreshness(ctx context.Context, cam sqlc.ListActiveCamerasForHealthRow, now time.Time) {
	lastAt := m.latestSegmentTime(ctx, cam)
	if lastAt.IsZero() || now.Sub(lastAt) > m.cfg.NoSegmentAlert {
		_, created, err := m.alerts.OpenOrTouchCameraAlert(ctx, cam.ID, cam.SchoolID,
			AlertNoSegmentUploaded, SeverityCritical,
			"No segment uploaded",
			"No recording segment uploaded during school recording hours",
			map[string]any{
				"last_segment_at": lastAt.UTC().Format(time.RFC3339),
				"threshold":         m.cfg.NoSegmentAlert.String(),
			})
		if err != nil {
			m.logger.Error("no segment alert", "camera_id", cam.ID, "error", err)
			return
		}
		if created {
			m.recordHealthEvent(ctx, cam.ID, cam.SchoolID, EventNoSegmentUploaded, SeverityCritical,
				"No segment uploaded during recording hours", nil)
		}
		return
	}

	resolved, err := m.alerts.ResolveCameraAlertIfOpen(ctx, cam.ID, AlertNoSegmentUploaded)
	if err != nil {
		m.logger.Error("resolve no segment alert", "camera_id", cam.ID, "error", err)
		return
	}
	if resolved {
		m.recordHealthEvent(ctx, cam.ID, cam.SchoolID, EventSegmentResumed, SeverityInfo,
			"Segment uploads resumed", map[string]any{"last_segment_at": lastAt.UTC().Format(time.RFC3339)})
	}
}

func (m *Monitor) latestSegmentTime(ctx context.Context, cam sqlc.ListActiveCamerasForHealthRow) time.Time {
	var latest time.Time
	if cam.LastSegmentAt.Valid {
		latest = cam.LastSegmentAt.Time
	}
	segStart, err := m.q.GetLatestRecordingSegmentStartForCamera(ctx, cam.ID)
	if err == nil && segStart.Valid && segStart.Time.After(latest) {
		latest = segStart.Time
	}
	return latest
}

func (m *Monitor) checkPlaylist(ctx context.Context, cam sqlc.ListActiveCamerasForHealthRow) {
	if cam.Status != "ACTIVE" {
		_ = m.alerts.ResolveCameraAlert(ctx, cam.ID, AlertPlaylistStaleOrMissing)
		return
	}
	key := hls.LivePlaylistKey(cam.R2LivePath, cam.DefaultQuality)
	exists, err := m.storage.ObjectExists(ctx, key)
	if err != nil {
		m.logger.Error("check live playlist", "camera_id", cam.ID, "error", err)
		return
	}
	// TODO(phase-11): compare HeadObject LastModified against PLAYLIST_STALE_ALERT_SECONDS.
	if !exists {
		_, _, _ = m.alerts.OpenOrTouchCameraAlert(ctx, cam.ID, cam.SchoolID,
			AlertPlaylistStaleOrMissing, SeverityCritical,
			"Live playlist missing",
			"Live HLS playlist is missing from object storage",
			map[string]any{"playlist_key": key, "quality": cam.DefaultQuality})
		return
	}
	_ = m.alerts.ResolveCameraAlert(ctx, cam.ID, AlertPlaylistStaleOrMissing)
}

func (m *Monitor) checkEventSpikes(ctx context.Context, cam sqlc.ListActiveCamerasForHealthRow) {
	lookbackMin := int(m.cfg.HealthEventLookback.Minutes())

	uploadCount, err := m.q.CountRecentCameraHealthEvents(ctx, sqlc.CountRecentCameraHealthEventsParams{
		CameraID:  cam.ID,
		EventType: EventUploadFailed,
		Column3:   int32(lookbackMin),
	})
	if err != nil {
		m.logger.Error("count upload failures", "camera_id", cam.ID, "error", err)
	} else if uploadCount >= m.cfg.UploadFailureAlertCount {
		_, _, _ = m.alerts.OpenOrTouchCameraAlert(ctx, cam.ID, cam.SchoolID,
			AlertUploadFailureSpike, SeverityCritical,
			"Upload failure spike",
			"Repeated segment upload failures detected",
			map[string]any{"count": uploadCount, "lookback_minutes": lookbackMin})
	} else {
		_ = m.alerts.ResolveCameraAlert(ctx, cam.ID, AlertUploadFailureSpike)
	}

	ffmpegCount, err := m.q.CountRecentCameraHealthEvents(ctx, sqlc.CountRecentCameraHealthEventsParams{
		CameraID:  cam.ID,
		EventType: EventFFmpegRestarted,
		Column3:   int32(lookbackMin),
	})
	if err != nil {
		m.logger.Error("count ffmpeg restarts", "camera_id", cam.ID, "error", err)
	} else if ffmpegCount >= m.cfg.FFmpegRestartAlertCount {
		sev := SeverityWarning
		if ffmpegCount >= m.cfg.FFmpegRestartAlertCount*2 {
			sev = SeverityCritical
		}
		_, _, _ = m.alerts.OpenOrTouchCameraAlert(ctx, cam.ID, cam.SchoolID,
			AlertFFmpegRestartSpike, sev,
			"FFmpeg restart spike",
			"Repeated FFmpeg restarts detected",
			map[string]any{"count": ffmpegCount, "lookback_minutes": lookbackMin})
	} else {
		_ = m.alerts.ResolveCameraAlert(ctx, cam.ID, AlertFFmpegRestartSpike)
	}
}

func (m *Monitor) checkSchool(
	ctx context.Context,
	schoolID uuid.UUID,
	cams []sqlc.ListActiveCamerasForHealthRow,
	now time.Time,
	inRecording bool,
) {
	if !inRecording {
		return
	}

	activeCams := 0
	allOffline := true
	allStale := true
	for _, cam := range cams {
		if cam.Status != "ACTIVE" && cam.Status != "OFFLINE" {
			continue
		}
		activeCams++
		if cam.Status != "OFFLINE" {
			allOffline = false
		}
		lastAt := m.latestSegmentTime(ctx, cam)
		if !lastAt.IsZero() && now.Sub(lastAt) <= m.cfg.SchoolOfflineAlert {
			allStale = false
		}
	}
	if activeCams == 0 {
		return
	}

	if allOffline || allStale {
		_, created, _ := m.alerts.OpenOrTouchSchoolAlert(ctx, schoolID,
			AlertSchoolOffline, SeverityCritical,
			"School cameras offline",
			"All active school cameras are offline or have no recent segments",
			map[string]any{
				"camera_count": activeCams,
				"all_offline":  allOffline,
				"all_stale":    allStale,
			})
		if created {
			m.logger.Warn("school offline alert opened", "school_id", schoolID)
		}
		return
	}

	_ = m.alerts.ResolveSchoolAlert(ctx, schoolID, AlertSchoolOffline)
}

func (m *Monitor) recordHealthEvent(
	ctx context.Context,
	cameraID, schoolID uuid.UUID,
	eventType, severity, message string,
	meta map[string]any,
) {
	raw, _ := json.Marshal(meta)
	_, err := m.q.InsertCameraHealthEvent(ctx, sqlc.InsertCameraHealthEventParams{
		ID:        uuid.New(),
		CameraID:  cameraID,
		SchoolID:  schoolID,
		EventType: eventType,
		Severity:  severity,
		Message:   database.TextFromString(message),
		Metadata:  raw,
	})
	if err != nil {
		m.logger.Error("insert camera health event", "camera_id", cameraID, "event_type", eventType, "error", err)
	}
}
