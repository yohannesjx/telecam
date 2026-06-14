package playback

import (
	"testing"
	"time"
)

func TestGroupTimelineBlocks_mergesSmallGaps(t *testing.T) {
	segments := []segmentSpan{
		{Start: parseUTC("2026-05-23T08:30:00Z"), End: parseUTC("2026-05-23T08:30:10Z"), DurationSeconds: 10},
		{Start: parseUTC("2026-05-23T08:30:10Z"), End: parseUTC("2026-05-23T08:30:20Z"), DurationSeconds: 10},
		{Start: parseUTC("2026-05-23T08:30:35Z"), End: parseUTC("2026-05-23T08:30:45Z"), DurationSeconds: 10},
	}
	blocks := GroupTimelineBlocks(segments, 30*time.Second)
	if len(blocks) != 1 {
		t.Fatalf("expected 1 block, got %d", len(blocks))
	}
	if blocks[0].SegmentCount != 3 {
		t.Fatalf("segment count: got %d want 3", blocks[0].SegmentCount)
	}
	if blocks[0].DurationSeconds != 45 {
		t.Fatalf("duration: got %d want 45", blocks[0].DurationSeconds)
	}
}

func TestGroupTimelineBlocks_splitsLargeGaps(t *testing.T) {
	segments := []segmentSpan{
		{Start: parseUTC("2026-05-23T08:30:00Z"), End: parseUTC("2026-05-23T08:30:10Z"), DurationSeconds: 10},
		{Start: parseUTC("2026-05-23T10:00:00Z"), End: parseUTC("2026-05-23T10:00:10Z"), DurationSeconds: 10},
	}
	blocks := GroupTimelineBlocks(segments, 30*time.Second)
	if len(blocks) != 2 {
		t.Fatalf("expected 2 blocks, got %d", len(blocks))
	}
}

func TestDetectRecordingGaps(t *testing.T) {
	segments := []segmentSpan{
		{Start: parseUTC("2026-05-23T09:00:00Z"), End: parseUTC("2026-05-23T09:00:10Z")},
		{Start: parseUTC("2026-05-23T09:10:00Z"), End: parseUTC("2026-05-23T09:10:10Z")},
	}
	reqStart := parseUTC("2026-05-23T08:30:00Z")
	reqEnd := parseUTC("2026-05-23T10:00:00Z")
	if !DetectRecordingGaps(reqStart, reqEnd, segments, 30*time.Second) {
		t.Fatal("expected gaps at start and between segments")
	}
}

func parseUTC(s string) time.Time {
	tm, err := time.Parse(time.RFC3339, s)
	if err != nil {
		panic(err)
	}
	return tm
}
