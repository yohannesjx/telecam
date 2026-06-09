import 'package:dio/dio.dart';
import 'package:school_camera/core/constants/api_paths.dart';
import 'package:school_camera/core/network/api_helpers.dart';
import 'package:school_camera/core/network/error_mapper.dart';
import 'package:school_camera/features/notifications/domain/current_device_info.dart';
import 'package:school_camera/features/notifications/domain/notification_preferences.dart';

class PushTokenApi {
  PushTokenApi(this._dio);

  final Dio _dio;

  Future<CurrentDeviceInfo> registerPushToken({
    required String deviceFingerprint,
    required String fcmToken,
    required String platform,
    required String appVersion,
    required bool notificationsEnabled,
  }) async {
    try {
      final response = await _dio.post<dynamic>(
        ApiPaths.parentDevicesPushToken,
        data: {
          'device_fingerprint': deviceFingerprint,
          'fcm_token': fcmToken,
          'platform': platform,
          'app_version': appVersion,
          'notifications_enabled': notificationsEnabled,
        },
      );
      return _parseDevice(response.data);
    } on DioException catch (e) {
      throw mapDioError(e);
    }
  }

  Future<CurrentDeviceInfo> getCurrentDevice() async {
    try {
      final response = await _dio.get<dynamic>(ApiPaths.parentDevicesCurrent);
      return _parseDevice(response.data);
    } on DioException catch (e) {
      throw mapDioError(e);
    }
  }

  Future<NotificationPreferences> updatePreferences(
    NotificationPreferences preferences,
  ) async {
    try {
      final response = await _dio.patch<dynamic>(
        ApiPaths.parentDevicesNotificationPreferences,
        data: preferences.toPatchJson(),
      );
      final data = unwrapApiData(response.data);
      if (data is Map<String, dynamic>) {
        final prefs = data['notification_preferences'];
        if (prefs is Map<String, dynamic>) {
          return NotificationPreferences.fromJson(prefs);
        }
      }
      return preferences;
    } on DioException catch (e) {
      throw mapDioError(e);
    }
  }

  Future<void> disablePush() async {
    try {
      await _dio.post<void>(ApiPaths.parentDevicesPushDisable);
    } on DioException catch (e) {
      throw mapDioError(e);
    }
  }

  CurrentDeviceInfo _parseDevice(dynamic raw) {
    final data = unwrapApiData(raw);
    if (data is Map<String, dynamic>) {
      return CurrentDeviceInfo.fromJson(data);
    }
    throw DioException(
      requestOptions: RequestOptions(path: ApiPaths.parentDevicesCurrent),
      message: 'Unexpected device response',
    );
  }
}
