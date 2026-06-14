// Package admin provides school-scoped access checks for management APIs.
package admin

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/school-camera-platform/school-camera-platform/internal/database/sqlc"
)

const (
	RoleSuperAdmin  = "SUPER_ADMIN"
	RoleSchoolAdmin = "SCHOOL_ADMIN"
	RoleParent      = "PARENT"
	RoleTechnician  = "TECHNICIAN"
)

// Access evaluates role and school-admin assignments.
type Access struct {
	q *sqlc.Queries
}

// NewAccess creates an access helper.
func NewAccess(q *sqlc.Queries) *Access {
	return &Access{q: q}
}

// CanManageSchool returns true if the user may manage the given school.
func (a *Access) CanManageSchool(ctx context.Context, role string, userID, schoolID uuid.UUID) (bool, error) {
	if role == RoleSuperAdmin {
		return true, nil
	}
	if role != RoleSchoolAdmin {
		return false, nil
	}
	return a.IsSchoolAdmin(ctx, userID, schoolID)
}

// CanViewSchoolCameras includes technicians (temporary global read until assignment table exists).
func (a *Access) CanViewSchoolCameras(ctx context.Context, role string, userID, schoolID uuid.UUID) (bool, error) {
	if role == RoleSuperAdmin || role == RoleTechnician {
		return true, nil
	}
	return a.CanManageSchool(ctx, role, userID, schoolID)
}

// IsSchoolAdmin checks the school_admins mapping.
func (a *Access) IsSchoolAdmin(ctx context.Context, userID, schoolID uuid.UUID) (bool, error) {
	row, err := a.q.IsUserSchoolAdmin(ctx, sqlc.IsUserSchoolAdminParams{
		SchoolID: schoolID,
		UserID:   userID,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return false, nil
		}
		return false, err
	}
	return row, nil
}

// ChildSchoolID returns the school for a child.
func (a *Access) ChildSchoolID(ctx context.Context, childID uuid.UUID) (uuid.UUID, error) {
	child, err := a.q.GetChild(ctx, childID)
	if err != nil {
		return uuid.Nil, err
	}
	return child.SchoolID, nil
}

// CameraSchoolID returns the school for a camera.
func (a *Access) CameraSchoolID(ctx context.Context, cameraID uuid.UUID) (uuid.UUID, error) {
	cam, err := a.q.GetCamera(ctx, cameraID)
	if err != nil {
		return uuid.Nil, err
	}
	return cam.SchoolID, nil
}

// CanViewAlert returns true if the user may view or act on an alert.
func (a *Access) CanViewAlert(ctx context.Context, role string, userID uuid.UUID, schoolID pgtype.UUID) (bool, error) {
	if role == RoleSuperAdmin || role == RoleTechnician {
		return true, nil
	}
	if role != RoleSchoolAdmin {
		return false, nil
	}
	if !schoolID.Valid {
		return false, nil
	}
	return a.IsSchoolAdmin(ctx, userID, uuid.UUID(schoolID.Bytes))
}

// SchoolIDsForUser returns assigned school IDs for a school admin, or nil for global roles.
func (a *Access) SchoolIDsForUser(ctx context.Context, role string, userID uuid.UUID) ([]uuid.UUID, error) {
	if role == RoleSuperAdmin || role == RoleTechnician {
		return nil, nil
	}
	if role != RoleSchoolAdmin {
		return []uuid.UUID{}, nil
	}
	return a.q.ListSchoolIDsForUser(ctx, userID)
}
