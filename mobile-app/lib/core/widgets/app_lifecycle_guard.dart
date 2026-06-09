import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:school_camera/features/auth/application/auth_providers.dart';
import 'package:school_camera/features/security/application/security_providers.dart';

/// Locks the app after background timeout when biometric unlock is enabled.
class AppLifecycleGuard extends ConsumerStatefulWidget {
  const AppLifecycleGuard({super.key, required this.child});

  final Widget child;

  @override
  ConsumerState<AppLifecycleGuard> createState() => _AppLifecycleGuardState();
}

class _AppLifecycleGuardState extends ConsumerState<AppLifecycleGuard>
    with WidgetsBindingObserver {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    final auth = ref.read(authControllerProvider);
    if (!auth.isAuthenticated) return;

    final security = ref.read(securityControllerProvider.notifier);
    switch (state) {
      case AppLifecycleState.paused:
      case AppLifecycleState.inactive:
        security.onAppPaused();
      case AppLifecycleState.resumed:
        security.onAppResumed();
      default:
        break;
    }
  }

  @override
  Widget build(BuildContext context) => widget.child;
}
