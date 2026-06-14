package admin

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/school-camera-platform/school-camera-platform/internal/database/sqlc"
	"github.com/school-camera-platform/school-camera-platform/internal/health"
	"github.com/school-camera-platform/school-camera-platform/internal/hls"
	"github.com/school-camera-platform/school-camera-platform/apps/api/response"
)

type healthSummaryDTO struct {
	SchoolsTotal           int64   `json:"schools_total"`
	CamerasTotal           int64   `json:"cameras_total"`
	CamerasActive          int64   `json:"cameras_active"`
	CamerasOffline         int64   `json:"cameras_offline"`
	OpenAlerts             int64   `json:"open_alerts"`
	CriticalAlerts         int64   `json:"critical_alerts"`
	StreamWorkerStatus     string  `json:"stream_worker_status"`
	LastStreamWorkerSeenAt *string `json:"last_stream_worker_seen_at,omitempty"`
}

type cameraHealthDTO struct {
	CameraID         string              `json:"camera_id"`
	CameraName       string              `json:"camera_name"`
	Status           string              `json:"status"`
	LastSegmentAt    *string             `json:"last_segment_at,omitempty"`
	PlaylistKey      string              `json:"playlist_key"`
	PlaylistExists   bool                `json:"playlist_exists"`
	RecentEvents     []healthEventDTO    `json:"recent_events"`
	OpenAlerts       []alertDTO          `json:"open_alerts"`
}

type healthEventDTO struct {
	EventType string `json:"event_type"`
	Severity  string `json:"severity"`
	Message   string `json:"message,omitempty"`
	CreatedAt string `json:"created_at"`
}

// HealthSummary GET /admin/health/summary
func (h *Handler) HealthSummary(c *gin.Context) {
	user, ok := h.user(c)
	if !ok {
		return
	}

	ctx := c.Request.Context()
	schoolIDs, err := h.access.SchoolIDsForUser(ctx, user.Role, user.UserID)
	if err != nil {
		response.Internal(c, "failed to resolve school scope")
		return
	}

	var schoolsTotal int64 = 1
	if user.Role == "SUPER_ADMIN" || user.Role == "TECHNICIAN" {
		schoolsTotal, err = h.q.CountActiveSchools(ctx)
		if err != nil {
			response.Internal(c, "failed to count schools")
			return
		}
	} else {
		schoolsTotal = int64(len(schoolIDs))
	}

	activeCams, _ := h.q.CountCamerasByStatus(ctx, "ACTIVE")
	offlineCams, _ := h.q.CountCamerasByStatus(ctx, "OFFLINE")

	openParams := sqlc.CountAlertsByStatusParams{Status: health.StatusOpen}
	critParams := sqlc.CountAlertsByStatusAndSeverityParams{
		Status:   health.StatusOpen,
		Severity: health.SeverityCritical,
	}
	if len(schoolIDs) > 0 {
		openParams.SchoolIds = schoolIDs
		critParams.SchoolIds = schoolIDs
	}
	openAlerts, _ := h.q.CountAlertsByStatus(ctx, openParams)
	criticalAlerts, _ := h.q.CountAlertsByStatusAndSeverity(ctx, critParams)

	summary := healthSummaryDTO{
		SchoolsTotal:   schoolsTotal,
		CamerasTotal:   activeCams + offlineCams,
		CamerasActive:  activeCams,
		CamerasOffline: offlineCams,
		OpenAlerts:     openAlerts,
		CriticalAlerts: criticalAlerts,
		StreamWorkerStatus: "UNKNOWN",
	}

	hb, err := h.q.GetLatestWorkerHeartbeatByType(ctx, health.WorkerTypeStream)
	if err == nil {
		summary.StreamWorkerStatus = hb.Status
		s := hb.LastSeenAt.Time.UTC().Format(timeRFC3339)
		summary.LastStreamWorkerSeenAt = &s
	} else if !errors.Is(err, pgx.ErrNoRows) {
		response.Internal(c, "failed to load stream worker heartbeat")
		return
	}

	response.OK(c, http.StatusOK, summary)
}

// CameraHealth GET /admin/cameras/:camera_id/health
func (h *Handler) CameraHealth(c *gin.Context) {
	cameraID, ok := h.parseUUID(c, "camera_id")
	if !ok {
		return
	}
	cam, err := h.q.GetCamera(c.Request.Context(), cameraID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			response.NotFound(c, "camera not found")
			return
		}
		response.Internal(c, "failed to load camera")
		return
	}
	if !h.requireSchoolCameraView(c, cam.SchoolID) {
		return
	}

	playlistKey := hls.LivePlaylistKey(cam.R2LivePath, cam.DefaultQuality)
	playlistExists := false
	if h.storage != nil {
		playlistExists, _ = h.storage.ObjectExists(c.Request.Context(), playlistKey)
	}

	events, err := h.q.GetRecentCameraHealthEvents(c.Request.Context(), sqlc.GetRecentCameraHealthEventsParams{
		CameraID: cameraID,
		Limit:    20,
	})
	if err != nil {
		response.Internal(c, "failed to load health events")
		return
	}
	eventDTOs := make([]healthEventDTO, 0, len(events))
	for _, ev := range events {
		dto := healthEventDTO{
			EventType: ev.EventType,
			Severity:  ev.Severity,
			CreatedAt: ev.CreatedAt.Time.UTC().Format(timeRFC3339),
		}
		if ev.Message.Valid {
			dto.Message = ev.Message.String
		}
		eventDTOs = append(eventDTOs, dto)
	}

	alerts, err := h.q.ListOpenAlertsForCamera(c.Request.Context(), pgtype.UUID{Bytes: cameraID, Valid: true})
	if err != nil {
		response.Internal(c, "failed to load open alerts")
		return
	}
	alertDTOs := make([]alertDTO, 0, len(alerts))
	for _, a := range alerts {
		alertDTOs = append(alertDTOs, alertFromRow(a))
	}

	dto := cameraHealthDTO{
		CameraID:       cam.ID.String(),
		CameraName:     cam.Name,
		Status:         cam.Status,
		PlaylistKey:    playlistKey,
		PlaylistExists: playlistExists,
		RecentEvents:   eventDTOs,
		OpenAlerts:     alertDTOs,
	}
	if cam.LastSegmentAt.Valid {
		s := cam.LastSegmentAt.Time.UTC().Format(timeRFC3339)
		dto.LastSegmentAt = &s
	}

	response.OK(c, http.StatusOK, dto)
}
