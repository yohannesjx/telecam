import 'package:school_camera/core/config/environment.dart';
import 'package:school_camera/core/network/api_error.dart';

const String apiBaseUrlMisconfiguredMessage =
    'The app API address is misconfigured. It must end with /api '
    '(for example https://camera.iglooks.com/api).';

/// Ensures a stable Dio base URL (trailing slash).
String normalizeApiBaseUrl(String url) {
  var trimmed = url.trim();
  if (trimmed.isEmpty) return defaultApiBaseUrl;

  final uri = Uri.tryParse(trimmed);
  if (uri != null && uri.hasScheme) {
    final host = uri.host.toLowerCase();
    if ((host == 'camera.iglooks.com') &&
        (uri.path.isEmpty || uri.path == '/')) {
      trimmed = '${uri.origin}/api';
    }
  }

  if (!trimmed.endsWith('/')) {
    trimmed = '$trimmed/';
  }
  return trimmed;
}

/// Coerces dynamic JSON maps from Dio into `Map<String, dynamic>`.
Map<String, dynamic>? asStringKeyMap(dynamic value) {
  if (value is Map<String, dynamic>) return value;
  if (value is Map) {
    return value.map(
      (key, val) => MapEntry(key.toString(), _coerceJsonValue(val)),
    );
  }
  return null;
}

dynamic _coerceJsonValue(dynamic value) {
  if (value is Map) return asStringKeyMap(value);
  if (value is List) {
    return value.map(_coerceJsonValue).toList();
  }
  return value;
}

/// Parses auth JSON or throws a parent-friendly [AppError].
Map<String, dynamic> parseAuthResponseBody(dynamic data, {int? statusCode}) {
  if (data is String) {
    final trimmed = data.trim();
    if (trimmed.contains('school-camera-api')) {
      throw AppError(
        code: AppErrorCode.validation,
        message: apiBaseUrlMisconfiguredMessage,
        statusCode: statusCode,
      );
    }
    throw AppError(
      code: AppErrorCode.server,
      message: 'Unexpected server response. Please try again.',
      statusCode: statusCode,
    );
  }

  final map = asStringKeyMap(data);
  if (map == null) {
    throw AppError(
      code: AppErrorCode.server,
      message: 'Unexpected server response. Please try again.',
      statusCode: statusCode,
    );
  }
  return map;
}

/// Unwraps `{ "data": ... }` API envelope.
dynamic unwrapApiData(dynamic raw) {
  if (raw is Map<String, dynamic> && raw.containsKey('data')) {
    return raw['data'];
  }
  if (raw is Map && raw.containsKey('data')) {
    return raw['data'];
  }
  return raw;
}

/// Maps API failures to parent-friendly copy for parent endpoints.
AppError mapParentApiError(AppError error) {
  if (error.statusCode == 403 || error.code == AppErrorCode.accessDenied) {
    return AppError(
      code: AppErrorCode.accessDenied,
      message: 'You do not have access to this information.',
      statusCode: error.statusCode,
    );
  }
  return error;
}
