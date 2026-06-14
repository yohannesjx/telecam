package monitoring

import (
	"encoding/json"
	"testing"
)

func TestSanitizeMetadata(t *testing.T) {
	raw, _ := json.Marshal(map[string]any{
		"camera_id":   "abc",
		"signed_url":  "https://secret",
		"rtsp_url":    "rtsp://x",
		"nested":      map[string]any{"playlist_key": "cameras/1/live/x"},
	})
	out := SanitizeMetadata(raw)
	if _, ok := out["signed_url"]; ok {
		t.Fatal("signed_url should be stripped")
	}
	if _, ok := out["rtsp_url"]; ok {
		t.Fatal("rtsp_url should be stripped")
	}
	if out["camera_id"] != "abc" {
		t.Fatal("expected safe field to remain")
	}
	if nested, ok := out["nested"].(map[string]any); ok && len(nested) > 0 {
		t.Fatal("expected nested sensitive keys removed")
	}
}
