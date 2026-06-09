import 'package:school_camera/core/network/api_error.dart';

/// Result wrapper for repository / API calls.
sealed class ApiResult<T> {
  const ApiResult();
}

class ApiSuccess<T> extends ApiResult<T> {
  final T data;

  const ApiSuccess(this.data);
}

class ApiFailure<T> extends ApiResult<T> {
  final AppError error;

  const ApiFailure(this.error);
}
