import 'package:dio/dio.dart';
import 'package:school_camera/core/constants/api_paths.dart';
import 'package:school_camera/core/network/api_error.dart';
import 'package:school_camera/core/network/api_helpers.dart';
import 'package:school_camera/core/network/error_mapper.dart';
import 'package:school_camera/features/auth/data/models/auth_user.dart';
import 'package:school_camera/features/auth/data/models/login_request.dart';
import 'package:school_camera/features/auth/data/models/login_response.dart';

/// Low-level auth HTTP calls.
class AuthApi {
  AuthApi(this._dio);

  final Dio _dio;

  Future<LoginResponse> login({
    required String email,
    required String password,
    required String deviceName,
    required String deviceFingerprint,
  }) async {
    return _postAuth(
      ApiPaths.authLogin,
      LoginRequest(
        email: email.trim(),
        password: password,
        deviceName: deviceName,
        deviceFingerprint: deviceFingerprint,
      ).toJson(),
    );
  }

  Future<LoginResponse> refresh({required String refreshToken}) async {
    return _postAuth(
      ApiPaths.authRefresh,
      {'refresh_token': refreshToken},
    );
  }

  Future<void> logout({
    required String refreshToken,
    String? accessToken,
  }) async {
    try {
      await _dio.post<void>(
        ApiPaths.authLogout,
        data: {'refresh_token': refreshToken},
        options: Options(
          headers: accessToken != null
              ? {'Authorization': 'Bearer $accessToken'}
              : null,
          extra: const {'skipAuth': true},
        ),
      );
    } on DioException catch (e) {
      // Logout is best-effort; still throw only for unexpected cases if needed.
      if (e.response?.statusCode == 401 || e.response?.statusCode == 403) {
        return;
      }
      throw mapDioError(e);
    } catch (e) {
      throw mapDioError(e);
    }
  }

  Future<AuthUser> changePassword({
    required String accessToken,
    required String currentPassword,
    required String newPassword,
  }) async {
    try {
      final response = await _dio.post<dynamic>(
        ApiPaths.authChangePassword,
        data: {
          'current_password': currentPassword,
          'new_password': newPassword,
        },
        options: Options(
          headers: {'Authorization': 'Bearer $accessToken'},
          extra: const {'skipAuth': true},
        ),
      );
      _ensureSuccess(response);
      final data = parseAuthResponseBody(
        response.data,
        statusCode: response.statusCode,
      );
      final userRaw = data['user'] ?? data;
      final userMap = asStringKeyMap(userRaw);
      if (userMap != null) {
        return AuthUser.fromJson(userMap);
      }
      throw DioException(
        requestOptions: response.requestOptions,
        message: 'Unexpected change password response',
      );
    } on AppError {
      rethrow;
    } on DioException catch (e) {
      throw mapDioError(e);
    } catch (e) {
      throw mapDioError(e);
    }
  }

  Future<AuthUser> getMe({required String accessToken}) async {
    try {
      final response = await _dio.get<dynamic>(
        ApiPaths.authMe,
        options: Options(
          headers: {'Authorization': 'Bearer $accessToken'},
          extra: const {'skipAuth': true},
        ),
      );
      _ensureSuccess(response);
      final data = parseAuthResponseBody(
        response.data,
        statusCode: response.statusCode,
      );
      final userRaw = data['user'] ?? data;
      final userMap = asStringKeyMap(userRaw);
      if (userMap != null) {
        return AuthUser.fromJson(userMap);
      }
      throw DioException(
        requestOptions: response.requestOptions,
        message: 'Unexpected profile response',
      );
    } on AppError {
      rethrow;
    } on DioException catch (e) {
      throw mapDioError(e);
    } catch (e) {
      throw mapDioError(e);
    }
  }

  Future<LoginResponse> _postAuth(String path, Map<String, dynamic> body) async {
    try {
      final response = await _dio.post<dynamic>(
        path,
        data: body,
        options: Options(extra: const {'skipAuth': true}),
      );
      _ensureSuccess(response);
      final data = parseAuthResponseBody(
        response.data,
        statusCode: response.statusCode,
      );
      return LoginResponse.fromJson(data);
    } on AppError {
      rethrow;
    } on DioException catch (e) {
      throw mapDioError(e);
    } catch (e) {
      throw mapDioError(e);
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
