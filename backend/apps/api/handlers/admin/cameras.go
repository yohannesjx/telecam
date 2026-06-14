package admin

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	adm "github.com/school-camera-platform/school-camera-platform/internal/admin"
	"github.com/school-camera-platform/school-camera-platform/internal/database"
	"github.com/school-camera-platform/school-camera-platform/internal/database/sqlc"
	"github.com/school-camera-platform/school-camera-platform/internal/hls"
	"github.com/school-camera-platform/school-camera-platform/apps/api/response"
)

type createCameraRequest struct {
	ClassroomID       string `json:"classroom_id" validate:"required,uuid"`
	Name              string `json:"name" validate:"required"`
	RTSPURL           string `json:"rtsp_url"`
	R2LivePath        string `json:"r2_live_path" validate:"required"`
	R2RecordingPath   string `json:"r2_recording_path"`
	DefaultQuality    string `json:"default_quality"`
}

type patchCameraRequest struct {
	ClassroomID     *string `json:"classroom_id"`
	Name            *string `json:"name"`
	RTSPURL         *string `json:"rtsp_url"`
	R2LivePath      *string `json:"r2_live_path"`
	R2RecordingPath *string `json:"r2_recording_path"`
	DefaultQuality  *string `json:"default_quality"`
	Status          *string `json:"status"`
}

// CreateCamera POST /admin/schools/:school_id/cameras
func (h *Handler) CreateCamera(c *gin.Context) {
	schoolID, ok := h.parseUUID(c, "school_id")
	if !ok || !h.requireSchoolManage(c, schoolID) {
		return
	}

	var req createCameraRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "invalid request body")
		return
	}
	if err := h.validate.Struct(req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	classroomID, err := uuid.Parse(req.ClassroomID)
	if err != nil {
		response.BadRequest(c, "invalid classroom_id")
		return
	}
	belongs, err := h.q.ClassroomBelongsToSchool(c.Request.Context(), sqlc.ClassroomBelongsToSchoolParams{
		ID: classroomID, SchoolID: schoolID,
	})
	if err != nil || !belongs {
		response.BadRequest(c, "classroom does not belong to school")
		return
	}

	encrypted, err := h.encryptRTSP(req.RTSPURL)
	if err != nil {
		response.Internal(c, "failed to encrypt rtsp url")
		return
	}

	quality := req.DefaultQuality
	if quality == "" {
		quality = hls.DefaultQuality
	}
	if err := hls.ValidateQuality(quality); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	camera, err := h.q.CreateCamera(c.Request.Context(), sqlc.CreateCameraParams{
		ID:               uuid.New(),
		SchoolID:         schoolID,
		ClassroomID:      database.UUIDToPgtype(classroomID),
		Name:             req.Name,
		EncryptedRtspUrl: encrypted,
		R2LivePath:       req.R2LivePath,
		R2RecordingPath:  database.TextFromString(req.R2RecordingPath),
		DefaultQuality:   quality,
		Status:           "ACTIVE",
	})
	if err != nil {
		response.Internal(c, "failed to create camera")
		return
	}

	user, _ := h.user(c)
	h.auditEvent(c, "CAMERA_CREATED", &user.UserID, &schoolID, map[string]any{"camera_id": camera.ID.String()})
	response.OK(c, http.StatusCreated, adm.CameraFromModel(camera))
}

// ListSchoolCameras GET /admin/schools/:school_id/cameras
func (h *Handler) ListSchoolCameras(c *gin.Context) {
	schoolID, ok := h.parseUUID(c, "school_id")
	if !ok || !h.requireSchoolCameraView(c, schoolID) {
		return
	}

	rows, err := h.q.ListCamerasBySchool(c.Request.Context(), schoolID)
	if err != nil {
		response.Internal(c, "failed to list cameras")
		return
	}
	out := make([]adm.CameraDTO, 0, len(rows))
	for _, r := range rows {
		out = append(out, adm.CameraFromModel(r))
	}
	response.OK(c, http.StatusOK, out)
}

// GetCamera GET /admin/cameras/:camera_id
func (h *Handler) GetCamera(c *gin.Context) {
	cameraID, ok := h.parseUUID(c, "camera_id")
	if !ok {
		return
	}

	camera, err := h.q.GetCamera(c.Request.Context(), cameraID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			response.NotFound(c, "camera not found")
			return
		}
		response.Internal(c, "failed to load camera")
		return
	}
	if !h.requireSchoolCameraView(c, camera.SchoolID) {
		return
	}
	response.OK(c, http.StatusOK, adm.CameraFromModel(camera))
}

// PatchCamera PATCH /admin/cameras/:camera_id
func (h *Handler) PatchCamera(c *gin.Context) {
	cameraID, ok := h.parseUUID(c, "camera_id")
	if !ok {
		return
	}

	camera, err := h.q.GetCamera(c.Request.Context(), cameraID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			response.NotFound(c, "camera not found")
			return
		}
		response.Internal(c, "failed to load camera")
		return
	}
	if !h.requireSchoolManage(c, camera.SchoolID) {
		return
	}

	var req patchCameraRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "invalid request body")
		return
	}

	if req.DefaultQuality != nil {
		if err := hls.ValidateQuality(*req.DefaultQuality); err != nil {
			response.BadRequest(c, err.Error())
			return
		}
	}

	params := sqlc.UpdateCameraParams{
		ID:              cameraID,
		Name:            optionalText(req.Name),
		R2LivePath:      optionalText(req.R2LivePath),
		R2RecordingPath: optionalText(req.R2RecordingPath),
		DefaultQuality:  optionalText(req.DefaultQuality),
		Status:          optionalText(req.Status),
	}

	if req.ClassroomID != nil {
		cid, err := uuid.Parse(*req.ClassroomID)
		if err != nil {
			response.BadRequest(c, "invalid classroom_id")
			return
		}
		belongs, err := h.q.ClassroomBelongsToSchool(c.Request.Context(), sqlc.ClassroomBelongsToSchoolParams{
			ID: cid, SchoolID: camera.SchoolID,
		})
		if err != nil || !belongs {
			response.BadRequest(c, "classroom does not belong to school")
			return
		}
		params.ClassroomID = database.UUIDToPgtype(cid)
	}

	if req.RTSPURL != nil && *req.RTSPURL != "" {
		enc, err := h.encryptRTSP(*req.RTSPURL)
		if err != nil {
			response.Internal(c, "failed to encrypt rtsp url")
			return
		}
		params.EncryptedRtspUrl = enc
	}

	updated, err := h.q.UpdateCamera(c.Request.Context(), params)
	if err != nil {
		response.Internal(c, "failed to update camera")
		return
	}

	user, _ := h.user(c)
	h.auditEvent(c, "CAMERA_UPDATED", &user.UserID, &camera.SchoolID, map[string]any{"camera_id": cameraID.String()})
	response.OK(c, http.StatusOK, adm.CameraFromModel(updated))
}

func (h *Handler) encryptRTSP(rtspURL string) (pgtype.Text, error) {
	if rtspURL == "" {
		return pgtype.Text{}, nil
	}
	if h.cipher == nil {
		return pgtype.Text{}, errors.New("encryption not configured")
	}
	enc, err := h.cipher.Encrypt(rtspURL)
	if err != nil {
		return pgtype.Text{}, err
	}
	return database.TextFromString(enc), nil
}
