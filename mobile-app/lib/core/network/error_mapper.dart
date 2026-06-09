import 'package:dio/dio.dart';
import 'package:school_camera/core/network/api_error.dart';

const _backendCodeMessages = <String, AppErrorCode>{
  'LIVE_OUTSIDE_SCHOOL_HOURS': AppErrorCode.liveOutsideSchoolHours,
  'SUBSCRIPTION_REQUIRED': AppErrorCode.subscriptionRequired,
  'CAMERA_OFFLINE': AppErrorCode.cameraOffline,
  'NO_RECENT_SEGMENT': AppErrorCode.noRecentSegment,
  'RECORDING_NOT_FOUND': AppErrorCode.recordingNotFound,
  'PLAYBACK_NOT_FOUND': AppErrorCode.recordingNotFound,
  'NO_RECORDING': AppErrorCode.recordingNotFound,
  'ACCESS_DENIED': AppErrorCode.accessDenied,
  'DEVICE_BLOCKED': AppErrorCode.deviceBlocked,
};

const _parentMessages = <AppErrorCode, String>{
  AppErrorCode.liveOutsideSchoolHours:
      'Live viewing is available during school hours.',
  AppErrorCode.subscriptionRequired: 'Your subscription needs renewal.',
  AppErrorCode.cameraOffline: 'Camera is temporarily unavailable.',
  AppErrorCode.noRecentSegment:
      'Live video is not ready yet. Please try again shortly.',
  AppErrorCode.recordingNotFound:
      'No recording is available for this time.',
  AppErrorCode.accessDenied: 'You do not have access to this camera.',
  AppErrorCode.deviceBlocked: 'This device is not allowed.',
  AppErrorCode.network: 'Check your internet connection.',
  AppErrorCode.unauthorized: 'Please log in again.',
  AppErrorCode.server: 'Something went wrong. Please try again.',
  AppErrorCode.validation: 'Please check your input and try again.',
  AppErrorCode.unknown: 'Something went wrong. Please try again.',
};

/// Maps any thrown object (especially [DioException]) to [AppError].
AppError mapDioError(Object error) {
  if (error is AppError) return error;

  if (error is DioException) {
    return _mapDioException(error);
  }

  return AppError(
    code: AppErrorCode.unknown,
    message: _parentMessages[AppErrorCode.unknown]!,
    originalError: error,
  );
}

AppError _mapDioException(DioException error) {
  final statusCode = error.response?.statusCode;
  final body = error.response?.data;

  if (_isNetworkIssue(error)) {
    return AppError(
      code: AppErrorCode.network,
      message: _parentMessages[AppErrorCode.network]!,
      statusCode: statusCode,
      originalError: error,
    );
  }

  final backendCode = _extractBackendCode(body);
  if (backendCode != null) {
    final mapped = _backendCodeMessages[backendCode];
    if (mapped != null) {
      return AppError(
        code: mapped,
        message: _parentMessages[mapped]!,
        statusCode: statusCode,
        originalError: error,
      );
    }
  }

  if (statusCode == 401) {
    return AppError(
      code: AppErrorCode.unauthorized,
      message: _parentMessages[AppErrorCode.unauthorized]!,
      statusCode: statusCode,
      originalError: error,
    );
  }

  if (statusCode == 403) {
    return AppError(
      code: AppErrorCode.accessDenied,
      message: 'You do not have permission to do this.',
      statusCode: statusCode,
      originalError: error,
    );
  }

  if (statusCode == 404) {
    final path = error.requestOptions.path;
    final isRecording =
        path.contains('/playback') || path.contains('/timeline');
    return AppError(
      code: isRecording
          ? AppErrorCode.recordingNotFound
          : AppErrorCode.unknown,
      message: isRecording
          ? _parentMessages[AppErrorCode.recordingNotFound]!
          : 'This item was not found.',
      statusCode: statusCode,
      originalError: error,
    );
  }

  if (statusCode == 429) {
    return AppError(
      code: AppErrorCode.validation,
      message: 'Too many requests. Please try again soon.',
      statusCode: statusCode,
      originalError: error,
    );
  }

  if (statusCode == 502 || statusCode == 503 || statusCode == 504) {
    return AppError(
      code: AppErrorCode.server,
      message:
          'The school server is temporarily unavailable. Please try again in a few minutes.',
      statusCode: statusCode,
      originalError: error,
    );
  }

  if (statusCode != null && statusCode >= 500) {
    return AppError(
      code: AppErrorCode.server,
      message: _parentMessages[AppErrorCode.server]!,
      statusCode: statusCode,
      originalError: error,
    );
  }

  if (statusCode != null && statusCode >= 400) {
    return AppError(
      code: AppErrorCode.validation,
      message: _parentMessages[AppErrorCode.validation]!,
      statusCode: statusCode,
      originalError: error,
    );
  }

  return AppError(
    code: AppErrorCode.unknown,
    message: _parentMessages[AppErrorCode.unknown]!,
    statusCode: statusCode,
    originalError: error,
  );
}

bool _isNetworkIssue(DioException error) {
  final code = error.response?.statusCode;
  if (code == 502 || code == 503 || code == 504) {
    return false;
  }
  return error.type == DioExceptionType.connectionTimeout ||
      error.type == DioExceptionType.sendTimeout ||
      error.type == DioExceptionType.receiveTimeout ||
      error.type == DioExceptionType.connectionError ||
      (error.type == DioExceptionType.unknown && code == null);
}

String? _extractBackendCode(dynamic body) {
  if (body is! Map) return null;

  final topCode = body['code'];
  if (topCode is String && topCode.isNotEmpty) return topCode.toUpperCase();

  final errorField = body['error'];
  if (errorField is String && errorField.isNotEmpty) {
    return errorField.toUpperCase().replaceAll(' ', '_');
  }

  if (errorField is Map) {
    final nested = errorField['code'];
    if (nested is String && nested.isNotEmpty) return nested.toUpperCase();
  }

  return null;
}
