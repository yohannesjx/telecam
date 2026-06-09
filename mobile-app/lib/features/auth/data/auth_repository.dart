import 'package:flutter/services.dart';
import 'package:school_camera/core/network/api_error.dart';
import 'package:school_camera/core/network/api_helpers.dart';
import 'package:school_camera/core/network/error_mapper.dart';
import 'package:school_camera/features/auth/data/auth_api.dart';
import 'package:school_camera/features/auth/data/auth_storage.dart';
import 'package:school_camera/features/auth/data/models/auth_user.dart';
import 'package:school_camera/features/auth/data/models/login_response.dart';

/// Parent-only auth business rules and session persistence.
class AuthRepository {
  AuthRepository({
    required AuthApi api,
    required AuthStorage storage,
  })  : _api = api,
        _storage = storage;

  final AuthApi _api;
  final AuthStorage _storage;

  static const String parentOnlyMessage = 'This app is only for parent accounts.';
  static const String inactiveMessage =
      'Your account is not active. Please contact support.';
  static const String invalidLoginMessage = 'Invalid email or password.';

  bool isAllowedParent(AuthUser user) {
    return user.role.toUpperCase() == 'PARENT' && user.status.toUpperCase() == 'ACTIVE';
  }

  Future<AuthSession> login({
    required String email,
    required String password,
    required String deviceName,
    required String deviceFingerprint,
  }) async {
    try {
      final response = await _api.login(
        email: email,
        password: password,
        deviceName: deviceName,
        deviceFingerprint: deviceFingerprint,
      );

      var user = response.user;
      user ??= await _api.getMe(accessToken: response.tokens.accessToken);

      await _validateAndPersist(response, user);
      return AuthSession(
        accessToken: response.tokens.accessToken,
        refreshToken: response.tokens.refreshToken,
        user: user,
      );
    } on AppError catch (e) {
      throw _mapLoginError(e);
    } on PlatformException {
      throw const AppError(
        code: AppErrorCode.unknown,
        message:
            'Could not save your session on this device. Please try again.',
      );
    } catch (e) {
      throw _mapLoginError(mapDioError(e));
    }
  }

  Future<AuthSession> refreshSession(String refreshToken) async {
    try {
      final response = await _api.refresh(refreshToken: refreshToken);
      if (response.tokens.refreshToken.isEmpty || response.tokens.accessToken.isEmpty) {
        throw const AppError(
          code: AppErrorCode.unauthorized,
          message: 'Please log in again.',
        );
      }

      final user = await _api.getMe(accessToken: response.tokens.accessToken);
      await _validateAndPersist(response, user);

      return AuthSession(
        accessToken: response.tokens.accessToken,
        refreshToken: response.tokens.refreshToken,
        user: user,
      );
    } on AppError {
      await _storage.clearSession();
      rethrow;
    } catch (e) {
      await _storage.clearSession();
      throw mapDioError(e);
    }
  }

  Future<AuthSession?> restoreSession() async {
    final session = await _storage.readSession();
    if (session == null) return null;

    try {
      return await refreshSession(session.refreshToken);
    } catch (_) {
      await _storage.clearSession();
      return null;
    }
  }

  Future<AuthUser> changePassword({
    required String accessToken,
    required String currentPassword,
    required String newPassword,
  }) async {
    final user = await _api.changePassword(
      accessToken: accessToken,
      currentPassword: currentPassword,
      newPassword: newPassword,
    );

    if (!isAllowedParent(user)) {
      await _rejectInvalidUser(refreshToken: await _storage.readRefreshToken());
      if (user.role.toUpperCase() != 'PARENT') {
        throw _parentOnlyError();
      }
      throw _inactiveError();
    }

    final refresh = await _storage.readRefreshToken();
    if (refresh != null && accessToken.isNotEmpty) {
      await _storage.saveSession(
        accessToken: accessToken,
        refreshToken: refresh,
        user: user,
      );
    }

    return user;
  }

  Future<AuthUser> fetchCurrentUser(String accessToken) async {
    return getMe(accessToken);
  }

  Future<AuthUser> getMe(String accessToken) async {
    final user = await _api.getMe(accessToken: accessToken);
    if (!isAllowedParent(user)) {
      await _rejectInvalidUser(refreshToken: await _storage.readRefreshToken());
      throw _parentOnlyError();
    }
    return user;
  }

  Future<void> logout({String? refreshToken, String? accessToken}) async {
    final storedRefresh = refreshToken ?? await _storage.readRefreshToken();
    final storedAccess = accessToken ?? await _storage.readAccessToken();

    if (storedRefresh != null) {
      try {
        await _api.logout(
          refreshToken: storedRefresh,
          accessToken: storedAccess,
        );
      } catch (_) {
        // Always clear local session even if API fails.
      }
    }

    await _storage.clearSession();
  }

  Future<void> saveAccessToken(String token) => _storage.saveAccessToken(token);

  Future<String?> readAccessToken() => _storage.readAccessToken();

  Future<String?> readRefreshToken() => _storage.readRefreshToken();

  Future<void> clearSession() => _storage.clearSession();

  Future<void> _validateAndPersist(LoginResponse response, AuthUser user) async {
    if (!isAllowedParent(user)) {
      await _rejectInvalidUser(refreshToken: response.tokens.refreshToken);
      if (user.role.toUpperCase() != 'PARENT') {
        throw _parentOnlyError();
      }
      throw _inactiveError();
    }

    await _storage.saveSession(
      accessToken: response.tokens.accessToken,
      refreshToken: response.tokens.refreshToken,
      user: user,
    );
  }

  Future<void> _rejectInvalidUser({String? refreshToken}) async {
    if (refreshToken != null && refreshToken.isNotEmpty) {
      try {
        await _api.logout(refreshToken: refreshToken);
      } catch (_) {}
    }
    await _storage.clearSession();
  }

  AppError _parentOnlyError() => const AppError(
        code: AppErrorCode.accessDenied,
        message: parentOnlyMessage,
      );

  AppError _inactiveError() => const AppError(
        code: AppErrorCode.accessDenied,
        message: inactiveMessage,
      );

  AppError _mapLoginError(AppError error) {
    if (error.message == apiBaseUrlMisconfiguredMessage) {
      return error;
    }
    if (error.code == AppErrorCode.deviceBlocked) {
      return error;
    }
    if (error.code == AppErrorCode.unauthorized ||
        error.statusCode == 401) {
      return AppError(
        code: AppErrorCode.unauthorized,
        message: invalidLoginMessage,
        statusCode: error.statusCode,
      );
    }
    if (error.message == parentOnlyMessage || error.message == inactiveMessage) {
      return error;
    }
    return error;
  }
}
