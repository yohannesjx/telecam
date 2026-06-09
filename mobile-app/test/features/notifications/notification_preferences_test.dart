import 'package:flutter_test/flutter_test.dart';
import 'package:school_camera/features/notifications/domain/notification_preferences.dart';

void main() {
  test('fromJson uses defaults for missing keys', () {
    final prefs = NotificationPreferences.fromJson({});
    expect(prefs.subscriptionReminders, isTrue);
    expect(prefs.cameraStatusNotices, isFalse);
  });

  test('toPatchJson round-trips keys', () {
    const prefs = NotificationPreferences(cameraStatusNotices: true);
    final json = prefs.toPatchJson();
    expect(json['camera_status_notices'], isTrue);
    expect(NotificationPreferences.fromJson(json).cameraStatusNotices, isTrue);
  });
}
