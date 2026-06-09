import 'package:school_camera/features/notifications/domain/notification_preferences.dart';

class CurrentDeviceInfo {
  const CurrentDeviceInfo({
    required this.deviceId,
    required this.deviceName,
    required this.platform,
    required this.notificationsEnabled,
    required this.preferences,
  });

  final String deviceId;
  final String deviceName;
  final String platform;
  final bool notificationsEnabled;
  final NotificationPreferences preferences;

  factory CurrentDeviceInfo.fromJson(Map<String, dynamic> json) {
    final prefsRaw = json['notification_preferences'];
    return CurrentDeviceInfo(
      deviceId: '${json['device_id'] ?? ''}',
      deviceName: '${json['device_name'] ?? 'Device'}',
      platform: '${json['platform'] ?? ''}',
      notificationsEnabled: json['notifications_enabled'] == true,
      preferences: prefsRaw is Map<String, dynamic>
          ? NotificationPreferences.fromJson(prefsRaw)
          : const NotificationPreferences(),
    );
  }
}
