package admin

import (
	"errors"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"

	"github.com/school-camera-platform/school-camera-platform/internal/scheduler"
	"github.com/school-camera-platform/school-camera-platform/apps/api/response"
)

type schedulerStatusDTO struct {
	Timezone             string   `json:"timezone"`
	CurrentState         string   `json:"current_state"`
	Reason               string   `json:"reason"`
	RecordingStartTime   string   `json:"recording_start_time"`
	RecordingEndTime     string   `json:"recording_end_time"`
	RecordingDays        []string `json:"recording_days"`
	NextStartAt          *string  `json:"next_start_at,omitempty"`
	NextStopAt           *string  `json:"next_stop_at,omitempty"`
	CamerasRunningDesired int64   `json:"cameras_running_desired"`
	CamerasStoppedDesired int64   `json:"cameras_stopped_desired"`
}

type cameraStreamStateDTO struct {
	CameraID     string `json:"camera_id"`
	DesiredState string `json:"desired_state"`
	Reason       string `json:"reason"`
	UpdatedAt    string `json:"updated_at"`
}

func (h *Handler) schedulerClock(c *gin.Context) (*scheduler.Clock, bool) {
	workerCfg := scheduler.LoadWorkerConfig(h.cfg)
	clock, err := scheduler.NewClock(workerCfg)
	if err != nil {
		response.Internal(c, "invalid scheduler configuration")
		return nil, false
	}
	return clock, true
}

// SchedulerStatus GET /admin/scheduler/status
func (h *Handler) SchedulerStatus(c *gin.Context) {
	clock, ok := h.schedulerClock(c)
	if !ok {
		return
	}
	window := clock.Evaluate(time.Now().UTC())
	running, err := h.q.CountCameraStreamStatesByDesiredState(c.Request.Context(), scheduler.DesiredRunning)
	if err != nil {
		response.Internal(c, "failed to count running cameras")
		return
	}
	stopped, err := h.q.CountCameraStreamStatesByDesiredState(c.Request.Context(), scheduler.DesiredStopped)
	if err != nil {
		response.Internal(c, "failed to count stopped cameras")
		return
	}

	dto := schedulerStatusDTO{
		Timezone:              clock.Timezone(),
		CurrentState:          window.CurrentState,
		Reason:                window.Reason,
		RecordingStartTime:    clock.StartTime(),
		RecordingEndTime:      clock.EndTime(),
		RecordingDays:         clock.RecordingDaysList(),
		CamerasRunningDesired: running,
		CamerasStoppedDesired: stopped,
	}
	if window.NextStartAt != nil {
		s := window.NextStartAt.UTC().Format(timeRFC3339)
		dto.NextStartAt = &s
	}
	if window.NextStopAt != nil {
		s := window.NextStopAt.UTC().Format(timeRFC3339)
		dto.NextStopAt = &s
	}
	response.OK(c, http.StatusOK, dto)
}

// CameraStreamState GET /admin/cameras/:camera_id/stream-state
func (h *Handler) CameraStreamState(c *gin.Context) {
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

	state, err := h.q.GetCameraStreamState(c.Request.Context(), cameraID)
	if errors.Is(err, pgx.ErrNoRows) {
		clock, ok := h.schedulerClock(c)
		if !ok {
			return
		}
		window := clock.Evaluate(time.Now().UTC())
		response.OK(c, http.StatusOK, cameraStreamStateDTO{
			CameraID:     cameraID.String(),
			DesiredState: scheduler.DesiredStopped,
			Reason:       window.Reason,
			UpdatedAt:    time.Now().UTC().Format(timeRFC3339),
		})
		return
	}
	if err != nil {
		response.Internal(c, "failed to load stream state")
		return
	}
	reason := ""
	if state.Reason.Valid {
		reason = state.Reason.String
	}
	response.OK(c, http.StatusOK, cameraStreamStateDTO{
		CameraID:     cameraID.String(),
		DesiredState: state.DesiredState,
		Reason:       reason,
		UpdatedAt:    state.UpdatedAt.Time.UTC().Format(timeRFC3339),
	})
}
