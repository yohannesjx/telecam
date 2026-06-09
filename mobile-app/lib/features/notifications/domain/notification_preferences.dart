/// Per-device notification toggles from the backend.
class NotificationPreferences {
  const NotificationPreferences({
    this.subscriptionReminders = true,
    this.paymentUpdates = true,
    this.importantNotices = true,
    this.cameraStatusNotices = false,
  });

  final bool subscriptionReminders;
  final bool paymentUpdates;
  final bool importantNotices;
  final bool cameraStatusNotices;

  factory NotificationPreferences.fromJson(Map<String, dynamic> json) {
    bool flag(String key, bool defaultValue) {
      final value = json[key];
      if (value is bool) return value;
      return defaultValue;
    }

    return NotificationPreferences(
      subscriptionReminders: flag('subscription_reminders', true),
      paymentUpdates: flag('payment_updates', true),
      importantNotices: flag('important_notices', true),
      cameraStatusNotices: flag('camera_status_notices', false),
    );
  }

  Map<String, dynamic> toPatchJson() => {
        'subscription_reminders': subscriptionReminders,
        'payment_updates': paymentUpdates,
        'important_notices': importantNotices,
        'camera_status_notices': cameraStatusNotices,
      };

  NotificationPreferences copyWith({
    bool? subscriptionReminders,
    bool? paymentUpdates,
    bool? importantNotices,
    bool? cameraStatusNotices,
  }) {
    return NotificationPreferences(
      subscriptionReminders: subscriptionReminders ?? this.subscriptionReminders,
      paymentUpdates: paymentUpdates ?? this.paymentUpdates,
      importantNotices: importantNotices ?? this.importantNotices,
      cameraStatusNotices: cameraStatusNotices ?? this.cameraStatusNotices,
    );
  }
}
