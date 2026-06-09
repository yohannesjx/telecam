class TimelineCameraContext {
  const TimelineCameraContext({
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
}
