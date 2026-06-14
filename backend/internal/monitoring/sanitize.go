package monitoring

import (
	"encoding/json"
	"strings"
)

var sensitiveMetadataKeys = []string{
	"rtsp", "url", "signed", "token", "password", "secret", "encrypted",
	"hash", "refresh", "credential", "access_key", "secret_key", "playlist_key",
	"segment_path", "proof_url",
}

// SanitizeMetadata removes sensitive fields from audit metadata before API responses.
func SanitizeMetadata(raw []byte) map[string]any {
	if len(raw) == 0 {
		return nil
	}
	var m map[string]any
	if err := json.Unmarshal(raw, &m); err != nil {
		return nil
	}
	return sanitizeMap(m)
}

func sanitizeMap(m map[string]any) map[string]any {
	if m == nil {
		return nil
	}
	out := make(map[string]any, len(m))
	for k, v := range m {
		if isSensitiveKey(k) {
			continue
		}
		switch nested := v.(type) {
		case map[string]any:
			clean := sanitizeMap(nested)
			if len(clean) > 0 {
				out[k] = clean
			}
		default:
			out[k] = v
		}
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func isSensitiveKey(key string) bool {
	lower := strings.ToLower(key)
	for _, s := range sensitiveMetadataKeys {
		if strings.Contains(lower, s) {
			return true
		}
	}
	return false
}

// SanitizeWorkerMetadata strips sensitive keys from worker heartbeat metadata.
func SanitizeWorkerMetadata(raw []byte) map[string]any {
	return SanitizeMetadata(raw)
}
