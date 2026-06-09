import 'package:intl/intl.dart';

class TimelineBlock {
  const TimelineBlock({
    required this.start,
    required this.end,
    required this.durationSeconds,
    this.segmentCount,
    this.hasGaps = false,
    this.quality,
  });

  final DateTime start;
  final DateTime end;
  final int durationSeconds;
  final int? segmentCount;
  final bool hasGaps;
  final String? quality;

  String formatTimeRange() {
    final fmt = DateFormat('HH:mm');
    return '${fmt.format(start.toLocal())} – ${fmt.format(end.toLocal())}';
  }

  String formatDurationLabel() {
    final minutes = (durationSeconds / 60).round();
    if (minutes < 60) return '$minutes min available';
    final h = minutes ~/ 60;
    final m = minutes % 60;
    if (m == 0) return '$h h available';
    return '$h h $m min available';
  }

  factory TimelineBlock.fromJson(Map<String, dynamic> json) {
    final start = _parseTime(json['start'] ?? json['start_time']);
    final end = _parseTime(json['end'] ?? json['end_time']);
    if (start == null || end == null) {
      throw const FormatException('timeline_block_missing_times');
    }
    var duration = _int(json['duration_seconds']) ?? end.difference(start).inSeconds;
    if (duration < 0) duration = 0;

    return TimelineBlock(
      start: start,
      end: end,
      durationSeconds: duration,
      segmentCount: _int(json['segment_count']),
      hasGaps: json['has_gaps'] == true,
      quality: _string(json['quality']),
    );
  }

  static List<TimelineBlock> listFromJson(dynamic raw) {
    if (raw is! List) return [];
    return raw
        .whereType<Map>()
        .map((e) => TimelineBlock.fromJson(Map<String, dynamic>.from(e)))
        .toList();
  }

  /// Groups raw segments into blocks when backend only returns segments.
  static List<TimelineBlock> fromSegments(List<Map<String, dynamic>> segments) {
    if (segments.isEmpty) return [];
    final parsed = <({DateTime start, DateTime end, int duration})>[];
    for (final seg in segments) {
      final start = _parseTime(seg['start'] ?? seg['start_time']);
      final end = _parseTime(seg['end'] ?? seg['end_time']);
      if (start == null || end == null) continue;
      parsed.add((
        start: start,
        end: end,
        duration: _int(seg['duration_seconds']) ?? end.difference(start).inSeconds,
      ));
    }
    if (parsed.isEmpty) return [];

    parsed.sort((a, b) => a.start.compareTo(b.start));
    const gapThreshold = Duration(seconds: 30);
    final blocks = <TimelineBlock>[];
    var curStart = parsed.first.start;
    var curEnd = parsed.first.end;
    var curDuration = parsed.first.duration;
    var count = 1;

    for (var i = 1; i < parsed.length; i++) {
      final seg = parsed[i];
      if (seg.start.difference(curEnd) <= gapThreshold) {
        curEnd = seg.end.isAfter(curEnd) ? seg.end : curEnd;
        curDuration += seg.duration;
        count++;
      } else {
        blocks.add(TimelineBlock(
          start: curStart,
          end: curEnd,
          durationSeconds: curDuration,
          segmentCount: count,
          hasGaps: true,
        ));
        curStart = seg.start;
        curEnd = seg.end;
        curDuration = seg.duration;
        count = 1;
      }
    }
    blocks.add(TimelineBlock(
      start: curStart,
      end: curEnd,
      durationSeconds: curDuration,
      segmentCount: count,
    ));
    return blocks;
  }

  static DateTime? _parseTime(dynamic value) {
    if (value is String && value.isNotEmpty) {
      return DateTime.tryParse(value);
    }
    return null;
  }

  static String? _string(dynamic value) {
    if (value is String && value.trim().isNotEmpty) return value.trim();
    return null;
  }

  static int? _int(dynamic value) {
    if (value is int) return value;
    if (value is num) return value.toInt();
    if (value is String) return int.tryParse(value);
    return null;
  }
}

class TimelineDayResult {
  const TimelineDayResult({
    required this.cameraId,
    required this.cameraName,
    required this.date,
    required this.blocks,
    this.timezone,
    this.quality,
  });

  final String cameraId;
  final String cameraName;
  final String date;
  final List<TimelineBlock> blocks;
  final String? timezone;
  final String? quality;

  factory TimelineDayResult.fromJson(Map<String, dynamic> json) {
    var blocks = TimelineBlock.listFromJson(
      json['blocks'] ?? json['timeline'] ?? json['items'],
    );
    if (blocks.isEmpty) {
      final segments = json['segments'];
      if (segments is List) {
        blocks = TimelineBlock.fromSegments(
          segments.whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList(),
        );
      }
    }

    return TimelineDayResult(
      cameraId: _string(json['camera_id']) ?? '',
      cameraName: _string(json['camera_name']) ?? '',
      date: _string(json['date']) ?? '',
      blocks: blocks,
      timezone: _string(json['timezone']),
      quality: _string(json['quality']),
    );
  }

  static String? _string(dynamic value) {
    if (value is String && value.trim().isNotEmpty) return value.trim();
    return null;
  }
}
