// Package hls defines object key paths and helpers for HLS assets in object storage.
package hls

import (
	"fmt"
	"path"
)

// CameraPrefix returns the storage prefix for a camera's live HLS output.
func CameraPrefix(cameraID string) string {
	return path.Join("cameras", cameraID, "live")
}

// PlaylistKey returns the object key for the default-quality live playlist (demo shortcut).
func PlaylistKey(cameraID string) string {
	return LivePlaylistKey(CameraPrefix(cameraID), DefaultQuality)
}

// SegmentKey returns the object key for a numbered segment file.
func SegmentKey(cameraID string, segmentNum int) string {
	return path.Join(CameraPrefix(cameraID), "segments", fmt.Sprintf("segment_%05d.ts", segmentNum))
}

// SegmentPattern returns the local FFmpeg segment filename pattern.
func SegmentPattern() string {
	return "segment_%05d.ts"
}
