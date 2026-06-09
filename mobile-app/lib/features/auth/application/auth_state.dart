import 'package:school_camera/core/network/api_error.dart';
import 'package:school_camera/features/auth/data/models/auth_user.dart';

/// High-level authentication status for routing and UI.
enum AuthStatus {
  initial,
  loading,
  authenticated,
  unauthenticated,
  error,
}

class AuthState {
  const AuthState({
    this.status = AuthStatus.initial,
    this.user,
    this.accessToken,
    this.refreshToken,
    this.error,
  });

  final AuthStatus status;
  final AuthUser? user;
  final String? accessToken;
  final String? refreshToken;
  final AppError? error;

  bool get isLoading => status == AuthStatus.loading;

  bool get isAuthenticated =>
      status == AuthStatus.authenticated && user != null && accessToken != null;

  AuthState copyWith({
    AuthStatus? status,
    AuthUser? user,
    String? accessToken,
    String? refreshToken,
    AppError? error,
    bool clearError = false,
    bool clearUser = false,
  }) {
    return AuthState(
      status: status ?? this.status,
      user: clearUser ? null : (user ?? this.user),
      accessToken: clearUser ? null : (accessToken ?? this.accessToken),
      refreshToken: clearUser ? null : (refreshToken ?? this.refreshToken),
      error: clearError ? null : (error ?? this.error),
    );
  }

  static const initial = AuthState();
}
