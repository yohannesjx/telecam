import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:school_camera/core/device/device_info_service.dart';
import 'package:school_camera/core/network/dio_provider.dart';
import 'package:school_camera/core/storage/secure_storage_provider.dart';
import 'package:school_camera/features/auth/application/auth_controller.dart';
import 'package:school_camera/features/auth/application/auth_state.dart';
import 'package:school_camera/features/auth/data/auth_api.dart';
import 'package:school_camera/features/auth/data/auth_repository.dart';
import 'package:school_camera/features/auth/data/auth_storage.dart';

final authStorageProvider = Provider<AuthStorage>((ref) {
  return AuthStorage(ref.watch(secureStorageProvider));
});

final deviceInfoServiceProvider = Provider<DeviceInfoService>((ref) {
  return DeviceInfoService(ref.watch(authStorageProvider));
});

final authApiProvider = Provider<AuthApi>((ref) {
  return AuthApi(ref.watch(authDioProvider));
});

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository(
    api: ref.watch(authApiProvider),
    storage: ref.watch(authStorageProvider),
  );
});

final authControllerProvider =
    StateNotifierProvider<AuthController, AuthState>((ref) {
  final deviceInfo = ref.watch(deviceInfoServiceProvider);
  return AuthController(
    repository: ref.watch(authRepositoryProvider),
    deviceName: deviceInfo.getDeviceName,
    deviceFingerprint: deviceInfo.getOrCreateDeviceFingerprint,
  );
});

/// Current access token for interceptors (in-memory from auth state).
final accessTokenProvider = Provider<String?>((ref) {
  return ref.watch(authControllerProvider).accessToken;
});
