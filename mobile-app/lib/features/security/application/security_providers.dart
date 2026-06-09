import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:school_camera/core/storage/secure_storage_provider.dart';
import 'package:school_camera/features/security/application/security_controller.dart';
import 'package:school_camera/features/security/application/security_state.dart';
import 'package:school_camera/features/security/data/biometric_service.dart';
import 'package:school_camera/features/security/data/security_storage.dart';

final securityStorageProvider = Provider<SecurityStorage>((ref) {
  return SecurityStorage(ref.watch(secureStorageProvider));
});

final biometricServiceProvider = Provider<BiometricService>((ref) {
  return BiometricService();
});

final securityControllerProvider =
    StateNotifierProvider<SecurityController, SecurityState>((ref) {
  return SecurityController(
    storage: ref.watch(securityStorageProvider),
    biometricService: ref.watch(biometricServiceProvider),
  );
});
