class Child {
  const Child({
    required this.id,
    required this.fullName,
    required this.status,
    required this.schoolId,
    required this.schoolName,
    this.classroomId,
    this.classroomName,
  });

  final String id;
  final String fullName;
  final String status;
  final String schoolId;
  final String schoolName;
  final String? classroomId;
  final String? classroomName;

  factory Child.fromJson(Map<String, dynamic> json) {
    return Child(
      id: json['id'] as String,
      fullName: json['full_name'] as String,
      status: json['status'] as String? ?? 'UNKNOWN',
      schoolId: json['school_id'] as String,
      schoolName: json['school_name'] as String? ?? '',
      classroomId: json['classroom_id'] as String?,
      classroomName: json['classroom_name'] as String?,
    );
  }

  static List<Child> listFromJson(dynamic raw) {
    if (raw is! List) return [];
    return raw
        .whereType<Map>()
        .map((e) => Child.fromJson(Map<String, dynamic>.from(e)))
        .toList();
  }
}
