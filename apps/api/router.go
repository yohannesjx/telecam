package main

import (
	"log/slog"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"

	appconfig "github.com/school-camera-platform/school-camera-platform/internal/config"
	"github.com/school-camera-platform/school-camera-platform/internal/audit"
	admaccess "github.com/school-camera-platform/school-camera-platform/internal/admin"
	"github.com/school-camera-platform/school-camera-platform/internal/auth"
	"github.com/school-camera-platform/school-camera-platform/internal/database"
	"github.com/school-camera-platform/school-camera-platform/internal/encryption"
	"github.com/school-camera-platform/school-camera-platform/internal/hls"
	"github.com/school-camera-platform/school-camera-platform/internal/playback"
	"github.com/school-camera-platform/school-camera-platform/internal/storage"
	adminhandlers "github.com/school-camera-platform/school-camera-platform/apps/api/handlers/admin"
	"github.com/school-camera-platform/school-camera-platform/apps/api/handlers"
	parenthandlers "github.com/school-camera-platform/school-camera-platform/apps/api/handlers/parent"
)

const apiVersion = "1.0"

func setupRouter(
	logger *slog.Logger,
	cfg *appconfig.Config,
	db *database.DB,
	s3Client *storage.Client,
	rdb *redis.Client,
) *gin.Engine {
	jwtSvc := auth.NewJWTService(cfg.JWTAccessSecret, cfg.JWTAccessTTL)
	auditLog := audit.NewLogger(db.Queries, logger)
	authSvc := auth.NewService(cfg, db, jwtSvc, auditLog, rdb)
	authLimiter := auth.NewRateLimiter(rdb, auth.RateLimitConfig{
		Enabled:                cfg.AuthRateLimitEnabled,
		FailClosedInProduction: cfg.AuthRateLimitFailClosedProduction,
		IsProduction:           cfg.IsProduction(),
		LoginIPLimit:           cfg.AuthLoginIPLimit,
		LoginIPWindow:          time.Duration(cfg.AuthLoginIPWindowSeconds) * time.Second,
		LoginEmailLimit:        cfg.AuthLoginEmailLimit,
		LoginEmailWindow:       time.Duration(cfg.AuthLoginEmailWindowSeconds) * time.Second,
		RefreshIPLimit:         cfg.AuthRefreshIPLimit,
		RefreshIPWindow:        time.Duration(cfg.AuthRefreshIPWindowSeconds) * time.Second,
		RefreshTokenLimit:      cfg.AuthRefreshTokenLimit,
		RefreshTokenWindow:     time.Duration(cfg.AuthRefreshTokenWindowSeconds) * time.Second,
	}, logger)

	var cipher *encryption.Cipher
	if cfg.AppEncryptionKey != "" {
		c, err := encryption.NewCipher(cfg.AppEncryptionKey)
		if err != nil {
			logger.Error("encryption init failed", "error", err)
		} else {
			cipher = c
		}
	}

	access := admaccess.NewAccess(db.Queries)
	authHandler := handlers.NewAuthHandler(authSvc, authLimiter, auditLog)
	protectedHandler := handlers.NewProtectedHandler()
	adminHandler := adminhandlers.NewHandler(db.Queries, access, auditLog, cipher, cfg, s3Client, rdb, logger)
	playbackSvc, err := playback.NewService(cfg, db.Queries, s3Client, auditLog, rdb)
	if err != nil {
		logger.Error("playback service init failed", "error", err)
		panic(err)
	}
	parentHandler := parenthandlers.NewHandler(db.Queries, playbackSvc)

	router := gin.New()
	router.Use(gin.Recovery())
	router.Use(corsMiddleware(cfg.CORSAllowedOrigins))
	router.Use(requestLogger(logger))
	registerCoreRoutes(router)

	router.GET("/db/health", func(c *gin.Context) {
		if err := db.Ping(c.Request.Context()); err != nil {
			logger.Error("db health check failed", "error", err)
			c.JSON(503, gin.H{"status": "error", "error": "postgres unreachable"})
			return
		}
		c.JSON(200, gin.H{"status": "ok", "database": "postgres"})
	})

	if cfg.DemoLiveEnabled {
		router.GET("/demo/live", func(c *gin.Context) {
			playlistKey := hls.PlaylistKey(cfg.HLSDemoCameraID)
			url, err := s3Client.PresignGetObject(c.Request.Context(), playlistKey, cfg.SignedURLExpiry)
			if err != nil {
				logger.Error("presign playlist", "key", playlistKey, "error", err)
				c.JSON(503, gin.H{"error": "failed to generate signed URL; ensure stream-worker has uploaded HLS"})
				return
			}
			c.JSON(200, gin.H{
				"camera_id":      cfg.HLSDemoCameraID,
				"quality":        hls.DefaultQuality,
				"expires_in_sec": int(cfg.SignedURLExpiry.Seconds()),
				"signed_url":     url,
			})
		})
	} else {
		router.GET("/demo/live", func(c *gin.Context) {
			c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		})
	}

	authGroup := router.Group("/auth")
	{
		authGroup.POST("/login", authHandler.Login)
		authGroup.POST("/refresh", authHandler.Refresh)

		authed := authGroup.Group("")
		authed.Use(auth.AuthMiddleware(jwtSvc))
		authed.GET("/me", authHandler.Me)
		authed.POST("/logout", authHandler.Logout)
		authed.POST("/change-password", authHandler.ChangePassword)
	}

	admin := router.Group("/admin")
	admin.Use(auth.AuthMiddleware(jwtSvc))
	admin.GET("/protected-test", auth.RequireRoles(admaccess.RoleSuperAdmin), protectedHandler.AdminTest)

	superAdmin := admin.Group("")
	superAdmin.Use(auth.RequireRoles(admaccess.RoleSuperAdmin))
	{
		superAdmin.POST("/schools", adminHandler.CreateSchool)
		superAdmin.POST("/schools/:school_id/admins", adminHandler.AssignSchoolAdmin)
		superAdmin.GET("/schools/:school_id/admins", adminHandler.ListSchoolAdmins)
		superAdmin.GET("/parents", adminHandler.ListParents)
		superAdmin.GET("/users", adminHandler.ListUsers)
		superAdmin.POST("/users", adminHandler.CreateUser)
		superAdmin.GET("/users/:id", adminHandler.GetUser)
		superAdmin.PATCH("/users/:id", adminHandler.PatchUser)
		superAdmin.PATCH("/users/:id/status", adminHandler.PatchUserStatus)
		superAdmin.PATCH("/users/:id/role", adminHandler.PatchUserRole)
		superAdmin.POST("/users/:id/reset-password", adminHandler.ResetUserPassword)
		superAdmin.POST("/users/:id/force-password-change", adminHandler.ForceUserPasswordChange)
		superAdmin.PUT("/users/:id/schools", adminHandler.AssignUserSchools)
		superAdmin.GET("/alert-deliveries", adminHandler.ListAlertDeliveries)
		superAdmin.POST("/schools/:school_id/revenue-share", adminHandler.SetSchoolRevenueShare)
	}

	storageView := admin.Group("")
	storageView.Use(auth.RequireRoles(admaccess.RoleSuperAdmin, admaccess.RoleSchoolAdmin))
	{
		storageView.GET("/storage-usage", adminHandler.ListStorageUsage)
	}

	retentionView := admin.Group("")
	retentionView.Use(auth.RequireRoles(admaccess.RoleSuperAdmin, admaccess.RoleTechnician))
	{
		retentionView.GET("/retention/status", adminHandler.RetentionStatus)
	}

	schoolMgmt := admin.Group("")
	schoolMgmt.Use(auth.RequireRoles(admaccess.RoleSuperAdmin, admaccess.RoleSchoolAdmin))
	{
		schoolMgmt.GET("/schools", adminHandler.ListSchools)
		schoolMgmt.GET("/schools/:school_id", adminHandler.GetSchool)
		schoolMgmt.PATCH("/schools/:school_id", adminHandler.PatchSchool)

		schoolMgmt.POST("/schools/:school_id/classrooms", adminHandler.CreateClassroom)
		schoolMgmt.GET("/schools/:school_id/classrooms", adminHandler.ListClassrooms)
		schoolMgmt.PATCH("/classrooms/:classroom_id", adminHandler.PatchClassroom)

		schoolMgmt.POST("/schools/:school_id/children", adminHandler.CreateChild)
		schoolMgmt.GET("/schools/:school_id/children", adminHandler.ListChildren)
		schoolMgmt.PATCH("/children/:child_id", adminHandler.PatchChild)

		schoolMgmt.POST("/children/:child_id/parents", adminHandler.AssignParent)
		schoolMgmt.GET("/children/:child_id/parents", adminHandler.ListChildParents)

		schoolMgmt.POST("/parents", adminHandler.CreateParent)

		schoolMgmt.POST("/subscriptions", adminHandler.CreateSubscription)
		schoolMgmt.GET("/subscriptions", adminHandler.ListSubscriptions)
		schoolMgmt.PATCH("/subscriptions/:id/status", adminHandler.PatchSubscriptionStatus)
		schoolMgmt.PATCH("/subscriptions/:id/extend", adminHandler.ExtendSubscription)

		schoolMgmt.POST("/payments", adminHandler.CreatePayment)
		schoolMgmt.GET("/payments", adminHandler.ListPayments)
		schoolMgmt.PATCH("/payments/:id/approve", adminHandler.ApprovePayment)
		schoolMgmt.PATCH("/payments/:id/reject", adminHandler.RejectPayment)

		schoolMgmt.POST("/invoices", adminHandler.CreateInvoice)
		schoolMgmt.GET("/invoices", adminHandler.ListInvoices)
		schoolMgmt.PATCH("/invoices/:id/void", adminHandler.VoidInvoice)
		schoolMgmt.PATCH("/invoices/:id/mark-paid", adminHandler.MarkInvoicePaid)

		schoolMgmt.GET("/schools/:school_id/revenue-share", adminHandler.GetSchoolRevenueShare)

		schoolMgmt.POST("/schools/:school_id/cameras", adminHandler.CreateCamera)
		schoolMgmt.PATCH("/cameras/:camera_id", adminHandler.PatchCamera)
	}

	cameraView := admin.Group("")
	cameraView.Use(auth.RequireRoles(admaccess.RoleSuperAdmin, admaccess.RoleSchoolAdmin, admaccess.RoleTechnician))
	{
		cameraView.GET("/schools/:school_id/cameras", adminHandler.ListSchoolCameras)
		cameraView.GET("/cameras/:camera_id", adminHandler.GetCamera)
		cameraView.GET("/cameras/:camera_id/health", adminHandler.CameraHealth)
		cameraView.GET("/cameras/:camera_id/health-history", adminHandler.CameraHealthHistory)
		cameraView.GET("/cameras/:camera_id/stream-state", adminHandler.CameraStreamState)
	}

	schedulerView := admin.Group("")
	schedulerView.Use(auth.RequireRoles(admaccess.RoleSuperAdmin, admaccess.RoleSchoolAdmin, admaccess.RoleTechnician))
	{
		schedulerView.GET("/scheduler/status", adminHandler.SchedulerStatus)
	}

	monitoringView := admin.Group("")
	monitoringView.Use(auth.RequireRoles(admaccess.RoleSuperAdmin, admaccess.RoleSchoolAdmin, admaccess.RoleTechnician))
	{
		monitoringView.GET("/dashboard", adminHandler.Dashboard)
		monitoringView.GET("/schools/:school_id/cameras/status", adminHandler.SchoolCamerasStatus)
	}

	monitoringWorkers := admin.Group("")
	monitoringWorkers.Use(auth.RequireRoles(admaccess.RoleSuperAdmin, admaccess.RoleTechnician))
	{
		monitoringWorkers.GET("/workers", adminHandler.ListWorkers)
	}

	monitoringAudit := admin.Group("")
	monitoringAudit.Use(auth.RequireRoles(admaccess.RoleSuperAdmin, admaccess.RoleSchoolAdmin))
	{
		monitoringAudit.GET("/audit-logs", adminHandler.ListAuditLogs)
		monitoringAudit.GET("/playback-stats", adminHandler.PlaybackStats)
	}

	healthView := admin.Group("")
	healthView.Use(auth.RequireRoles(admaccess.RoleSuperAdmin, admaccess.RoleSchoolAdmin, admaccess.RoleTechnician))
	{
		healthView.GET("/health/summary", adminHandler.HealthSummary)
		healthView.GET("/alerts", adminHandler.ListAlerts)
		healthView.PATCH("/alerts/:alert_id/acknowledge", adminHandler.AcknowledgeAlert)
		healthView.PATCH("/alerts/:alert_id/resolve", adminHandler.ResolveAlert)
	}

	parent := router.Group("/parent")
	parent.Use(auth.AuthMiddleware(jwtSvc), auth.RequireRoles(admaccess.RoleParent))
	{
		parent.GET("/protected-test", protectedHandler.ParentTest)
		parent.GET("/children", parentHandler.ListChildren)
		parent.GET("/cameras", parentHandler.ListCameras)
		parent.GET("/cameras/:camera_id/live", parentHandler.Live)
		parent.GET("/cameras/:camera_id/timeline", parentHandler.Timeline)
		parent.GET("/cameras/:camera_id/playback", parentHandler.Playback)
		parent.GET("/subscriptions", parentHandler.ListSubscriptions)
		parent.GET("/payments", parentHandler.ListPayments)
		parent.GET("/invoices", parentHandler.ListInvoices)
	}

	return router
}

func registerCoreRoutes(router *gin.Engine) {
	router.GET("/", rootHandler)
	router.GET("/health", healthHandler)
}

func rootHandler(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":  "ok",
		"service": "school-camera-api",
		"version": apiVersion,
	})
}

func healthHandler(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"status": "healthy"})
}
