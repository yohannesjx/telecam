package playback

import (
	"bytes"
	"fmt"
	"math"
	"strings"
)

// VODSegmentEntry is one segment in a temporary playback playlist.
type VODSegmentEntry struct {
	URL             string
	DurationSeconds float64
}

// BuildVODPlaylist creates an HLS media playlist with per-segment EXTINF durations and ENDLIST.
func BuildVODPlaylist(entries []VODSegmentEntry) []byte {
	var buf bytes.Buffer
	buf.WriteString("#EXTM3U\n")
	buf.WriteString("#EXT-X-VERSION:3\n")

	target := 10
	for _, e := range entries {
		d := int(math.Ceil(e.DurationSeconds))
		if d > target {
			target = d
		}
	}
	if target <= 0 {
		target = 10
	}

	buf.WriteString(fmt.Sprintf("#EXT-X-TARGETDURATION:%d\n", target))
	buf.WriteString("#EXT-X-MEDIA-SEQUENCE:0\n")
	buf.WriteString("#EXT-X-PLAYLIST-TYPE:VOD\n")
	for _, e := range entries {
		dur := e.DurationSeconds
		if dur <= 0 {
			dur = float64(target)
		}
		buf.WriteString(fmt.Sprintf("#EXTINF:%.3f,\n", dur))
		buf.WriteString(e.URL)
		buf.WriteString("\n")
	}
	buf.WriteString("#EXT-X-ENDLIST\n")
	return buf.Bytes()
}

// BuildVODPlaylistFromURLs is a convenience wrapper when all segments share one duration hint.
func BuildVODPlaylistFromURLs(segmentURLs []string, durations []int32) []byte {
	entries := make([]VODSegmentEntry, len(segmentURLs))
	for i, url := range segmentURLs {
		d := float64(10)
		if i < len(durations) && durations[i] > 0 {
			d = float64(durations[i])
		}
		entries[i] = VODSegmentEntry{URL: url, DurationSeconds: d}
	}
	return BuildVODPlaylist(entries)
}

// TempPlaybackKey builds the object key for a temporary playback playlist.
func TempPlaybackKey(userID, cameraID string, ts int64) string {
	return strings.Join([]string{
		"temp-playback",
		userID,
		cameraID,
		fmt.Sprintf("%d", ts),
		"index.m3u8",
	}, "/")
}
