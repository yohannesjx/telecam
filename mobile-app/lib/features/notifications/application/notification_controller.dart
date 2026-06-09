import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:school_camera/core/network/api_error.dart';
import 'package:school_camera/features/notifications/application/notification_service.dart';
import 'package:school_camera/features/notifications/application/notification_state.dart';
import 'package:school_camera/features/notifications/data/notification_repository.dart';
class NotificationController extends StateNotifier<NotificationState> {
  NotificationController({
    required NotificationRepository repository,
    required NotificationService service,
  })  : _repository = repository,
        _service = service,
        super(NotificationState.initial) {
    _service.setTokenRefreshHandler(_onTokenRefreshed);
  }

  final NotificationRepository _repository;
  final NotificationService _service;

  Future<void> loadDevice() async {
    state = state.copyWith(loading: true, clearError: true);
    try {
      final device = await _repository.fetchCurrentDevice();
      state = state.copyWith(
        loading: false,
        device: device,
        preferences: device.preferences,
        permissionGranted: device.notificationsEnabled,
      );
    } on AppError catch (e) {
      state = state.copyWith(loading: false, errorMessage: e.message);
    } catch (_) {
      state = state.copyWith(
        loading: false,
        errorMessage: 'Could not load notification settings.',
      );
    }
  }

  void dismissPermissionPrompt() {
    state = state.copyWith(promptDismissed: true);
  }

  /// Ask permission and register FCM token when parent opts in after login.
  Future<String?> enableNotifications() async {
    state = state.copyWith(registering: true, clearError: true);
    try {
      final granted = await _service.requestPermission();
      if (!granted) {
        state = state.copyWith(
          registering: false,
          permissionGranted: false,
          promptDismissed: true,
          errorMessage: 'Notifications are disabled. You can enable them in phone settings.',
        );
        return state.errorMessage;
      }

      final token = await _service.getToken();
      if (token == null || token.isEmpty) {
        state = state.copyWith(
          registering: false,
          errorMessage: 'Could not register this device for notifications.',
        );
        return state.errorMessage;
      }

      final device = await _repository.registerToken(
        fcmToken: token,
        notificationsEnabled: true,
      );
      state = state.copyWith(
        registering: false,
        permissionGranted: true,
        promptDismissed: true,
        device: device,
        preferences: device.preferences,
        clearError: true,
      );
      return null;
    } on AppError catch (e) {
      state = state.copyWith(
        registering: false,
        errorMessage: 'Could not register this device for notifications.',
      );
      return e.message;
    } catch (_) {
      state = state.copyWith(
        registering: false,
        errorMessage: 'Could not register this device for notifications.',
      );
      return state.errorMessage;
    }
  }

  Future<void> syncTokenIfPermitted() async {
    if (!state.permissionGranted) return;
    final token = await _service.getToken();
    if (token == null || token.isEmpty) return;
    try {
      final device = await _repository.registerToken(
        fcmToken: token,
        notificationsEnabled: true,
      );
      state = state.copyWith(device: device, preferences: device.preferences);
    } catch (_) {
      // Non-blocking after session restore.
    }
  }

  Future<String?> updatePreference({
    bool? subscriptionReminders,
    bool? paymentUpdates,
    bool? importantNotices,
    bool? cameraStatusNotices,
  }) async {
    final next = state.preferences.copyWith(
      subscriptionReminders: subscriptionReminders,
      paymentUpdates: paymentUpdates,
      importantNotices: importantNotices,
      cameraStatusNotices: cameraStatusNotices,
    );
    state = state.copyWith(saving: true, clearError: true);
    try {
      final saved = await _repository.updatePreferences(next);
      state = state.copyWith(saving: false, preferences: saved);
      return null;
    } on AppError catch (e) {
      state = state.copyWith(
        saving: false,
        errorMessage: 'Could not update notification settings.',
      );
      return e.message;
    } catch (_) {
      state = state.copyWith(
        saving: false,
        errorMessage: 'Could not update notification settings.',
      );
      return state.errorMessage;
    }
  }

  Future<void> onLogout() async {
    await _service.disableOnBackend();
    _service.clearLocalState();
    state = NotificationState.initial;
  }

  Future<void> _onTokenRefreshed(String token) async {
    if (!state.permissionGranted) return;
    try {
      await _repository.registerToken(
        fcmToken: token,
        notificationsEnabled: true,
      );
    } catch (_) {}
  }
}
