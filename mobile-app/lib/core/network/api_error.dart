/// Machine-readable error categories for parent-friendly handling.
enum AppErrorCode {
  liveOutsideSchoolHours,
  subscriptionRequired,
  cameraOffline,
  noRecentSegment,
  recordingNotFound,
  accessDenied,
  deviceBlocked,
  network,
  unauthorized,
  server,
  validation,
  unknown,
}

/// Domain error surfaced to the UI layer.
class AppError {
  final AppErrorCode code;
  final String message;
  final int? statusCode;
  final Object? originalError;

  const AppError({
    required this.code,
    required this.message,
    this.statusCode,
    this.originalError,
  });

  @override
  String toString() => 'AppError($code, $message, status: $statusCode)';
}
