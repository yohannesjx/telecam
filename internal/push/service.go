package push

import (
	"context"
	"fmt"
	"log/slog"
	"os"

	firebase "firebase.google.com/go/v4"
	"firebase.google.com/go/v4/messaging"
	"github.com/google/uuid"
	"google.golang.org/api/option"

	appconfig "github.com/school-camera-platform/school-camera-platform/internal/config"
	"github.com/school-camera-platform/school-camera-platform/internal/database/sqlc"
)

// Service delivers parent push notifications via FCM when enabled.
type Service struct {
	enabled bool
	client  *messaging.Client
	q       *sqlc.Queries
	logger  *slog.Logger
}

// NewService builds an FCM client when configured; otherwise returns a no-op sender.
func NewService(ctx context.Context, cfg *appconfig.Config, q *sqlc.Queries, logger *slog.Logger) (*Service, error) {
	svc := &Service{
		enabled: cfg.FCMEnabled,
		q:       q,
		logger:  logger,
	}
	if !cfg.FCMEnabled {
		logger.Info("FCM push disabled")
		return svc, nil
	}

	credsPath := cfg.GoogleApplicationCredentials
	if credsPath == "" {
		return nil, fmt.Errorf("FCM_ENABLED requires GOOGLE_APPLICATION_CREDENTIALS")
	}
	if _, err := os.Stat(credsPath); err != nil {
		return nil, fmt.Errorf("firebase credentials file: %w", err)
	}

	opts := []option.ClientOption{option.WithCredentialsFile(credsPath)}
	app, err := firebase.NewApp(ctx, &firebase.Config{ProjectID: cfg.FCMProjectID}, opts...)
	if err != nil {
		return nil, fmt.Errorf("firebase app: %w", err)
	}
	client, err := app.Messaging(ctx)
	if err != nil {
		return nil, fmt.Errorf("firebase messaging: %w", err)
	}
	svc.client = client
	logger.Info("FCM push enabled", "project_id", cfg.FCMProjectID)
	return svc, nil
}

// SendToUser delivers a notification to all eligible devices for a parent user.
func (s *Service) SendToUser(ctx context.Context, userID uuid.UUID, p Payload) error {
	if !s.enabled || s.client == nil {
		return nil
	}
	if !p.AllowedParentType() {
		return nil
	}

	devices, err := s.q.ListPushEnabledDevicesForUser(ctx, userID)
	if err != nil {
		return err
	}

	var lastErr error
	sent := 0
	for _, d := range devices {
		prefs := ParsePreferences(d.NotificationPreferences)
		if !prefs.AllowsType(p.Type) {
			continue
		}
		token := d.FcmToken.String
		if token == "" {
			continue
		}
		if err := s.sendToken(ctx, token, p); err != nil {
			lastErr = err
			s.logger.Warn("fcm send failed", "user_id", userID, "device_id", d.ID, "type", p.Type, "error", err)
			continue
		}
		sent++
	}
	if sent == 0 && lastErr != nil {
		return lastErr
	}
	return nil
}

func (s *Service) sendToken(ctx context.Context, token string, p Payload) error {
	data := map[string]string{
		"type":  p.Type,
		"title": p.Title,
		"body":  p.Body,
		"route": p.Route,
	}
	if p.PaymentID != "" {
		data["payment_id"] = p.PaymentID
	}
	if p.InvoiceID != "" {
		data["invoice_id"] = p.InvoiceID
	}
	if p.CameraID != "" {
		data["camera_id"] = p.CameraID
	}

	msg := &messaging.Message{
		Token: token,
		Notification: &messaging.Notification{
			Title: p.Title,
			Body:  p.Body,
		},
		Data: data,
		Android: &messaging.AndroidConfig{
			Priority: "high",
		},
		APNS: &messaging.APNSConfig{
			Payload: &messaging.APNSPayload{
				Aps: &messaging.Aps{
					Sound: "default",
				},
			},
		},
	}
	_, err := s.client.Send(ctx, msg)
	return err
}

func (p Payload) AllowedParentType() bool {
	switch p.Type {
	case TypeSubscriptionExpiring, TypeSubscriptionExpired,
		TypePaymentApproved, TypePaymentRejected, TypeInvoiceCreated,
		TypeImportantNotice, TypeCameraUnavailableParent:
		return true
	default:
		return false
	}
}

// NotifyPaymentApproved sends a calm payment approval notice.
func (s *Service) NotifyPaymentApproved(ctx context.Context, parentID, paymentID uuid.UUID) {
	_ = s.SendToUser(ctx, parentID, Payload{
		Type:      TypePaymentApproved,
		Title:     "Payment approved",
		Body:      "Your payment has been approved.",
		Route:     "/subscription",
		PaymentID: paymentID.String(),
	})
}

// NotifyPaymentRejected sends a payment rejection notice.
func (s *Service) NotifyPaymentRejected(ctx context.Context, parentID, paymentID uuid.UUID) {
	_ = s.SendToUser(ctx, parentID, Payload{
		Type:      TypePaymentRejected,
		Title:     "Payment not approved",
		Body:      "Your payment could not be approved. Please contact the school if you need help.",
		Route:     "/billing/payments",
		PaymentID: paymentID.String(),
	})
}

// NotifyInvoiceCreated sends a new invoice notice.
func (s *Service) NotifyInvoiceCreated(ctx context.Context, parentID, invoiceID uuid.UUID) {
	_ = s.SendToUser(ctx, parentID, Payload{
		Type:      TypeInvoiceCreated,
		Title:     "New invoice",
		Body:      "A new invoice is available for your account.",
		Route:     "/billing/invoices",
		InvoiceID: invoiceID.String(),
	})
}
