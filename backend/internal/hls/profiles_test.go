package hls

import "testing"

func TestResolveQuality(t *testing.T) {
	tests := []struct {
		in   string
		want string
	}{
		{"", ""},
		{"low", "low_240p"},
		{"sd", "sd_360p"},
		{"medium", "sd_360p"},
		{"sd_480p", "sd_480p"},
	}
	for _, tc := range tests {
		got, err := ResolveQuality(tc.in)
		if err != nil {
			t.Fatalf("ResolveQuality(%q): %v", tc.in, err)
		}
		if got != tc.want {
			t.Fatalf("ResolveQuality(%q) = %q, want %q", tc.in, got, tc.want)
		}
	}
}

func TestLivePlaylistKey(t *testing.T) {
	key := LivePlaylistKey("cameras/demo/live/sd_360p/index.m3u8", "low_240p")
	want := "cameras/demo/live/low_240p/index.m3u8"
	if key != want {
		t.Fatalf("got %q want %q", key, want)
	}
	key = LivePlaylistKey("cameras/demo/live/index.m3u8", "sd_360p")
	if key != "cameras/demo/live/sd_360p/index.m3u8" {
		t.Fatalf("legacy base: got %q", key)
	}
}
