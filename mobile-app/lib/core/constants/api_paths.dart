/// API path segments (relative to [AppConfig.apiBaseUrl]).
class ApiPaths {
  ApiPaths._();

  static const String authLogin = '/auth/login';
  static const String authRefresh = '/auth/refresh';
  static const String authLogout = '/auth/logout';
  static const String authMe = '/auth/me';
  static const String authChangePassword = '/auth/change-password';

  static const String parentChildren = '/parent/children';
  static const String parentCameras = '/parent/cameras';
  static const String parentSubscriptions = '/parent/subscriptions';
  static const String parentPayments = '/parent/payments';
  static const String parentInvoices = '/parent/invoices';
  static String parentCameraLive(String cameraId) => '/parent/cameras/$cameraId/live';
  static String parentCameraTimeline(String cameraId) =>
      '/parent/cameras/$cameraId/timeline';
  static String parentCameraPlayback(String cameraId) =>
      '/parent/cameras/$cameraId/playback';

  static const String parentDevicesPushToken = '/parent/devices/push-token';
  static const String parentDevicesNotificationPreferences =
      '/parent/devices/notification-preferences';
  static const String parentDevicesCurrent = '/parent/devices/current';
  static const String parentDevicesPushDisable = '/parent/devices/push-disable';
}
