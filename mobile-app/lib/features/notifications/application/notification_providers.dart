import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:school_camera/core/network/dio_provider.dart';
import 'package:school_camera/features/auth/application/auth_providers.dart';
import 'package:school_camera/features/notifications/application/notification_controller.dart';
import 'package:school_camera/features/notifications/application/notification_service.dart';
import 'package:school_camera/features/notifications/application/notification_state.dart';
import 'package:school_camera/features/notifications/data/notification_repository.dart';
import 'package:school_camera/features/notifications/data/push_token_api.dart';

final pushTokenApiProvider = Provider<PushTokenApi>((ref) {
  return PushTokenApi(ref.watch(dioProvider));
});

final notificationRepositoryProvider = Provider<NotificationRepository>((ref) {
  return NotificationRepository(
    api: ref.watch(pushTokenApiProvider),
    deviceInfo: ref.watch(deviceInfoServiceProvider),
  );
});

final notificationServiceProvider = Provider<NotificationService>((ref) {
  final service = NotificationService(
    repository: ref.watch(notificationRepositoryProvider),
  );
  ref.onDispose(service.dispose);
  return service;
});

final notificationControllerProvider =
    StateNotifierProvider<NotificationController, NotificationState>((ref) {
  return NotificationController(
    repository: ref.watch(notificationRepositoryProvider),
    service: ref.watch(notificationServiceProvider),
  );
});
