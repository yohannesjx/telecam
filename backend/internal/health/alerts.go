package health

import (
	"context"
	"encoding/json"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/school-camera-platform/school-camera-platform/internal/database"
	"github.com/school-camera-platform/school-camera-platform/internal/database/sqlc"
)

// AlertStore wraps alert persistence with de-duplication.
type AlertStore struct {
	q *sqlc.Queries
}

// NewAlertStore creates an alert helper.
func NewAlertStore(q *sqlc.Queries) *AlertStore {
	return &AlertStore{q: q}
}

// OpenOrTouchCameraAlert returns the existing open alert or creates a new one.
func (s *AlertStore) OpenOrTouchCameraAlert(
	ctx context.Context,
	cameraID, schoolID uuid.UUID,
	alertType, severity, title, message string,
	meta map[string]any,
) (sqlc.Alert, bool, error) {
	existing, err := s.q.GetOpenAlertByTypeAndCamera(ctx, sqlc.GetOpenAlertByTypeAndCameraParams{
		AlertType: alertType,
		CameraID:  pgtype.UUID{Bytes: cameraID, Valid: true},
	})
	if err == nil {
		raw, _ := json.Marshal(meta)
		updated, err := s.q.TouchAlertMetadata(ctx, sqlc.TouchAlertMetadataParams{
			ID:       existing.ID,
			Metadata: raw,
		})
		return updated, false, err
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return sqlc.Alert{}, false, err
	}
	created, err := s.createAlert(ctx, &schoolID, &cameraID, alertType, severity, title, message, meta)
	return created, true, err
}

// OpenOrTouchSchoolAlert opens or updates a school-scoped alert (no camera_id).
func (s *AlertStore) OpenOrTouchSchoolAlert(
	ctx context.Context,
	schoolID uuid.UUID,
	alertType, severity, title, message string,
	meta map[string]any,
) (sqlc.Alert, bool, error) {
	existing, err := s.q.GetOpenAlertByTypeAndSchool(ctx, sqlc.GetOpenAlertByTypeAndSchoolParams{
		AlertType: alertType,
		SchoolID:  pgtype.UUID{Bytes: schoolID, Valid: true},
	})
	if err == nil {
		raw, _ := json.Marshal(meta)
		updated, err := s.q.TouchAlertMetadata(ctx, sqlc.TouchAlertMetadataParams{
			ID:       existing.ID,
			Metadata: raw,
		})
		return updated, false, err
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return sqlc.Alert{}, false, err
	}
	created, err := s.createAlert(ctx, &schoolID, nil, alertType, severity, title, message, meta)
	return created, true, err
}

// OpenOrTouchGlobalAlert opens or updates a global alert (no school/camera).
func (s *AlertStore) OpenOrTouchGlobalAlert(
	ctx context.Context,
	alertType, severity, title, message string,
	meta map[string]any,
) (sqlc.Alert, bool, error) {
	existing, err := s.q.GetOpenAlertByTypeGlobal(ctx, alertType)
	if err == nil {
		raw, _ := json.Marshal(meta)
		updated, err := s.q.TouchAlertMetadata(ctx, sqlc.TouchAlertMetadataParams{
			ID:       existing.ID,
			Metadata: raw,
		})
		return updated, false, err
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return sqlc.Alert{}, false, err
	}
	created, err := s.createAlert(ctx, nil, nil, alertType, severity, title, message, meta)
	return created, true, err
}

// ResolveCameraAlert resolves an open camera alert if present.
func (s *AlertStore) ResolveCameraAlert(ctx context.Context, cameraID uuid.UUID, alertType string) error {
	_, err := s.ResolveCameraAlertIfOpen(ctx, cameraID, alertType)
	return err
}

// ResolveCameraAlertIfOpen resolves an open camera alert and reports whether one was closed.
func (s *AlertStore) ResolveCameraAlertIfOpen(ctx context.Context, cameraID uuid.UUID, alertType string) (bool, error) {
	existing, err := s.q.GetOpenAlertByTypeAndCamera(ctx, sqlc.GetOpenAlertByTypeAndCameraParams{
		AlertType: alertType,
		CameraID:  pgtype.UUID{Bytes: cameraID, Valid: true},
	})
	if errors.Is(err, pgx.ErrNoRows) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	_, err = s.q.ResolveAlert(ctx, existing.ID)
	return err == nil, err
}

// ResolveSchoolAlert resolves an open school alert if present.
func (s *AlertStore) ResolveSchoolAlert(ctx context.Context, schoolID uuid.UUID, alertType string) error {
	existing, err := s.q.GetOpenAlertByTypeAndSchool(ctx, sqlc.GetOpenAlertByTypeAndSchoolParams{
		AlertType: alertType,
		SchoolID:  pgtype.UUID{Bytes: schoolID, Valid: true},
	})
	if errors.Is(err, pgx.ErrNoRows) {
		return nil
	}
	if err != nil {
		return err
	}
	_, err = s.q.ResolveAlert(ctx, existing.ID)
	return err
}

// ResolveGlobalAlert resolves a global open alert if present.
func (s *AlertStore) ResolveGlobalAlert(ctx context.Context, alertType string) error {
	existing, err := s.q.GetOpenAlertByTypeGlobal(ctx, alertType)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil
	}
	if err != nil {
		return err
	}
	_, err = s.q.ResolveAlert(ctx, existing.ID)
	return err
}

func (s *AlertStore) createAlert(
	ctx context.Context,
	schoolID, cameraID *uuid.UUID,
	alertType, severity, title, message string,
	meta map[string]any,
) (sqlc.Alert, error) {
	raw, _ := json.Marshal(meta)
	return s.q.CreateAlert(ctx, sqlc.CreateAlertParams{
		ID:        uuid.New(),
		SchoolID:  database.OptionalUUIDToPgtype(schoolID),
		CameraID:  database.OptionalUUIDToPgtype(cameraID),
		AlertType: alertType,
		Severity:  severity,
		Title:     title,
		Message:   database.TextFromString(message),
		Metadata:  raw,
	})
}
