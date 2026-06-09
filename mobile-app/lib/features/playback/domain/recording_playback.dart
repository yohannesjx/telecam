/// Signed recording HLS session (URL in memory only — never log [playbackUrl]).
class RecordingPlayback {
  RecordingPlayback({
    required this.playbackUrl,
    required this.cameraId,
    required this.cameraName,
    required this.start,
    required this.end,
    required this.quality,
    this.expiresAt,
    this.hasGaps = false,
    this.warnings = const [],
  });

  final String playbackUrl;
  final String cameraId;
  final String cameraName;
  final DateTime start;
  final DateTime end;
  final String quality;
  final DateTime? expiresAt;
  final bool hasGaps;
  final List<String> warnings;

  factory RecordingPlayback.fromJson(Map<String, dynamic> json) {
    final url = _extractPlaybackUrl(json);
    if (url == null || url.isEmpty) {
      throw const FormatException('missing_playback_url');
    }
    final start = _parseTime(json['start']);
    final end = _parseTime(json['end']);
    if (start == null || end == null) {
      throw const FormatException('missing_playback_range');
    }

    final warningsRaw = json['warnings'];
    final warnings = warningsRaw is List
        ? warningsRaw.map((e) => e.toString()).where((s) => s.isNotEmpty).toList()
        : <String>[];

    return RecordingPlayback(
      playbackUrl: url,
      cameraId: _string(json['camera_id']) ?? '',
      cameraName: _string(json['camera_name']) ?? '',
      start: start,
      end: end,
      quality: _string(json['quality']) ?? 'sd_360p',
      expiresAt: _parseTime(json['expires_at']),
      hasGaps: json['has_gaps'] == true || warnings.isNotEmpty,
      warnings: warnings,
    );
  }

  @override
  String toString() =>
      'RecordingPlayback(cameraId: $cameraId, quality: $quality)';

  static String? _extractPlaybackUrl(Map<String, dynamic> json) {
    const keys = [
      'signed_hls_url',
      'url',
      'signed_url',
      'hls_url',
      'playlist_url',
      'playback_url',
    ];
    for (final key in keys) {
      final value = _string(json[key]);
      if (value != null) return value;
    }
    return null;
  }

  static String? _string(dynamic value) {
    if (value is String && value.trim().isNotEmpty) return value.trim();
    return null;
  }

  static DateTime? _parseTime(dynamic value) {
    if (value is String && value.isNotEmpty) return DateTime.tryParse(value);
    return null;
  }
}
