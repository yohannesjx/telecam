import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:school_camera/core/session/session_cleanup.dart';
import 'package:school_camera/features/auth/application/auth_providers.dart';
import 'package:school_camera/features/notifications/application/notification_providers.dart';
import 'package:school_camera/features/security/application/security_providers.dart';

/// Signs out, clears tokens, and drops in-memory playback/parent data.
Future<void> performLogout(WidgetRef ref) async {
  await ref.read(notificationControllerProvider.notifier).onLogout();
  clearSessionProviders(ref);
  ref.read(securityControllerProvider.notifier).onLogout();
  await ref.read(authControllerProvider.notifier).logout();
}
