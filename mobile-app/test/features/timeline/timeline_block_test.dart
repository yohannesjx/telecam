import 'package:flutter_test/flutter_test.dart';
import 'package:school_camera/features/timeline/domain/timeline_block.dart';

void main() {
  test('parses timeline block with start_time/end_time', () {
    final block = TimelineBlock.fromJson({
      'start_time': '2026-05-24T08:30:00+03:00',
      'end_time': '2026-05-24T09:00:00+03:00',
      'duration_seconds': 1800,
      'segment_count': 180,
      'has_gaps': false,
    });
    expect(block.durationSeconds, 1800);
    expect(block.formatTimeRange(), isNotEmpty);
  });

  test('groups segments into blocks', () {
    final blocks = TimelineBlock.fromSegments([
      {
        'start_time': '2026-05-24T08:00:00Z',
        'end_time': '2026-05-24T08:05:00Z',
        'duration_seconds': 300,
      },
      {
        'start_time': '2026-05-24T08:05:10Z',
        'end_time': '2026-05-24T08:10:00Z',
        'duration_seconds': 290,
      },
    ]);
    expect(blocks, hasLength(1));
  });
}
