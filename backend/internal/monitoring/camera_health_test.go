package monitoring

import "testing"

func TestCameraHealthScorePercent(t *testing.T) {
	if got := CameraHealthScorePercent(9, 10); got != 90 {
		t.Fatalf("got %v want 90", got)
	}
	if got := CameraHealthScorePercent(0, 0); got != 100 {
		t.Fatalf("empty set should be 100, got %v", got)
	}
}

func TestSegmentLagSeconds(t *testing.T) {
	lag := SegmentLagSeconds(45, 30)
	if lag == nil || *lag != 15 {
		t.Fatalf("expected lag 15, got %v", lag)
	}
}
