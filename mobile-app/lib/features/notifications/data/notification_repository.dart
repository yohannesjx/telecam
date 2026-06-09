import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:school_camera/core/device/device_info_service.dart';
import 'package:school_camera/features/notifications/data/push_token_api.dart';
import 'package:school_camera/features/notifications/domain/current_device_info.dart';
import 'package:school_camera/features/notifications/domain/notification_preferences.dart';

class NotificationRepository {
  NotificationRepository({
    required PushTokenApi api,
    required DeviceInfoService deviceInfo,
  })  : _api = api,
        _deviceInfo = deviceInfo;

  final PushTokenApi _api;
  final DeviceInfoService _deviceInfo;

  Future<CurrentDeviceInfo> fetchCurrentDevice() => _api.getCurrentDevice();

  Future<NotificationPreferences> updatePreferences(
    NotificationPreferences preferences,
  ) =>
      _api.updatePreferences(preferences);

  Future<CurrentDeviceInfo> registerToken({
    required String fcmToken,
    required bool notificationsEnabled,
  }) async {
    final fingerprint = await _deviceInfo.getOrCreateDeviceFingerprint();
    final version = await _deviceInfo.getAppVersionLabel();
    return _api.registerPushToken(
      deviceFingerprint: fingerprint,
      fcmToken: fcmToken,
      platform: await _platformLabel(),
      appVersion: version,
      notificationsEnabled: notificationsEnabled,
    );
  }

  Future<void> disableNotificationsBestEffort() async {
    try {
      await _api.disablePush();
    } catch (_) {}
  }

  Future<String> _platformLabel() async {
    if (kIsWeb) return 'web';
    if (Platform.isIOS) return 'ios';
    if (Platform.isAndroid) return 'android';
    return 'unknown';
  }
}
