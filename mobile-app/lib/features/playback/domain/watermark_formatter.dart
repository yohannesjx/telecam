import 'package:intl/intl.dart';

/// Builds parent-facing watermark lines (no signed URLs).
class WatermarkFormatter {
  static final DateFormat _timestamp = DateFormat('yyyy-MM-dd HH:mm');

  /// Top line: parent identity and current time.
  static String parentLine({
    required String parentLabel,
    DateTime? at,
  }) {
    final time = _timestamp.format((at ?? DateTime.now()).toLocal());
    return '$parentLabel • $time';
  }

  /// Bottom detail: child, classroom, camera.
  static String detailLine({
    String? childName,
    String? classroomName,
    String? cameraName,
    String? recordingRange,
  }) {
    final parts = <String>[
      if (childName != null && childName.isNotEmpty) childName,
      if (classroomName != null && classroomName.isNotEmpty) classroomName,
      if (cameraName != null && cameraName.isNotEmpty) cameraName,
      if (recordingRange != null && recordingRange.isNotEmpty)
        'Recording $recordingRange',
    ];
    return parts.join(' • ');
  }
}
