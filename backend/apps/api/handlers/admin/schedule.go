package admin

import (
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"

	adm "github.com/school-camera-platform/school-camera-platform/internal/admin"
	"github.com/school-camera-platform/school-camera-platform/internal/database"
	"github.com/school-camera-platform/school-camera-platform/internal/database/sqlc"
	"github.com/school-camera-platform/school-camera-platform/internal/schoolschedule"
	"github.com/school-camera-platform/school-camera-platform/apps/api/response"
)

type scheduleRequest struct {
	Timezone                 string   `json:"timezone"`
	OpenDays                 []string `json:"open_days"`
	OpenTime                 string   `json:"open_time"`
	CloseTime                string   `json:"close_time"`
	LiveEnabled              *bool    `json:"live_enabled"`
	TemporaryLivePaused      *bool    `json:"temporary_live_paused"`
	TemporaryLivePauseReason *string  `json:"temporary_live_pause_reason"`
}

type scheduleResponse struct {
	SchoolID                 string   `json:"school_id"`
	Timezone                 string   `json:"timezone"`
	OpenDays                 []string `json:"open_days"`
	OpenTime                 string   `json:"open_time"`
	CloseTime                string   `json:"close_time"`
	LiveEnabled              bool     `json:"live_enabled"`
	TemporaryLivePaused      bool     `json:"temporary_live_paused"`
	TemporaryLivePauseReason *string  `json:"temporary_live_pause_reason,omitempty"`
	IsOpenNow                bool     `json:"is_open_now"`
	NextLiveAvailableAt      *string  `json:"next_live_available_at,omitempty"`
	CreatedAt                *string  `json:"created_at,omitempty"`
	UpdatedAt                *string  `json:"updated_at,omitempty"`
}

// GetSchoolSchedule GET /admin/schools/:school_id/schedule
func (h *Handler) GetSchoolSchedule(c *gin.Context) {
	schoolID, ok := h.parseUUID(c, "school_id")
	if !ok {
		return
	}
	user, ok := h.user(c)
	if !ok {
		return
	}
	allowed, err := h.access.CanManageSchool(c.Request.Context(), user.Role, user.UserID, schoolID)
	if err != nil {
		response.Internal(c, "access check failed")
		return
	}
	if !allowed {
		response.Forbidden(c, "not allowed for this school")
		return
	}
	if _, err := h.q.GetSchool(c.Request.Context(), schoolID); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			response.NotFound(c, "school not found")
			return
		}
		response.Internal(c, "failed to get school")
		return
	}

	defaults := schoolschedule.DefaultsFromConfig(h.cfg)
	eval := schoolschedule.NewEvaluator(h.q, defaults)
	settings, err := eval.ForSchool(c.Request.Context(), schoolID)
	if err != nil {
		response.Internal(c, "failed to load schedule")
		return
	}
	row, rowErr := h.q.GetSchoolScheduleSettings(c.Request.Context(), schoolID)
	result := settings.Evaluate(time.Now().UTC())
	response.OK(c, http.StatusOK, buildScheduleResponse(schoolID.String(), result, row, rowErr == nil))
}

// PutSchoolSchedule PUT /admin/schools/:school_id/schedule (SUPER_ADMIN only)
func (h *Handler) PutSchoolSchedule(c *gin.Context) {
	schoolID, ok := h.parseUUID(c, "school_id")
	if !ok {
		return
	}
	user, ok := h.user(c)
	if !ok {
		return
	}
	if user.Role != adm.RoleSuperAdmin {
		response.Forbidden(c, "only super_admin may update school schedule")
		return
	}
	if _, err := h.q.GetSchool(c.Request.Context(), schoolID); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			response.NotFound(c, "school not found")
			return
		}
		response.Internal(c, "failed to get school")
		return
	}

	var req scheduleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "invalid request body")
		return
	}
	if err := validateScheduleRequest(req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	liveEnabled := true
	if req.LiveEnabled != nil {
		liveEnabled = *req.LiveEnabled
	}
	tempPaused := false
	if req.TemporaryLivePaused != nil {
		tempPaused = *req.TemporaryLivePaused
	}
	pauseReason := ""
	if req.TemporaryLivePauseReason != nil {
		pauseReason = strings.TrimSpace(*req.TemporaryLivePauseReason)
	}

	openDaysStr := strings.Join(normalizeOpenDays(req.OpenDays), ",")
	params := sqlc.UpsertSchoolScheduleSettingsParams{
		SchoolID:                 schoolID,
		Timezone:                 req.Timezone,
		OpenDays:                 openDaysStr,
		OpenTime:                 req.OpenTime,
		CloseTime:                req.CloseTime,
		LiveEnabled:              liveEnabled,
		TemporaryLivePaused:      tempPaused,
		TemporaryLivePauseReason: database.TextFromString(pauseReason),
	}
	row, err := h.q.UpsertSchoolScheduleSettings(c.Request.Context(), params)
	if err != nil {
		response.Internal(c, "failed to save schedule")
		return
	}

	h.auditEvent(c, "SCHOOL_SCHEDULE_UPDATED", &user.UserID, &schoolID, map[string]any{
		"timezone":  req.Timezone,
		"open_days": openDaysStr,
	})

	defaults := schoolschedule.DefaultsFromConfig(h.cfg)
	eval := schoolschedule.NewEvaluator(h.q, defaults)
	settings, err := eval.ForSchool(c.Request.Context(), schoolID)
	if err != nil {
		response.Internal(c, "failed to evaluate updated schedule")
		return
	}
	result := settings.Evaluate(time.Now().UTC())
	response.OK(c, http.StatusOK, buildScheduleResponse(schoolID.String(), result, row, true))
}

func buildScheduleResponse(schoolID string, result schoolschedule.EvalResult, row sqlc.SchoolScheduleSetting, hasRow bool) scheduleResponse {
	resp := scheduleResponse{
		SchoolID:            schoolID,
		Timezone:            result.Timezone,
		OpenDays:            result.OpenDays,
		OpenTime:            result.OpenTime,
		CloseTime:           result.CloseTime,
		LiveEnabled:         result.LiveEnabled,
		TemporaryLivePaused: result.TemporaryLivePaused,
		IsOpenNow:           result.IsOpenNow,
	}
	if result.TemporaryLivePauseReason != "" {
		r := result.TemporaryLivePauseReason
		resp.TemporaryLivePauseReason = &r
	}
	if result.NextLiveAvailableAt != nil {
		s := result.NextLiveAvailableAt.UTC().Format(time.RFC3339)
		resp.NextLiveAvailableAt = &s
	}
	if hasRow && row.CreatedAt.Valid {
		s := row.CreatedAt.Time.UTC().Format(time.RFC3339)
		resp.CreatedAt = &s
	}
	if hasRow && row.UpdatedAt.Valid {
		s := row.UpdatedAt.Time.UTC().Format(time.RFC3339)
		resp.UpdatedAt = &s
	}
	return resp
}

func validateScheduleRequest(req scheduleRequest) error {
	if strings.TrimSpace(req.Timezone) == "" {
		return errors.New("timezone is required")
	}
	if _, err := time.LoadLocation(req.Timezone); err != nil {
		return errors.New("timezone is invalid")
	}
	if err := schoolschedule.ValidateDays(req.OpenDays); err != nil {
		return err
	}
	if err := parseScheduleHM("open_time", req.OpenTime); err != nil {
		return err
	}
	if err := parseScheduleHM("close_time", req.CloseTime); err != nil {
		return err
	}
	oh, om := mustScheduleHM(req.OpenTime)
	ch, cm := mustScheduleHM(req.CloseTime)
	if oh*60+om >= ch*60+cm {
		return errors.New("open_time must be before close_time")
	}
	if req.TemporaryLivePauseReason != nil && utf8.RuneCountInString(*req.TemporaryLivePauseReason) > 250 {
		return errors.New("temporary_live_pause_reason must not exceed 250 characters")
	}
	return nil
}

func parseScheduleHM(field, value string) error {
	if strings.TrimSpace(value) == "" {
		return fmt.Errorf("%s is required", field)
	}
	var h, m int
	if _, err := fmt.Sscanf(value, "%d:%d", &h, &m); err != nil || h < 0 || h > 23 || m < 0 || m > 59 {
		return fmt.Errorf("%s must be in HH:mm format (e.g. 08:30)", field)
	}
	return nil
}

func mustScheduleHM(value string) (int, int) {
	var h, m int
	_, _ = fmt.Sscanf(value, "%d:%d", &h, &m)
	return h, m
}

func normalizeOpenDays(days []string) []string {
	out := make([]string, 0, len(days))
	for _, d := range days {
		out = append(out, strings.ToUpper(strings.TrimSpace(d)))
	}
	return out
}
