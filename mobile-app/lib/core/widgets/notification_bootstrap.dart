import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:school_camera/app/router.dart';
import 'package:school_camera/features/auth/application/auth_providers.dart';
import 'package:school_camera/features/auth/application/auth_state.dart';
import 'package:school_camera/features/notifications/application/notification_providers.dart';

/// Initializes FCM listeners and syncs token after authenticated session.
class NotificationBootstrap extends ConsumerStatefulWidget {
  const NotificationBootstrap({super.key, required this.child});

  final Widget child;

  @override
  ConsumerState<NotificationBootstrap> createState() => _NotificationBootstrapState();
}

class _NotificationBootstrapState extends ConsumerState<NotificationBootstrap> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      final router = ref.read(routerProvider);
      await ref.read(notificationServiceProvider).initialize(router);
    });
  }

  @override
  Widget build(BuildContext context) {
    ref.listen<AuthState>(authControllerProvider, (prev, next) {
      if (next.isAuthenticated && prev?.isAuthenticated != true) {
        ref.read(notificationControllerProvider.notifier).syncTokenIfPermitted();
      }
      if (prev?.isAuthenticated == true && !next.isAuthenticated) {
        ref.read(notificationControllerProvider.notifier).onLogout();
      }
    });

    return widget.child;
  }
}
