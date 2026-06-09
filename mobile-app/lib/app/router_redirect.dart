import 'package:school_camera/app/router.dart';
import 'package:school_camera/features/auth/application/auth_state.dart';
import 'package:school_camera/features/security/application/security_state.dart';

/// Central redirect rules for [GoRouter] (also used in tests).
String? resolveAppRedirect({
  required AuthState auth,
  required SecurityState security,
  required String location,
}) {
  final isSplash = location == AppRoutes.splash;
  final isLogin = location == AppRoutes.login;
  final isLocked = location == AppRoutes.locked;
  final restoringSession =
      auth.status == AuthStatus.initial || (auth.isLoading && isSplash);

  if (restoringSession) {
    return isSplash ? null : AppRoutes.splash;
  }

  if (auth.isLoading) {
    return isSplash ? null : AppRoutes.splash;
  }

  if (auth.isAuthenticated) {
    final user = auth.user;
    if (user != null && !user.isActive) {
      return isLogin ? null : AppRoutes.login;
    }

    if (security.requiresUnlock) {
      return isLocked ? null : AppRoutes.locked;
    }

    if (isLocked) return AppRoutes.home;
    if (isLogin || isSplash) return AppRoutes.home;
    return null;
  }

  if (isLogin) return null;
  return AppRoutes.login;
}
