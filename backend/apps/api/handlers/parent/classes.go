package parent

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/school-camera-platform/school-camera-platform/internal/database/sqlc"
	"github.com/school-camera-platform/school-camera-platform/internal/superappauth"
	"github.com/school-camera-platform/school-camera-platform/apps/api/response"
)

// SuperAppClasses handles GET /parent/superapp/classes.
//
// Returns children/classrooms/cameras for the linked School parent account.
// Requires:
//   - Valid Super App bearer token (enforced by RequireSuperAppUser middleware).
//   - An active parent_superapp_links record.
//
// Never returns RTSP URLs, encrypted RTSP URLs, signed HLS URLs, or storage paths.
// Live playback is NOT implemented here — camera listing only.
func (h *Handler) SuperAppClasses(c *gin.Context) {
	v, ok := c.Get(superappauth.ContextKey)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": gin.H{
				"code":    "SUPERAPP_AUTH_REQUIRED",
				"message": "Super App authentication required",
			},
		})
		return
	}
	superAppUser, ok := v.(*superappauth.User)
	if !ok {
		response.Internal(c, "unexpected context value type")
		return
	}

	// Resolve the School parent account linked to this Super App user.
	link, err := h.q.GetActiveParentSuperAppLinkBySuperAppUser(c.Request.Context(), superAppUser.UserID)
	if errors.Is(err, pgx.ErrNoRows) {
		c.JSON(http.StatusForbidden, gin.H{
			"error": gin.H{
				"code":    "PARENT_LINK_REQUIRED",
				"message": "Link your school parent account before accessing classes",
			},
		})
		return
	}
	if err != nil {
		response.Internal(c, "failed to resolve parent link")
		return
	}

	rows, err := h.q.ListSuperAppParentClasses(c.Request.Context(), link.ParentID)
	if err != nil {
		response.Internal(c, "failed to load classes")
		return
	}

	c.JSON(http.StatusOK, gin.H{"children": buildClassesResponse(rows)})
}

// buildClassesResponse groups flat (child × camera) SQL rows into nested child
// entries. A child without cameras gets an empty "cameras" array. Camera fields
// that are NULL (from the LEFT JOIN) mean the classroom has no cameras yet.
//
// Sensitive fields (RTSP URLs, encrypted RTSP, storage paths) are never selected
// in the SQL query and therefore cannot appear here.
func buildClassesResponse(rows []sqlc.ListSuperAppParentClassesRow) []gin.H {
	type entry struct {
		childID       uuid.UUID
		childName     string
		classroomID   uuid.UUID
		classroomName string
		schoolID      uuid.UUID
		schoolName    string
		cameras       []gin.H
	}

	var ordered []entry
	index := map[uuid.UUID]int{}

	for _, row := range rows {
		idx, exists := index[row.ChildID]
		if !exists {
			ordered = append(ordered, entry{
				childID:       row.ChildID,
				childName:     row.ChildName,
				classroomID:   row.ClassroomID,
				classroomName: row.ClassroomName,
				schoolID:      row.SchoolID,
				schoolName:    row.SchoolName,
				cameras:       []gin.H{},
			})
			idx = len(ordered) - 1
			index[row.ChildID] = idx
		}

		// Only add a camera when the LEFT JOIN produced a real row.
		if row.CameraID.Valid {
			ordered[idx].cameras = append(ordered[idx].cameras, gin.H{
				"camera_id":       uuid.UUID(row.CameraID.Bytes).String(),
				"label":           pgText(row.CameraLabel),
				"status":          cameraStatus(row.CameraStatus),
				"live_available":  cameraLiveAvailable(row.CameraStatus),
				"default_quality": pgText(row.DefaultQuality),
			})
		}
	}

	out := make([]gin.H, 0, len(ordered))
	for _, e := range ordered {
		out = append(out, gin.H{
			"child_id":       e.childID.String(),
			"child_name":     e.childName,
			"classroom_id":   e.classroomID.String(),
			"classroom_name": e.classroomName,
			"school_id":      e.schoolID.String(),
			"school_name":    e.schoolName,
			"cameras":        e.cameras,
		})
	}
	return out
}

// cameraStatus maps the DB cameras.status value to a client-safe label.
// The stream worker sets 'ACTIVE' when streaming successfully and 'OFFLINE'
// when the stream is lost. Any other value returns "unknown".
func cameraStatus(s pgtype.Text) string {
	if !s.Valid {
		return "unknown"
	}
	switch s.String {
	case "ACTIVE":
		return "online"
	case "OFFLINE":
		return "offline"
	default:
		return "unknown"
	}
}

// cameraLiveAvailable reports whether the camera is currently streaming.
func cameraLiveAvailable(s pgtype.Text) bool {
	return s.Valid && s.String == "ACTIVE"
}

// pgText returns the string value of a nullable pgtype.Text, or "" if NULL.
func pgText(t pgtype.Text) string {
	if t.Valid {
		return t.String
	}
	return ""
}
