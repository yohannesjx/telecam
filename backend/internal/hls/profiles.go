package hls

import (
	"fmt"
	"path"
	"strings"
)

// DefaultQuality is the standard profile for school cameras.
const DefaultQuality = "sd_360p"

// Profile defines FFmpeg and storage settings for one HLS quality tier.
type Profile struct {
	Name          string
	Width         int
	Height        int
	VideoBitrate  string
	MaxRate       string
	BufSize       string
	AudioEnabled  bool
	AudioBitrate  string
	PathSuffix    string
}

// Profiles lists supported live/recording quality tiers.
var Profiles = map[string]Profile{
	"low_240p": {
		Name:         "low_240p",
		Width:        426,
		Height:       240,
		VideoBitrate: "250k",
		MaxRate:      "300k",
		BufSize:      "500k",
		PathSuffix:   "low_240p",
	},
	"sd_360p": {
		Name:         "sd_360p",
		Width:        640,
		Height:       360,
		VideoBitrate: "450k",
		MaxRate:      "500k",
		BufSize:      "900k",
		PathSuffix:   "sd_360p",
	},
	"sd_480p": {
		Name:         "sd_480p",
		Width:        854,
		Height:       480,
		VideoBitrate: "700k",
		MaxRate:      "800k",
		BufSize:      "1400k",
		PathSuffix:   "sd_480p",
	},
}

var qualityAliases = map[string]string{
	"low":    "low_240p",
	"sd":     "sd_360p",
	"medium": "sd_360p",
}

// ValidateQuality returns an error if q is not a supported profile name.
func ValidateQuality(q string) error {
	if _, ok := Profiles[q]; ok {
		return nil
	}
	return fmt.Errorf("unknown quality %q (allowed: low_240p, sd_360p, sd_480p)", q)
}

// ResolveQuality maps aliases and canonical names; empty input returns empty string.
func ResolveQuality(input string) (string, error) {
	input = strings.TrimSpace(strings.ToLower(input))
	if input == "" {
		return "", nil
	}
	if canonical, ok := qualityAliases[input]; ok {
		input = canonical
	}
	if err := ValidateQuality(input); err != nil {
		return "", err
	}
	return input, nil
}

// ResolveQualityOrDefault resolves input or returns defaultQuality when input is empty.
func ResolveQualityOrDefault(input, defaultQuality string) (string, error) {
	if input == "" {
		if defaultQuality == "" {
			defaultQuality = DefaultQuality
		}
		if err := ValidateQuality(defaultQuality); err != nil {
			return DefaultQuality, nil
		}
		return defaultQuality, nil
	}
	return ResolveQuality(input)
}

// GetProfile returns the profile for a canonical quality name.
func GetProfile(quality string) (Profile, error) {
	if err := ValidateQuality(quality); err != nil {
		return Profile{}, err
	}
	return Profiles[quality], nil
}

// LiveBasePrefix strips playlist and optional quality suffix from a stored r2_live_path.
func LiveBasePrefix(r2LivePath string) string {
	p := strings.TrimPrefix(strings.TrimSpace(r2LivePath), "/")
	if strings.HasSuffix(p, "/index.m3u8") {
		p = strings.TrimSuffix(p, "/index.m3u8")
	}
	for name := range Profiles {
		suffix := "/" + name
		if strings.HasSuffix(p, suffix) {
			return strings.TrimSuffix(p, suffix)
		}
	}
	return p
}

// LivePlaylistKey returns the object key for a quality-specific live playlist.
func LivePlaylistKey(r2LivePath, quality string) string {
	return path.Join(LiveBasePrefix(r2LivePath), quality, "index.m3u8")
}

// LiveSegmentKey returns the object key for a segment under a quality-specific live path.
func LiveSegmentKey(r2LivePath, quality, segmentFile string) string {
	return path.Join(LiveBasePrefix(r2LivePath), quality, "segments", segmentFile)
}

// LivePlaylistKeyForCamera builds the default demo-style path: cameras/{id}/live/{quality}/index.m3u8.
func LivePlaylistKeyForCamera(cameraID, quality string) string {
	return LivePlaylistKey(path.Join("cameras", cameraID, "live"), quality)
}
