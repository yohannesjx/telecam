import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:school_camera/core/network/api_error.dart';
import 'package:school_camera/core/network/error_mapper.dart';
import 'package:school_camera/features/auth/application/auth_state.dart';
import 'package:school_camera/features/auth/data/auth_repository.dart';
import 'package:school_camera/features/auth/data/models/auth_user.dart';

enum ChangePasswordResult {
  success,
  sessionEnded,
  failed,
}

class AuthController extends StateNotifier<AuthState> {
  AuthController({
    required AuthRepository repository,
    required Future<String> Function() deviceName,
    required Future<String> Function() deviceFingerprint,
  })  : _repository = repository,
        _deviceName = deviceName,
        _deviceFingerprint = deviceFingerprint,
        super(AuthState.initial);

  final AuthRepository _repository;
  final Future<String> Function() _deviceName;
  final Future<String> Function() _deviceFingerprint;

  Future<void> restoreSession() async {
    state = state.copyWith(status: AuthStatus.loading, clearError: true);

    try {
      final session = await _repository
          .restoreSession()
          .timeout(const Duration(seconds: 20), onTimeout: () => null);
      if (session == null) {
        state = const AuthState(status: AuthStatus.unauthenticated);
        return;
      }

      state = AuthState(
        status: AuthStatus.authenticated,
        user: session.user,
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
      );
    } on AppError catch (e) {
      await _repository.clearSession();
      state = AuthState(status: AuthStatus.unauthenticated, error: e);
    } catch (e) {
      await _repository.clearSession();
      state = AuthState(
        status: AuthStatus.unauthenticated,
        error: mapDioError(e),
      );
    }
  }

  Future<void> login(String email, String password) async {
    state = state.copyWith(status: AuthStatus.loading, clearError: true);

    try {
      final session = await _repository.login(
        email: email,
        password: password,
        deviceName: await _deviceName(),
        deviceFingerprint: await _deviceFingerprint(),
      );

      state = AuthState(
        status: AuthStatus.authenticated,
        user: session.user,
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
      );
    } on AppError catch (e) {
      state = AuthState(status: AuthStatus.error, error: e);
    } catch (e) {
      state = AuthState(status: AuthStatus.error, error: mapDioError(e));
    }
  }

  Future<void> logout() async {
    state = state.copyWith(status: AuthStatus.loading, clearError: true);

    await _repository.logout(
      refreshToken: state.refreshToken,
      accessToken: state.accessToken,
    );

    state = const AuthState(status: AuthStatus.unauthenticated);
  }

  Future<String?> refreshSession() async {
    final refresh = state.refreshToken ?? await _repository.readRefreshToken();
    if (refresh == null || refresh.isEmpty) {
      await forceLogout();
      return null;
    }

    try {
      final session = await _repository.refreshSession(refresh);
      state = AuthState(
        status: AuthStatus.authenticated,
        user: session.user,
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
      );
      return session.accessToken;
    } on AppError {
      await forceLogout();
      return null;
    } catch (_) {
      await forceLogout();
      return null;
    }
  }

  Future<void> forceLogout() async {
    await _repository.clearSession();
    state = const AuthState(status: AuthStatus.unauthenticated);
  }

  Future<ChangePasswordResult> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    final token = state.accessToken;
    if (token == null || token.isEmpty) {
      return ChangePasswordResult.failed;
    }

    try {
      final user = await _repository.changePassword(
        accessToken: token,
        currentPassword: currentPassword,
        newPassword: newPassword,
      );

      state = state.copyWith(user: user);
      return ChangePasswordResult.success;
    } on AppError catch (e) {
      if (e.code == AppErrorCode.unauthorized) {
        await forceLogout();
        return ChangePasswordResult.sessionEnded;
      }
      rethrow;
    }
  }

  Future<void> refreshProfile() async {
    final token = state.accessToken;
    if (token == null || !state.isAuthenticated) return;

    try {
      final user = await _repository.fetchCurrentUser(token);
      if (!user.isActive || !user.isParent) {
        await forceLogout();
        return;
      }
      state = state.copyWith(user: user);
    } on AppError {
      await forceLogout();
    } catch (_) {
      // Keep cached profile on transient errors.
    }
  }

  void updateUser(AuthUser user) {
    if (!state.isAuthenticated) return;
    state = state.copyWith(user: user);
  }

  void clearError() {
    if (state.error == null) return;
    state = state.copyWith(
      status: state.isAuthenticated
          ? AuthStatus.authenticated
          : AuthStatus.unauthenticated,
      clearError: true,
    );
  }
}
