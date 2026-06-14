package worker

import (
	"github.com/school-camera-platform/school-camera-platform/internal/hls"
)

// PlaylistObjectKey returns the S3 object key for the live HLS playlist at camera default quality.
func PlaylistObjectKey(r2LivePath, quality string) string {
	return hls.LivePlaylistKey(r2LivePath, quality)
}

// SegmentObjectKey returns the S3 object key for a segment file at the given quality.
func SegmentObjectKey(r2LivePath, quality, segmentFile string) string {
	return hls.LiveSegmentKey(r2LivePath, quality, segmentFile)
}
