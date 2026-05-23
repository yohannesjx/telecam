package playback

import (
	"time"

	"github.com/school-camera-platform/school-camera-platform/internal/database/sqlc"
)

// segmentSpan is a minimal time range for grouping (no storage paths).
type segmentSpan struct {
	Start           time.Time
	End             time.Time
	DurationSeconds int
}

// TimelineBlock is a continuous recording window merged from adjacent segments.
type TimelineBlock struct {
	StartTime       time.Time
	EndTime         time.Time
	DurationSeconds int
	SegmentCount    int
}

// GroupTimelineBlocks merges segments when the gap between consecutive pieces is <= gapThreshold.
func GroupTimelineBlocks(segments []segmentSpan, gapThreshold time.Duration) []TimelineBlock {
	if len(segments) == 0 {
		return nil
	}
	if gapThreshold < 0 {
		gapThreshold = 0
	}

	blocks := make([]TimelineBlock, 0, 8)
	cur := TimelineBlock{
		StartTime:       segments[0].Start,
		EndTime:         segments[0].End,
		SegmentCount:    1,
		DurationSeconds: blockDurationSeconds(segments[0].Start, segments[0].End),
	}

	for i := 1; i < len(segments); i++ {
		seg := segments[i]
		gap := seg.Start.Sub(cur.EndTime)
		if gap <= gapThreshold {
			cur.EndTime = seg.End
			cur.SegmentCount++
			cur.DurationSeconds = blockDurationSeconds(cur.StartTime, cur.EndTime)
			continue
		}
		blocks = append(blocks, cur)
		cur = TimelineBlock{
			StartTime:       seg.Start,
			EndTime:         seg.End,
			SegmentCount:    1,
			DurationSeconds: blockDurationSeconds(seg.Start, seg.End),
		}
	}
	blocks = append(blocks, cur)
	return blocks
}

// DetectRecordingGaps reports whether the requested window is not fully covered by segments.
func DetectRecordingGaps(requestedStart, requestedEnd time.Time, segments []segmentSpan, gapThreshold time.Duration) bool {
	if len(segments) == 0 {
		return true
	}
	if segments[0].Start.Sub(requestedStart) > gapThreshold {
		return true
	}
	if requestedEnd.Sub(segments[len(segments)-1].End) > gapThreshold {
		return true
	}
	for i := 1; i < len(segments); i++ {
		if segments[i].Start.Sub(segments[i-1].End) > gapThreshold {
			return true
		}
	}
	return false
}

func blockDurationSeconds(start, end time.Time) int {
	sec := int(end.Sub(start).Seconds())
	if sec < 0 {
		return 0
	}
	return sec
}

func spansFromRecordingRows(rows []sqlc.RecordingSegment) []segmentSpan {
	out := make([]segmentSpan, 0, len(rows))
	for _, seg := range rows {
		if !seg.StartTime.Valid || !seg.EndTime.Valid {
			continue
		}
		out = append(out, segmentSpan{
			Start:           seg.StartTime.Time.UTC(),
			End:             seg.EndTime.Time.UTC(),
			DurationSeconds: int(seg.DurationSeconds),
		})
	}
	return out
}
