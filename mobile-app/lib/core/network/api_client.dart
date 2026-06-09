import 'package:dio/dio.dart';
import 'package:school_camera/core/network/api_error.dart';
import 'package:school_camera/core/network/api_helpers.dart';
import 'package:school_camera/core/network/api_result.dart';
import 'package:school_camera/core/network/error_mapper.dart';

/// HTTP client wrapper around Dio with consistent error handling.
class ApiClient {
  ApiClient(this._dio);

  final Dio _dio;

  Future<Response<T>> get<T>(
    String path, {
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    return _request(() => _dio.get<T>(
          path,
          queryParameters: queryParameters,
          options: options,
        ));
  }

  Future<Response<T>> post<T>(
    String path, {
    Object? data,
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    return _request(() => _dio.post<T>(
          path,
          data: data,
          queryParameters: queryParameters,
          options: options,
        ));
  }

  Future<Response<T>> patch<T>(
    String path, {
    Object? data,
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    return _request(() => _dio.patch<T>(
          path,
          data: data,
          queryParameters: queryParameters,
          options: options,
        ));
  }

  Future<Response<T>> delete<T>(
    String path, {
    Object? data,
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    return _request(() => _dio.delete<T>(
          path,
          data: data,
          queryParameters: queryParameters,
          options: options,
        ));
  }

  /// Converts Dio failures to [AppError] for callers that prefer exceptions.
  Future<Response<T>> _request<T>(
    Future<Response<T>> Function() call,
  ) async {
    try {
      return await call();
    } catch (error) {
      throw mapDioError(error);
    }
  }

  /// Safe wrapper returning [ApiResult] instead of throwing.
  Future<ApiResult<T>> getSafe<T>(
    String path, {
    Map<String, dynamic>? queryParameters,
    T Function(dynamic json)? parser,
  }) async {
    try {
      final response = await get<dynamic>(path, queryParameters: queryParameters);
      _ensureSuccess(response);
      final unwrapped = unwrapApiData(response.data);
      final data = parser != null ? parser(unwrapped) : unwrapped as T;
      return ApiSuccess<T>(data);
    } catch (error) {
      final appError = mapParentApiError(
        error is AppError ? error : mapDioError(error),
      );
      return ApiFailure<T>(appError);
    }
  }

  void _ensureSuccess(Response<dynamic> response) {
    final code = response.statusCode ?? 0;
    if (code >= 200 && code < 300) return;
    throw DioException(
      requestOptions: response.requestOptions,
      response: response,
      type: DioExceptionType.badResponse,
    );
  }
}
