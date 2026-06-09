import 'package:school_camera/features/notifications/domain/current_device_info.dart';
import 'package:school_camera/features/notifications/domain/notification_preferences.dart';

class NotificationState {
  const NotificationState({
    this.loading = false,
    this.saving = false,
    this.registering = false,
    this.device,
    this.preferences = const NotificationPreferences(),
    this.permissionGranted = false,
    this.promptDismissed = false,
    this.errorMessage,
  });

  final bool loading;
  final bool saving;
  final bool registering;
  final CurrentDeviceInfo? device;
  final NotificationPreferences preferences;
  final bool permissionGranted;
  final bool promptDismissed;
  final String? errorMessage;

  NotificationState copyWith({
    bool? loading,
    bool? saving,
    bool? registering,
    CurrentDeviceInfo? device,
    NotificationPreferences? preferences,
    bool? permissionGranted,
    bool? promptDismissed,
    String? errorMessage,
    bool clearError = false,
  }) {
    return NotificationState(
      loading: loading ?? this.loading,
      saving: saving ?? this.saving,
      registering: registering ?? this.registering,
      device: device ?? this.device,
      preferences: preferences ?? this.preferences,
      permissionGranted: permissionGranted ?? this.permissionGranted,
      promptDismissed: promptDismissed ?? this.promptDismissed,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
    );
  }

  static const initial = NotificationState();
}
