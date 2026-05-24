package parent

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/school-camera-platform/school-camera-platform/internal/database"
	"github.com/school-camera-platform/school-camera-platform/internal/database/sqlc"
	"github.com/school-camera-platform/school-camera-platform/internal/push"
	"github.com/school-camera-platform/school-camera-platform/apps/api/response"
)

type registerPushTokenRequest struct {
	DeviceFingerprint      string `json:"device_fingerprint" validate:"required"`
	FCMToken               string `json:"fcm_token" validate:"required"`
	Platform               string `json:"platform" validate:"required"`
	AppVersion             string `json:"app_version"`
	NotificationsEnabled   bool   `json:"notifications_enabled"`
}

type notificationPreferencesRequest struct {
	SubscriptionReminders *bool `json:"subscription_reminders"`
	PaymentUpdates        *bool `json:"payment_updates"`
	ImportantNotices      *bool `json:"important_notices"`
	CameraStatusNotices   *bool `json:"camera_status_notices"`
}

type notificationPreferencesDTO struct {
	SubscriptionReminders bool `json:"subscription_reminders"`
	PaymentUpdates        bool `json:"payment_updates"`
	ImportantNotices      bool `json:"important_notices"`
	CameraStatusNotices   bool `json:"camera_status_notices"`
}

type currentDeviceDTO struct {
	DeviceID                string                     `json:"device_id"`
	DeviceName              string                     `json:"device_name"`
	Platform                string                     `json:"platform"`
	NotificationsEnabled    bool                       `json:"notifications_enabled"`
	NotificationPreferences notificationPreferencesDTO `json:"notification_preferences"`
}

var deviceValidate = validator.New()

func prefsDTO(raw json.RawMessage) notificationPreferencesDTO {
	p := push.ParsePreferences(raw)
	return notificationPreferencesDTO{
		SubscriptionReminders: p.SubscriptionReminders,
		PaymentUpdates:        p.PaymentUpdates,
		ImportantNotices:      p.ImportantNotices,
		CameraStatusNotices:   p.CameraStatusNotices,
	}
}

func deviceToCurrentDTO(d sqlc.Device) currentDeviceDTO {
	name := d.DeviceFingerprint
	if d.DeviceName.Valid && d.DeviceName.String != "" {
		name = d.DeviceName.String
	}
	platform := ""
	if d.PushPlatform.Valid {
		platform = d.PushPlatform.String
	}
	return currentDeviceDTO{
		DeviceID:                d.ID.String(),
		DeviceName:              name,
		Platform:                platform,
		NotificationsEnabled:    d.NotificationsEnabled,
		NotificationPreferences: prefsDTO(d.NotificationPreferences),
	}
}

// RegisterPushToken POST /parent/devices/push-token
func (h *Handler) RegisterPushToken(c *gin.Context) {
	user, ok := h.user(c)
	if !ok {
		return
	}

	var req registerPushTokenRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "invalid request body")
		return
	}
	if err := deviceValidate.Struct(req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	ctx := c.Request.Context()
	tokenParams := sqlc.UpdateDevicePushTokenParams{
		UserID:               user.UserID,
		DeviceFingerprint:    req.DeviceFingerprint,
		FcmToken:             database.TextFromString(req.FCMToken),
		PushPlatform:         database.TextFromString(req.Platform),
		AppVersion:           database.TextFromString(req.AppVersion),
		NotificationsEnabled: req.NotificationsEnabled,
		DeviceName:           pgtype.Text{},
	}

	var dev sqlc.Device
	var err error
	updated := false

	if user.DeviceID != uuid.Nil {
		byID, idErr := h.q.GetDeviceByIDForUser(ctx, sqlc.GetDeviceByIDForUserParams{
			ID:     user.DeviceID,
			UserID: user.UserID,
		})
		if idErr == nil && byID.DeviceFingerprint == req.DeviceFingerprint {
			dev, err = h.q.UpdateDevicePushTokenByID(ctx, sqlc.UpdateDevicePushTokenByIDParams{
				ID:                   user.DeviceID,
				UserID:               user.UserID,
				FcmToken:             tokenParams.FcmToken,
				PushPlatform:         tokenParams.PushPlatform,
				AppVersion:           tokenParams.AppVersion,
				NotificationsEnabled: req.NotificationsEnabled,
			})
			updated = err == nil
		}
	}

	if !updated {
		dev, err = h.q.UpdateDevicePushToken(ctx, tokenParams)
	}
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			response.NotFound(c, "device not found; sign in again on this device")
			return
		}
		response.Internal(c, "failed to register push token")
		return
	}

	response.OK(c, http.StatusOK, deviceToCurrentDTO(dev))
}

// UpdateNotificationPreferences PATCH /parent/devices/notification-preferences
func (h *Handler) UpdateNotificationPreferences(c *gin.Context) {
	user, ok := h.user(c)
	if !ok {
		return
	}
	if user.DeviceID == uuid.Nil {
		response.BadRequest(c, "device context required")
		return
	}

	var req notificationPreferencesRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "invalid request body")
		return
	}

	existing, err := h.q.GetDeviceByIDForUser(c.Request.Context(), sqlc.GetDeviceByIDForUserParams{
		ID:     user.DeviceID,
		UserID: user.UserID,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			response.NotFound(c, "device not found")
			return
		}
		response.Internal(c, "failed to load device")
		return
	}

	prefs := push.ParsePreferences(existing.NotificationPreferences)
	if req.SubscriptionReminders != nil {
		prefs.SubscriptionReminders = *req.SubscriptionReminders
	}
	if req.PaymentUpdates != nil {
		prefs.PaymentUpdates = *req.PaymentUpdates
	}
	if req.ImportantNotices != nil {
		prefs.ImportantNotices = *req.ImportantNotices
	}
	if req.CameraStatusNotices != nil {
		prefs.CameraStatusNotices = *req.CameraStatusNotices
	}

	raw, err := prefs.ToJSON()
	if err != nil {
		response.Internal(c, "failed to encode preferences")
		return
	}

	updated, err := h.q.UpdateDeviceNotificationPreferences(c.Request.Context(), sqlc.UpdateDeviceNotificationPreferencesParams{
		ID:                      user.DeviceID,
		UserID:                  user.UserID,
		NotificationPreferences: raw,
	})
	if err != nil {
		response.Internal(c, "failed to update notification preferences")
		return
	}

	response.OK(c, http.StatusOK, gin.H{
		"notification_preferences": prefsDTO(updated.NotificationPreferences),
	})
}

// GetCurrentDevice GET /parent/devices/current
func (h *Handler) GetCurrentDevice(c *gin.Context) {
	user, ok := h.user(c)
	if !ok {
		return
	}
	if user.DeviceID == uuid.Nil {
		response.NotFound(c, "device not found")
		return
	}

	dev, err := h.q.GetDeviceByIDForUser(c.Request.Context(), sqlc.GetDeviceByIDForUserParams{
		ID:     user.DeviceID,
		UserID: user.UserID,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			response.NotFound(c, "device not found")
			return
		}
		response.Internal(c, "failed to load device")
		return
	}

	response.OK(c, http.StatusOK, deviceToCurrentDTO(dev))
}

// DisablePushNotifications POST /parent/devices/push-disable (optional helper for logout)
func (h *Handler) DisablePushNotifications(c *gin.Context) {
	user, ok := h.user(c)
	if !ok {
		return
	}
	if user.DeviceID == uuid.Nil {
		response.OK(c, http.StatusOK, gin.H{"ok": true})
		return
	}

	_, err := h.q.DisableDeviceNotifications(c.Request.Context(), sqlc.DisableDeviceNotificationsParams{
		ID:     user.DeviceID,
		UserID: user.UserID,
	})
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		response.Internal(c, "failed to disable notifications")
		return
	}
	response.OK(c, http.StatusOK, gin.H{"ok": true})
}
