import 'package:flutter_test/flutter_test.dart';
import 'package:school_camera/app/router.dart';
import 'package:school_camera/app/router_redirect.dart';
import 'package:school_camera/features/auth/application/auth_state.dart';
import 'package:school_camera/features/auth/data/models/auth_user.dart';
import 'package:school_camera/features/security/application/security_state.dart';

void main() {
  const activeUser = AuthUser(
    id: '1',
    email: 'p@example.com',
    role: 'PARENT',
    status: 'ACTIVE',
  );

  const authenticated = AuthState(
    status: AuthStatus.authenticated,
    accessToken: 't',
    user: activeUser,
  );

  test('unauthenticated on splash redirects to login', () {
    expect(
      resolveAppRedirect(
        auth: const AuthState(status: AuthStatus.unauthenticated),
        security: SecurityState.initial,
        location: AppRoutes.splash,
      ),
      AppRoutes.login,
    );
  });

  test('authenticated on splash redirects to home when unlocked', () {
    expect(
      resolveAppRedirect(
        auth: authenticated,
        security: const SecurityState(prefsLoaded: true, isUnlocked: true),
        location: AppRoutes.splash,
      ),
      AppRoutes.home,
    );
  });

  test('authenticated with biometric lock redirects to locked', () {
    expect(
      resolveAppRedirect(
        auth: authenticated,
        security: const SecurityState(
          prefsLoaded: true,
          biometricEnabled: true,
          biometricAvailable: true,
          isUnlocked: false,
        ),
        location: AppRoutes.home,
      ),
      AppRoutes.locked,
    );
  });

  test('unlocked user on locked route redirects to home', () {
    expect(
      resolveAppRedirect(
        auth: authenticated,
        security: const SecurityState(
          prefsLoaded: true,
          biometricEnabled: true,
          biometricAvailable: true,
          isUnlocked: true,
        ),
        location: AppRoutes.locked,
      ),
      AppRoutes.home,
    );
  });
}
