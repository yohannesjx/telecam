class ParentCamera {
  const ParentCamera({
    required this.cameraId,
    required this.cameraName,
    required this.schoolName,
    required this.classroomName,
    required this.defaultQuality,
    required this.status,
    this.linkedChildName,
  });

  final String cameraId;
  final String cameraName;
  final String schoolName;
  final String classroomName;
  final String defaultQuality;
  final String status;
  final String? linkedChildName;

  factory ParentCamera.fromJson(Map<String, dynamic> json) {
    return ParentCamera(
      cameraId: json['camera_id'] as String,
      cameraName: json['camera_name'] as String,
      schoolName: json['school_name'] as String? ?? '',
      classroomName: json['classroom_name'] as String? ?? '',
      defaultQuality: json['default_quality'] as String? ?? '',
      status: json['status'] as String? ?? '',
      linkedChildName: json['linked_child_name'] as String?,
    );
  }

  static List<ParentCamera> listFromJson(dynamic raw) {
    if (raw is! List) return [];
    return raw
        .whereType<Map>()
        .map((e) => ParentCamera.fromJson(Map<String, dynamic>.from(e)))
        .toList();
  }
}
