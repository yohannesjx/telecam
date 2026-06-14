package retention

import "strings"

// IsDeletableSegmentKey returns true if the object key is a recording segment path safe to delete.
func IsDeletableSegmentKey(key string) bool {
	if key == "" {
		return false
	}
	if strings.HasPrefix(key, TempPlaybackPrefix) {
		return false
	}
	if strings.Contains(key, "/live/") {
		return false
	}
	if strings.HasSuffix(key, "index.m3u8") && strings.Contains(key, "/live") {
		return false
	}
	return true
}

// IsTempPlaybackKey returns true for keys under temp-playback/.
func IsTempPlaybackKey(key string) bool {
	return strings.HasPrefix(key, TempPlaybackPrefix)
}

// ShouldSkipPlaylistDelete avoids deleting live HLS playlists referenced as playlist_path.
func ShouldSkipPlaylistDelete(playlistPath string) bool {
	if playlistPath == "" {
		return true
	}
	if strings.Contains(playlistPath, "/live/") {
		return true
	}
	if strings.HasSuffix(playlistPath, "index.m3u8") {
		return strings.Contains(playlistPath, "cameras/")
	}
	return false
}
