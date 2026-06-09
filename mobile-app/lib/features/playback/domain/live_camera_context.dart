/// Optional camera metadata passed from list screens into the live player.
class LiveCameraContext {
  const LiveCameraContext({
    required this.cameraId,
    this.cameraName,
    this.schoolName,
    this.classroomName,
    this.childName,
  });

  final String cameraId;
  final String? cameraName;
  final String? schoolName;
  final String? classroomName;
  final String? childName;

  LiveCameraContext mergeFromStream({
    String? cameraName,
    String? schoolName,
    String? classroomName,
    String? childName,
  }) {
    return LiveCameraContext(
      cameraId: cameraId,
      cameraName: cameraName ?? this.cameraName,
      schoolName: schoolName ?? this.schoolName,
      classroomName: classroomName ?? this.classroomName,
      childName: childName ?? this.childName,
    );
  }
}
