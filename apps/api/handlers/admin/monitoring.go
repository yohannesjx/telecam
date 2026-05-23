package admin

import (
	"errors"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/school-camera-platform/school-camera-platform/internal/database"
	"github.com/school-camera-platform/school-camera-platform/internal/database/sqlc"
	"github.com/school-camera-platform/school-camera-platform/internal/monitoring"
	"github.com/school-camera-platform/school-camera-platform/apps/api/response"
)

type schoolCamerasStatusDTO struct {
	SchoolID   string              `json:"school_id"`
	SchoolName string              `json:"school_name"`
	Cameras    []cameraStatusRowDTO `json:"cameras"`
}

type cameraStatusRowDTO struct {
	CameraID                 string  `json:"camera_id"`
	CameraName               string  `json:"camera_name"`
	ClassroomName            string  `json:"classroom_name,omitempty"`
	Status                   string  `json:"status"`
	DesiredState             string  `json:"desired_state"`
	DefaultQuality           string  `json:"default_quality"`
	LastSegmentAt            *string  `json:"last_segment_at,omitempty"`
	SecondsSinceLastSegment  *int64   `json:"seconds_since_last_segment,omitempty"`
	LastSegmentAgeMinutes    *float64 `json:"last_segment_age_minutes,omitempty"`
	StreamLagSeconds         *int64   `json:"stream_lag_seconds,omitempty"`
	OpenAlerts               int64    `json:"open_alerts"`
	LastHealthEvent          string  `json:"last_health_event,omitempty"`
}

type workerHeartbeatDTO struct {
	WorkerName            string         `json:"worker_name"`
	WorkerType            string         `json:"worker_type"`
	Status                string         `json:"status"`
	LastSeenAt            string         `json:"last_seen_at"`
	SecondsSinceLastSeen  int64          `json:"seconds_since_last_seen"`
	Metadata              map[string]any `json:"metadata"`
}

type playbackStatsDTO struct {
	TotalRequests     int64                  `json:"total_requests"`
	LiveRequests      int64                  `json:"live_requests"`
	RecordingRequests int64                  `json:"recording_requests"`
	TimelineRequests  int64                  `json:"timeline_requests"`
	DeniedRequests    int64                  `json:"denied_requests"`
	UniqueParents     int64                  `json:"unique_parents"`
	ByDay             []playbackDayStatDTO   `json:"by_day,omitempty"`
	ByCamera          []playbackGroupStatDTO `json:"by_camera,omitempty"`
	BySchool          []playbackGroupStatDTO `json:"by_school,omitempty"`
}

type playbackDayStatDTO struct {
	Date           string `json:"date"`
	Total          int64  `json:"total"`
	Denied         int64  `json:"denied"`
	UniqueParents  int64  `json:"unique_parents"`
}

type playbackGroupStatDTO struct {
	ID     string `json:"id,omitempty"`
	Name   string `json:"name,omitempty"`
	Total  int64  `json:"total"`
	Denied int64  `json:"denied"`
}

// SchoolCamerasStatus GET /admin/schools/:school_id/cameras/status
func (h *Handler) SchoolCamerasStatus(c *gin.Context) {
	schoolID, ok := h.parseUUID(c, "school_id")
	if !ok {
		return
	}
	if !h.requireSchoolCameraView(c, schoolID) {
		return
	}

	school, err := h.q.GetSchool(c.Request.Context(), schoolID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			response.NotFound(c, "school not found")
			return
		}
		response.Internal(c, "failed to load school")
		return
	}

	rows, err := h.q.ListCameraStatusBySchool(c.Request.Context(), schoolID)
	if err != nil {
		response.Internal(c, "failed to list camera status")
		return
	}

	now := time.Now().UTC()
	cameras := make([]cameraStatusRowDTO, 0, len(rows))
	for _, r := range rows {
		dto := cameraStatusRowDTO{
			CameraID:        r.CameraID.String(),
			CameraName:      r.CameraName,
			Status:          r.Status,
			DesiredState:    r.DesiredState,
			DefaultQuality:  r.DefaultQuality,
			OpenAlerts:      r.OpenAlerts,
		}
		if r.ClassroomName.Valid {
			dto.ClassroomName = r.ClassroomName.String
		}
		if r.LastHealthEvent != "" {
			dto.LastHealthEvent = r.LastHealthEvent
		}
		if r.LastSegmentAt.Valid {
			s := r.LastSegmentAt.Time.UTC().Format(timeRFC3339)
			dto.LastSegmentAt = &s
			sec := int64(now.Sub(r.LastSegmentAt.Time.UTC()).Seconds())
			if sec < 0 {
				sec = 0
			}
			dto.SecondsSinceLastSegment = &sec
			dto.LastSegmentAgeMinutes = monitoring.SegmentAgeMinutes(sec)
			dto.StreamLagSeconds = monitoring.SegmentLagSeconds(sec, h.cfg.LiveDelaySeconds)
		}
		cameras = append(cameras, dto)
	}

	response.OK(c, http.StatusOK, schoolCamerasStatusDTO{
		SchoolID:   schoolID.String(),
		SchoolName: school.Name,
		Cameras:    cameras,
	})
}

// ListWorkers GET /admin/workers
func (h *Handler) ListWorkers(c *gin.Context) {
	rows, err := h.q.ListLatestWorkerHeartbeats(c.Request.Context())
	if err != nil {
		response.Internal(c, "failed to list workers")
		return
	}

	now := time.Now().UTC()
	out := make([]workerHeartbeatDTO, 0, len(rows))
	for _, hb := range rows {
		sec := int64(0)
		if hb.LastSeenAt.Valid {
			sec = int64(now.Sub(hb.LastSeenAt.Time.UTC()).Seconds())
			if sec < 0 {
				sec = 0
			}
		}
		meta := monitoring.SanitizeWorkerMetadata(hb.Metadata)
		if meta == nil {
			meta = map[string]any{}
		}
		out = append(out, workerHeartbeatDTO{
			WorkerName:           hb.WorkerName,
			WorkerType:           hb.WorkerType,
			Status:               monitoring.WorkerDisplayStatus(hb, h.cfg.WorkerStaleThresholdSeconds),
			LastSeenAt:           tsFormat(hb.LastSeenAt),
			SecondsSinceLastSeen: sec,
			Metadata:             meta,
		})
	}
	response.OK(c, http.StatusOK, out)
}

// PlaybackStats GET /admin/playback-stats
func (h *Handler) PlaybackStats(c *gin.Context) {
	schoolIDs, ok := h.monitoringSchoolIDs(c)
	if !ok {
		return
	}

	loc := h.schoolLocation()
	dateFrom, dateTo, ok := h.parseDateRange(c)
	if !ok {
		return
	}
	if !dateFrom.Valid && !dateTo.Valid {
		start, end := monitoring.TodayBoundsUTC(loc)
		dateFrom = database.TimestamptzFromTime(start)
		dateTo = database.TimestamptzFromTime(end)
	} else if dateFrom.Valid && !dateTo.Valid {
		dateTo = database.TimestamptzFromTime(time.Now().UTC())
	} else if !dateFrom.Valid && dateTo.Valid {
		response.BadRequest(c, "date_from is required when date_to is set")
		return
	}

	var filterSchool pgtype.UUID
	if schoolIDStr := c.Query("school_id"); schoolIDStr != "" {
		sid, err := uuid.Parse(schoolIDStr)
		if err != nil {
			response.BadRequest(c, "invalid school_id")
			return
		}
		if len(schoolIDs) > 0 {
			allowed := false
			for _, id := range schoolIDs {
				if id == sid {
					allowed = true
					break
				}
			}
			if !allowed {
				response.Forbidden(c, "not allowed for this school")
				return
			}
		}
		filterSchool = database.UUIDToPgtype(sid)
	}

	var filterCamera pgtype.UUID
	if cameraIDStr := c.Query("camera_id"); cameraIDStr != "" {
		cid, err := uuid.Parse(cameraIDStr)
		if err != nil {
			response.BadRequest(c, "invalid camera_id")
			return
		}
		camSchool, err := h.access.CameraSchoolID(c.Request.Context(), cid)
		if err != nil {
			response.NotFound(c, "camera not found")
			return
		}
		if !h.requireSchoolCameraView(c, camSchool) {
			return
		}
		filterCamera = database.UUIDToPgtype(cid)
	}

	ctx := c.Request.Context()
	base := sqlc.CountPlaybackStatsScopedParams{
		CreatedAt:   dateFrom,
		CreatedAt_2: dateTo,
		SchoolIds:   schoolIDs,
		SchoolID:    filterSchool,
		CameraID:    filterCamera,
	}
	totals, err := h.q.CountPlaybackStatsScoped(ctx, base)
	if err != nil {
		response.Internal(c, "failed to load playback stats")
		return
	}

	uniqueParents, _ := h.q.CountUniqueParentsPlaybackScoped(ctx, sqlc.CountUniqueParentsPlaybackScopedParams{
		CreatedAt: dateFrom, CreatedAt_2: dateTo,
		SchoolIds: schoolIDs, SchoolID: filterSchool, CameraID: filterCamera,
	})

	stats := playbackStatsDTO{
		TotalRequests:     totals.TotalRequests,
		LiveRequests:      totals.LiveRequests,
		RecordingRequests: totals.RecordingRequests,
		TimelineRequests:  totals.TimelineRequests,
		DeniedRequests:    totals.DeniedRequests,
		UniqueParents:     uniqueParents,
	}

	groupBy := c.DefaultQuery("group_by", "day")
	limit, _ := h.parsePagination(c)

	switch groupBy {
	case "camera":
		rows, err := h.q.CountPlaybackStatsByCameraScoped(ctx, sqlc.CountPlaybackStatsByCameraScopedParams{
			CreatedAt: dateFrom, CreatedAt_2: dateTo,
			SchoolIds: schoolIDs, SchoolID: filterSchool, RowLimit: limit,
		})
		if err != nil {
			response.Internal(c, "failed to load playback stats by camera")
			return
		}
		for _, r := range rows {
			name := ""
			if r.CameraName.Valid {
				name = r.CameraName.String
			}
			id := ""
			if r.CameraID.Valid {
				id = uuid.UUID(r.CameraID.Bytes).String()
			}
			stats.ByCamera = append(stats.ByCamera, playbackGroupStatDTO{
				ID: id, Name: name, Total: r.Total, Denied: r.Denied,
			})
		}
	case "school":
		rows, err := h.q.CountPlaybackStatsBySchoolScoped(ctx, sqlc.CountPlaybackStatsBySchoolScopedParams{
			CreatedAt: dateFrom, CreatedAt_2: dateTo,
			SchoolIds: schoolIDs, RowLimit: limit,
		})
		if err != nil {
			response.Internal(c, "failed to load playback stats by school")
			return
		}
		for _, r := range rows {
			name := ""
			if r.SchoolName.Valid {
				name = r.SchoolName.String
			}
			stats.BySchool = append(stats.BySchool, playbackGroupStatDTO{
				ID: uuid.UUID(r.SchoolID.Bytes).String(), Name: name, Total: r.Total, Denied: r.Denied,
			})
		}
	default:
		tz := h.cfg.SchoolTimezone
		if tz == "" {
			tz = "Africa/Addis_Ababa"
		}
		rows, err := h.q.CountPlaybackStatsByDayScoped(ctx, sqlc.CountPlaybackStatsByDayScopedParams{
			CreatedAt: dateFrom, CreatedAt_2: dateTo, TzName: tz,
			SchoolIds: schoolIDs, SchoolID: filterSchool, CameraID: filterCamera,
		})
		if err != nil {
			response.Internal(c, "failed to load playback stats by day")
			return
		}
		for _, r := range rows {
			stats.ByDay = append(stats.ByDay, playbackDayStatDTO{
				Date:          r.Day.Time.Format("2006-01-02"),
				Total:         r.Total,
				Denied:        r.Denied,
				UniqueParents: r.UniqueParents,
			})
		}
	}

	response.OK(c, http.StatusOK, stats)
}

func tsFormat(t pgtype.Timestamptz) string {
	if !t.Valid {
		return ""
	}
	return t.Time.UTC().Format(timeRFC3339)
}
