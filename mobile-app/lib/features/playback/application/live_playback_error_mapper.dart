import 'package:school_camera/core/network/api_error.dart';
import 'package:school_camera/core/network/error_mapper.dart';

const _errorStringToCode = <String, AppErrorCode>{
  'SUBSCRIPTION_REQUIRED': AppErrorCode.subscriptionRequired,
  'SUBSCRIPTION_INACTIVE_OR_EXPIRED': AppErrorCode.subscriptionRequired,
  'DEVICE_BLOCKED': AppErrorCode.deviceBlocked,
  'DEVICE_DISABLED': AppErrorCode.deviceBlocked,
  'CAMERA_OFFLINE': AppErrorCode.cameraOffline,
  'CAMERA_NOT_ACTIVE': AppErrorCode.cameraOffline,
  'NO_RECENT_SEGMENT': AppErrorCode.noRecentSegment,
  'LIVE_PLAYLIST_NOT_AVAILABLE': AppErrorCode.noRecentSegment,
};

const _liveMessages = <AppErrorCode, String>{
  AppErrorCode.noRecentSegment:
      'Live video is not ready yet. Please try again shortly.',
  AppErrorCode.accessDenied: 'You do not have access to this camera.',
};

/// Maps live playback API failures to parent-friendly [AppError] messages.
AppError mapLivePlaybackError(Object error) {
  final base = error is AppError ? error : mapDioError(error);

  if (base.code == AppErrorCode.accessDenied && base.statusCode == 403) {
    return AppError(
      code: AppErrorCode.accessDenied,
      message: _liveMessages[AppErrorCode.accessDenied]!,
      statusCode: base.statusCode,
      originalError: base.originalError,
    );
  }

  if (_liveMessages.containsKey(base.code)) {
    return AppError(
      code: base.code,
      message: _liveMessages[base.code]!,
      statusCode: base.statusCode,
      originalError: base.originalError,
    );
  }

  return base;
}

/// Attempts to refine [AppError] using backend `code` or error text hints.
AppError refineLiveErrorFromBody(AppError error, dynamic body) {
  final code = _extractCodeFromBody(body);
  if (code != null) {
    final mapped = _errorStringToCode[code];
    if (mapped != null) {
      return AppError(
        code: mapped,
        message: _messageForCode(mapped),
        statusCode: error.statusCode,
        originalError: error.originalError,
      );
    }
  }

  final hint = _extractErrorHint(body);
  if (hint != null) {
    for (final entry in _errorStringToCode.entries) {
      if (hint.contains(entry.key.toLowerCase()) ||
          hint.contains(entry.key.replaceAll('_', ' '))) {
        return AppError(
          code: entry.value,
          message: _messageForCode(entry.value),
          statusCode: error.statusCode,
          originalError: error.originalError,
        );
      }
    }
    if (hint.contains('subscription')) {
      return AppError(
        code: AppErrorCode.subscriptionRequired,
        message: _messageForCode(AppErrorCode.subscriptionRequired),
        statusCode: error.statusCode,
        originalError: error.originalError,
      );
    }
    if (hint.contains('device') && hint.contains('block')) {
      return AppError(
        code: AppErrorCode.deviceBlocked,
        message: _messageForCode(AppErrorCode.deviceBlocked),
        statusCode: error.statusCode,
        originalError: error.originalError,
      );
    }
  }

  return error;
}

String _messageForCode(AppErrorCode code) {
  if (_liveMessages.containsKey(code)) return _liveMessages[code]!;
  const fallback = <AppErrorCode, String>{
    AppErrorCode.liveOutsideSchoolHours:
        'Live viewing is available during school hours.',
    AppErrorCode.subscriptionRequired: 'Your subscription needs renewal.',
    AppErrorCode.cameraOffline: 'Camera is temporarily unavailable.',
    AppErrorCode.deviceBlocked: 'This device is not allowed.',
    AppErrorCode.unauthorized: 'Please log in again.',
    AppErrorCode.network: 'Check your internet connection.',
    AppErrorCode.validation: 'Too many requests. Please try again soon.',
    AppErrorCode.unknown: 'Something went wrong. Please try again.',
  };
  return fallback[code] ?? fallback[AppErrorCode.unknown]!;
}

String? _extractCodeFromBody(dynamic body) {
  if (body is! Map) return null;
  final code = body['code'];
  if (code is String && code.isNotEmpty) return code.toUpperCase();
  return null;
}

String? _extractErrorHint(dynamic body) {
  if (body is! Map) return null;
  final err = body['error'];
  if (err is String) return err.toLowerCase();
  if (err is Map && err['code'] is String) return err['code'].toString().toLowerCase();
  final data = body['data'];
  if (data is Map && data['denial_reason'] is String) {
    return data['denial_reason'].toString().toLowerCase();
  }
  return null;
}
