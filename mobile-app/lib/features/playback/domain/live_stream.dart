/// Signed live HLS session (URL kept in memory only — never log [playbackUrl]).
class LiveStream {
  LiveStream({
    required this.playbackUrl,
    required this.cameraId,
    required this.cameraName,
    required this.schoolName,
    required this.classroomName,
    required this.quality,
    required this.delaySeconds,
    this.expiresAt,
    this.type,
  });

  final String playbackUrl;
  final String cameraId;
  final String cameraName;
  final String schoolName;
  final String classroomName;
  final String quality;
  final int delaySeconds;
  final DateTime? expiresAt;
  final String? type;

  factory LiveStream.fromJson(Map<String, dynamic> json) {
    final url = _extractPlaybackUrl(json);
    if (url == null || url.isEmpty) {
      throw const FormatException('missing_playback_url');
    }

    final cameraMap = json['camera'];
    final schoolMap = json['school'];
    final classroomMap = json['classroom'];

    return LiveStream(
      playbackUrl: url,
      cameraId: _string(json['camera_id']) ??
          _stringFromMap(cameraMap, 'id') ??
          '',
      cameraName: _string(json['camera_name']) ??
          _stringFromMap(cameraMap, 'name') ??
          '',
      schoolName: _string(json['school_name']) ??
          _stringFromMap(schoolMap, 'name') ??
          '',
      classroomName: _string(json['classroom_name']) ??
          _stringFromMap(classroomMap, 'name') ??
          '',
      quality: _string(json['quality']) ?? '',
      delaySeconds: _int(json['delay_seconds']) ?? 30,
      expiresAt: _parseTime(_string(json['expires_at'])),
      type: _string(json['type']),
    );
  }

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
      if (value != null && value.isNotEmpty) return value;
    }
    return null;
  }

  static String? _string(dynamic value) {
    if (value is String && value.trim().isNotEmpty) return value.trim();
    return null;
  }

  static String? _stringFromMap(dynamic map, String key) {
    if (map is Map<String, dynamic>) return _string(map[key]);
    if (map is Map) return _string(map[key]);
    return null;
  }

  static int? _int(dynamic value) {
    if (value is int) return value;
    if (value is num) return value.toInt();
    if (value is String) return int.tryParse(value);
    return null;
  }

  static DateTime? _parseTime(String? raw) {
    if (raw == null || raw.isEmpty) return null;
    return DateTime.tryParse(raw)?.toLocal();
  }

  @override
  String toString() =>
      'LiveStream(cameraId: $cameraId, quality: $quality, delaySeconds: $delaySeconds)';
}
