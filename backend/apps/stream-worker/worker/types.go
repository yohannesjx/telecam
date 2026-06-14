package worker

import (
	"crypto/sha256"
	"encoding/hex"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/school-camera-platform/school-camera-platform/internal/database/sqlc"
)

// StreamingCamera is an active camera eligible for HLS ingestion.
type StreamingCamera struct {
	ID               uuid.UUID
	SchoolID         uuid.UUID
	Name             string
	EncryptedRtspURL pgtype.Text
	R2LivePath       string
	DefaultQuality   string
}

// ConfigKey fingerprints stream-relevant camera fields for restart detection.
func (c StreamingCamera) ConfigKey() string {
	rtsp := ""
	if c.EncryptedRtspURL.Valid {
		sum := sha256.Sum256([]byte(c.EncryptedRtspURL.String))
		rtsp = hex.EncodeToString(sum[:8])
	}
	return c.R2LivePath + "|" + c.DefaultQuality + "|" + rtsp
}

// StreamSourceKind identifies demo file vs RTSP input.
type StreamSourceKind string

const (
	SourceDemo StreamSourceKind = "demo"
	SourceRTSP StreamSourceKind = "rtsp"
)

// StreamSource holds FFmpeg input configuration (never log RTSP URLs).
type StreamSource struct {
	Kind  StreamSourceKind
	Input string
}

func cameraFromRow(row sqlc.ListActiveCamerasForStreamingRow) StreamingCamera {
	return StreamingCamera{
		ID:               row.ID,
		SchoolID:         row.SchoolID,
		Name:             row.Name,
		EncryptedRtspURL: row.EncryptedRtspUrl,
		R2LivePath:       row.R2LivePath,
		DefaultQuality:   row.DefaultQuality,
	}
}

func hasRTSP(cam StreamingCamera) bool {
	return cam.EncryptedRtspURL.Valid && cam.EncryptedRtspURL.String != ""
}

func filterCamerasForMode(cameras []StreamingCamera, mode string) []StreamingCamera {
	out := make([]StreamingCamera, 0, len(cameras))
	for _, cam := range cameras {
		switch mode {
		case "demo":
			if !hasRTSP(cam) {
				out = append(out, cam)
			}
		case "rtsp":
			if hasRTSP(cam) {
				out = append(out, cam)
			}
		case "mixed":
			out = append(out, cam)
		}
	}
	return out
}
