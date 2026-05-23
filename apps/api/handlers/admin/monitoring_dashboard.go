package admin

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/school-camera-platform/school-camera-platform/internal/alertdelivery"
	"github.com/school-camera-platform/school-camera-platform/internal/database"
	"github.com/school-camera-platform/school-camera-platform/internal/database/sqlc"
	"github.com/school-camera-platform/school-camera-platform/internal/health"
	"github.com/school-camera-platform/school-camera-platform/internal/monitoring"
	"github.com/school-camera-platform/school-camera-platform/internal/retention"
	"github.com/school-camera-platform/school-camera-platform/internal/scheduler"
	"github.com/school-camera-platform/school-camera-platform/apps/api/response"
)

type dashboardDTO struct {
	SchoolsTotal            int64   `json:"schools_total"`
	SchoolsActive           int64   `json:"schools_active"`
	ParentsTotal            int64   `json:"parents_total"`
	ParentsActive           int64   `json:"parents_active"`
	ChildrenTotal           int64   `json:"children_total"`
	CamerasTotal            int64   `json:"cameras_total"`
	CamerasActive           int64   `json:"cameras_active"`
	CamerasOffline          int64   `json:"cameras_offline"`
	CamerasHealthy          int64   `json:"cameras_healthy"`
	SystemHealthScorePercent float64 `json:"system_health_score_percent"`
	OpenAlerts              int64   `json:"open_alerts"`
	CriticalAlerts          int64   `json:"critical_alerts"`
	SubscriptionsActive     int64   `json:"subscriptions_active"`
	SubscriptionsTrial      int64   `json:"subscriptions_trial"`
	SubscriptionsPastDue    int64   `json:"subscriptions_past_due"`
	SubscriptionsCancelled  int64   `json:"subscriptions_cancelled"`
	SubscriptionsBlocked    int64   `json:"subscriptions_blocked"`
	MonthlyRevenueETB       float64 `json:"monthly_revenue_etb"`
	PendingPaymentsETB      float64 `json:"pending_payments_etb"`
	PlaybackRequestsToday   int64   `json:"playback_requests_today"`
	PlaybackDeniedToday     int64   `json:"playback_denied_today"`
	LoginFailuresToday      int64   `json:"login_failures_today"`
	StorageTotalGB          float64 `json:"storage_total_gb"`
	StreamWorkerStatus      string  `json:"stream_worker_status"`
	HealthWorkerStatus      string  `json:"health_worker_status"`
	AlertWorkerStatus       string  `json:"alert_worker_status"`
	SchedulerWorkerStatus   string  `json:"scheduler_worker_status"`
	RetentionWorkerStatus   string  `json:"retention_worker_status"`
	Cached                  bool    `json:"cached,omitempty"`
}

// Dashboard GET /admin/dashboard
func (h *Handler) Dashboard(c *gin.Context) {
	ctx := c.Request.Context()
	schoolIDs, ok := h.monitoringSchoolIDs(c)
	if !ok {
		return
	}

	scopeKey := monitoring.ScopeKey(schoolIDs)
	var cached dashboardDTO
	if h.dashboardCache != nil && h.dashboardCache.Get(ctx, scopeKey, &cached) {
		cached.Cached = true
		response.OK(c, http.StatusOK, cached)
		return
	}

	dto := h.buildDashboard(ctx, schoolIDs)

	if h.dashboardCache != nil {
		_ = h.dashboardCache.Set(ctx, scopeKey, dto)
	}
	response.OK(c, http.StatusOK, dto)
}

func (h *Handler) buildDashboard(ctx context.Context, schoolIDs []uuid.UUID) dashboardDTO {
	schoolsTotal, _ := h.q.CountSchoolsScoped(ctx, schoolIDs)
	schoolsActive, _ := h.q.CountSchoolsByStatusScoped(ctx, sqlc.CountSchoolsByStatusScopedParams{
		Status: "ACTIVE", SchoolIds: schoolIDs,
	})
	parentsTotal, _ := h.q.CountParentsScoped(ctx, schoolIDs)
	parentsActive, _ := h.q.CountParentsByStatusScoped(ctx, sqlc.CountParentsByStatusScopedParams{
		Status: "ACTIVE", SchoolIds: schoolIDs,
	})
	childrenTotal, _ := h.q.CountChildrenScoped(ctx, schoolIDs)
	camerasTotal, _ := h.q.CountCamerasScoped(ctx, schoolIDs)
	camerasActive, _ := h.q.CountCamerasByStatusScoped(ctx, sqlc.CountCamerasByStatusScopedParams{
		Status: "ACTIVE", SchoolIds: schoolIDs,
	})
	camerasOffline, _ := h.q.CountCamerasByStatusScoped(ctx, sqlc.CountCamerasByStatusScopedParams{
		Status: "OFFLINE", SchoolIds: schoolIDs,
	})
	healthyCams, _ := h.q.CountHealthyCamerasScoped(ctx, sqlc.CountHealthyCamerasScopedParams{
		MaxSegmentAgeSeconds: int32(h.cfg.CameraOfflineAfterSeconds),
		SchoolIds:            schoolIDs,
	})
	openAlerts, _ := h.q.CountOpenAlertsScoped(ctx, schoolIDs)
	criticalAlerts, _ := h.q.CountOpenAlertsBySeverityScoped(ctx, sqlc.CountOpenAlertsBySeverityScopedParams{
		Severity: "CRITICAL", SchoolIds: schoolIDs,
	})

	subActive, _ := h.q.CountSubscriptionsByStatusScoped(ctx, sqlc.CountSubscriptionsByStatusScopedParams{Status: "ACTIVE", SchoolIds: schoolIDs})
	subTrial, _ := h.q.CountSubscriptionsByStatusScoped(ctx, sqlc.CountSubscriptionsByStatusScopedParams{Status: "TRIAL", SchoolIds: schoolIDs})
	subPastDue, _ := h.q.CountSubscriptionsByStatusScoped(ctx, sqlc.CountSubscriptionsByStatusScopedParams{Status: "PAST_DUE", SchoolIds: schoolIDs})
	subCancelled, _ := h.q.CountSubscriptionsByStatusScoped(ctx, sqlc.CountSubscriptionsByStatusScopedParams{Status: "CANCELLED", SchoolIds: schoolIDs})
	subBlocked, _ := h.q.CountSubscriptionsByStatusScoped(ctx, sqlc.CountSubscriptionsByStatusScopedParams{Status: "BLOCKED", SchoolIds: schoolIDs})

	loc := h.schoolLocation()
	monthStart, monthEnd := monitoring.MonthBoundsUTC(loc, time.Now())
	revenueCents, _ := h.q.SumApprovedPaymentsCentsScoped(ctx, sqlc.SumApprovedPaymentsCentsScopedParams{
		ApprovedAt:   database.TimestamptzFromTime(monthStart),
		ApprovedAt_2: database.TimestamptzFromTime(monthEnd),
		SchoolIds:    schoolIDs,
	})
	pendingCents, _ := h.q.SumPendingPaymentsCentsScoped(ctx, schoolIDs)

	todayStart, todayEnd := monitoring.TodayBoundsUTC(loc)
	todayFrom := database.TimestamptzFromTime(todayStart)
	todayTo := database.TimestamptzFromTime(todayEnd)

	playbackToday, _ := h.q.CountAuditActionsScoped(ctx, sqlc.CountAuditActionsScopedParams{
		CreatedAt: todayFrom, CreatedAt_2: todayTo,
		Actions: []string{
			"PLAYBACK_LIVE_REQUESTED",
			"PLAYBACK_TIMELINE_REQUESTED",
			"PLAYBACK_RECORDING_REQUESTED",
		},
		SchoolIds: schoolIDs,
	})
	playbackDenied, _ := h.q.CountAuditActionsScoped(ctx, sqlc.CountAuditActionsScopedParams{
		CreatedAt: todayFrom, CreatedAt_2: todayTo,
		Actions:   []string{"PLAYBACK_ACCESS_DENIED"},
		SchoolIds: schoolIDs,
	})
	loginFailures, _ := h.q.CountAuditActionsScoped(ctx, sqlc.CountAuditActionsScopedParams{
		CreatedAt: todayFrom, CreatedAt_2: todayTo,
		Actions:   []string{"AUTH_LOGIN_FAILED"},
		SchoolIds: schoolIDs,
	})

	storageBytes, _ := h.q.SumLatestStorageBytesScoped(ctx, schoolIDs)

	workers, _ := h.q.ListLatestWorkerHeartbeats(ctx)
	staleSec := h.cfg.WorkerStaleThresholdSeconds
	workerMap := map[string]string{}
	for _, hb := range workers {
		workerMap[hb.WorkerType] = monitoring.WorkerDisplayStatus(hb, staleSec)
	}

	healthDenom := camerasActive + camerasOffline
	if healthDenom == 0 {
		healthDenom = camerasTotal
	}

	return dashboardDTO{
		SchoolsTotal:             schoolsTotal,
		SchoolsActive:            schoolsActive,
		ParentsTotal:             parentsTotal,
		ParentsActive:            parentsActive,
		ChildrenTotal:            childrenTotal,
		CamerasTotal:             camerasTotal,
		CamerasActive:            camerasActive,
		CamerasOffline:           camerasOffline,
		CamerasHealthy:           healthyCams,
		SystemHealthScorePercent: monitoring.CameraHealthScorePercent(healthyCams, healthDenom),
		OpenAlerts:               openAlerts,
		CriticalAlerts:           criticalAlerts,
		SubscriptionsActive:      subActive,
		SubscriptionsTrial:       subTrial,
		SubscriptionsPastDue:     subPastDue,
		SubscriptionsCancelled:   subCancelled,
		SubscriptionsBlocked:     subBlocked,
		MonthlyRevenueETB:        centsToETB(revenueCents),
		PendingPaymentsETB:       centsToETB(pendingCents),
		PlaybackRequestsToday:    playbackToday,
		PlaybackDeniedToday:      playbackDenied,
		LoginFailuresToday:       loginFailures,
		StorageTotalGB:           bytesToGB(storageBytes),
		StreamWorkerStatus:       workerStatusOrUnknown(workerMap, health.WorkerTypeStream),
		HealthWorkerStatus:       workerStatusOrUnknown(workerMap, health.WorkerTypeHealth),
		AlertWorkerStatus:        workerStatusOrUnknown(workerMap, alertdelivery.WorkerTypeAlert),
		SchedulerWorkerStatus:    workerStatusOrUnknown(workerMap, scheduler.WorkerTypeScheduler),
		RetentionWorkerStatus:    workerStatusOrUnknown(workerMap, retention.WorkerTypeRetention),
	}
}

func workerStatusOrUnknown(m map[string]string, workerType string) string {
	if s, ok := m[workerType]; ok {
		return s
	}
	return "UNKNOWN"
}
