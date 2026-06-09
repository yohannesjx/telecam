import 'package:school_camera/core/network/api_error.dart';
import 'package:school_camera/core/network/error_mapper.dart';

const _recordingMessages = <AppErrorCode, String>{
  AppErrorCode.recordingNotFound: 'No recording is available for this time.',
  AppErrorCode.accessDenied: 'You do not have access to this recording.',
  AppErrorCode.subscriptionRequired: 'Your subscription needs renewal.',
  AppErrorCode.deviceBlocked: 'This device is not allowed.',
  AppErrorCode.liveOutsideSchoolHours:
      'Something went wrong loading this recording. Please try again.',
};

AppError mapRecordingPlaybackError(Object error) {
  final base = error is AppError ? error : mapDioError(error);

  if (base.code == AppErrorCode.accessDenied && base.statusCode == 403) {
    return AppError(
      code: AppErrorCode.accessDenied,
      message: _recordingMessages[AppErrorCode.accessDenied]!,
      statusCode: base.statusCode,
      originalError: base.originalError,
    );
  }

  final message = _recordingMessages[base.code];
  if (message != null) {
    return AppError(
      code: base.code,
      message: message,
      statusCode: base.statusCode,
      originalError: base.originalError,
    );
  }

  return base;
}
