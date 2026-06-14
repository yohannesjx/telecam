package retention

import "testing"

func TestIsDeletableSegmentKey(t *testing.T) {
	tests := []struct {
		key  string
		want bool
	}{
		{"cameras/school/camera/recording/sd_360p/segment_00001.ts", true},
		{"cameras/demo/live/sd_360p/index.m3u8", false},
		{"cameras/demo/live/sd_360p/segments/segment_00001.ts", false},
		{"temp-playback/user/cam/1/index.m3u8", false},
	}
	for _, tc := range tests {
		if got := IsDeletableSegmentKey(tc.key); got != tc.want {
			t.Fatalf("key %q got %v want %v", tc.key, got, tc.want)
		}
	}
}

func TestShouldSkipPlaylistDelete(t *testing.T) {
	if !ShouldSkipPlaylistDelete("cameras/demo/live/sd_360p/index.m3u8") {
		t.Fatal("live playlist should be skipped")
	}
}
