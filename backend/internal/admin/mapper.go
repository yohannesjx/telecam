package admin

import (
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/school-camera-platform/school-camera-platform/internal/database/sqlc"
)

// SchoolDTO is the public school representation.
type SchoolDTO struct {
	ID        string  `json:"id"`
	Name      string  `json:"name"`
	Address   *string `json:"address,omitempty"`
	Phone     *string `json:"phone,omitempty"`
	Status    string  `json:"status"`
	CreatedAt string  `json:"created_at"`
	UpdatedAt string  `json:"updated_at"`
}

// ClassroomDTO is the public classroom representation.
type ClassroomDTO struct {
	ID        string  `json:"id"`
	SchoolID  string  `json:"school_id"`
	Name      string  `json:"name"`
	AgeGroup  *string `json:"age_group,omitempty"`
	Status    string  `json:"status"`
	CreatedAt string  `json:"created_at"`
	UpdatedAt string  `json:"updated_at"`
}

// ChildDTO is the public child representation.
type ChildDTO struct {
	ID          string  `json:"id"`
	SchoolID    string  `json:"school_id"`
	ClassroomID *string `json:"classroom_id,omitempty"`
	FullName    string  `json:"full_name"`
	Status      string  `json:"status"`
	CreatedAt   string  `json:"created_at"`
	UpdatedAt   string  `json:"updated_at"`
}

// CameraDTO excludes RTSP secrets.
type CameraDTO struct {
	ID              string  `json:"id"`
	SchoolID        string  `json:"school_id"`
	ClassroomID     *string `json:"classroom_id,omitempty"`
	Name            string  `json:"name"`
	R2LivePath      string  `json:"r2_live_path"`
	R2RecordingPath *string `json:"r2_recording_path,omitempty"`
	DefaultQuality  string  `json:"default_quality"`
	Status          string  `json:"status"`
	CreatedAt       string  `json:"created_at"`
	UpdatedAt       string  `json:"updated_at"`
}

// ParentCameraDTO for parent listing.
type ParentCameraDTO struct {
	CameraID       string `json:"camera_id"`
	CameraName     string `json:"camera_name"`
	SchoolName     string `json:"school_name"`
	ClassroomName  string `json:"classroom_name"`
	DefaultQuality string `json:"default_quality"`
	Status         string `json:"status"`
}

// ParentChildDTO for parent children listing.
type ParentChildDTO struct {
	ID            string  `json:"id"`
	FullName      string  `json:"full_name"`
	Status        string  `json:"status"`
	SchoolID      string  `json:"school_id"`
	SchoolName    string  `json:"school_name"`
	ClassroomID   *string `json:"classroom_id,omitempty"`
	ClassroomName *string `json:"classroom_name,omitempty"`
}

func SchoolFromModel(s sqlc.School) SchoolDTO {
	dto := SchoolDTO{
		ID:        s.ID.String(),
		Name:      s.Name,
		Status:    s.Status,
		CreatedAt: formatTime(s.CreatedAt),
		UpdatedAt: formatTime(s.UpdatedAt),
	}
	if s.Address.Valid {
		dto.Address = &s.Address.String
	}
	if s.Phone.Valid {
		dto.Phone = &s.Phone.String
	}
	return dto
}

func ClassroomFromModel(c sqlc.Classroom) ClassroomDTO {
	dto := ClassroomDTO{
		ID:        c.ID.String(),
		SchoolID:  c.SchoolID.String(),
		Name:      c.Name,
		Status:    c.Status,
		CreatedAt: formatTime(c.CreatedAt),
		UpdatedAt: formatTime(c.UpdatedAt),
	}
	if c.AgeGroup.Valid {
		dto.AgeGroup = &c.AgeGroup.String
	}
	return dto
}

func ChildFromModel(c sqlc.Child) ChildDTO {
	dto := ChildDTO{
		ID:        c.ID.String(),
		SchoolID:  c.SchoolID.String(),
		FullName:  c.FullName,
		Status:    c.Status,
		CreatedAt: formatTime(c.CreatedAt),
		UpdatedAt: formatTime(c.UpdatedAt),
	}
	if c.ClassroomID.Valid {
		s := uuid.UUID(c.ClassroomID.Bytes).String()
		dto.ClassroomID = &s
	}
	return dto
}

func CameraFromModel(c sqlc.Camera) CameraDTO {
	dto := CameraDTO{
		ID:             c.ID.String(),
		SchoolID:       c.SchoolID.String(),
		Name:           c.Name,
		R2LivePath:     c.R2LivePath,
		DefaultQuality: c.DefaultQuality,
		Status:         c.Status,
		CreatedAt:      formatTime(c.CreatedAt),
		UpdatedAt:      formatTime(c.UpdatedAt),
	}
	if c.ClassroomID.Valid {
		s := uuid.UUID(c.ClassroomID.Bytes).String()
		dto.ClassroomID = &s
	}
	if c.R2RecordingPath.Valid {
		dto.R2RecordingPath = &c.R2RecordingPath.String
	}
	return dto
}

func ParentChildFromRow(r sqlc.ListChildrenForParentRow) ParentChildDTO {
	dto := ParentChildDTO{
		ID:         r.ID.String(),
		FullName:   r.FullName,
		Status:     r.Status,
		SchoolID:   r.SchoolID.String(),
		SchoolName: r.SchoolName,
	}
	if r.ClassroomID.Valid {
		s := uuid.UUID(r.ClassroomID.Bytes).String()
		dto.ClassroomID = &s
	}
	if r.ClassroomName.Valid {
		dto.ClassroomName = &r.ClassroomName.String
	}
	return dto
}

func ParentCameraFromRow(r sqlc.ListCamerasForParentRow) ParentCameraDTO {
	return ParentCameraDTO{
		CameraID:       r.CameraID.String(),
		CameraName:     r.CameraName,
		SchoolName:     r.SchoolName,
		ClassroomName:  textOrEmpty(r.ClassroomName),
		DefaultQuality: r.DefaultQuality,
		Status:         r.Status,
	}
}

func formatTime(t pgtype.Timestamptz) string {
	if !t.Valid {
		return ""
	}
	return t.Time.UTC().Format(time.RFC3339)
}

func textOrEmpty(t pgtype.Text) string {
	if !t.Valid {
		return ""
	}
	return t.String
}
