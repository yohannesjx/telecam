import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:school_camera/features/auth/application/auth_controller.dart';
import 'package:school_camera/features/auth/application/auth_providers.dart';
import 'package:school_camera/features/auth/application/auth_state.dart';
import 'package:school_camera/features/auth/presentation/login_page.dart';

void main() {
  testWidgets('LoginPage renders parent login UI', (tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authControllerProvider.overrideWith(
            (ref) => _IdleAuthController(ref),
          ),
        ],
        child: const MaterialApp(home: LoginPage()),
      ),
    );

    expect(find.text('Parent Login'), findsOneWidget);
    expect(find.text('Sign in'), findsOneWidget);
    expect(find.textContaining('Secure access for parents'), findsOneWidget);
  });
}

class _IdleAuthController extends AuthController {
  _IdleAuthController(Ref ref)
      : super(
          repository: ref.read(authRepositoryProvider),
          deviceName: ref.read(deviceInfoServiceProvider).getDeviceName,
          deviceFingerprint:
              ref.read(deviceInfoServiceProvider).getOrCreateDeviceFingerprint,
        ) {
    state = const AuthState(status: AuthStatus.unauthenticated);
  }
}
