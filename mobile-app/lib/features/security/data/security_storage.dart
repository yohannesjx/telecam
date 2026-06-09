import 'package:school_camera/core/storage/secure_storage_service.dart';

/// Security preferences stored separately from auth session tokens.
class SecurityStorage {
  SecurityStorage(this._storage);

  final SecureStorageService _storage;

  static const String biometricEnabledKey = 'biometric_enabled';

  Future<bool> readBiometricEnabled() async {
    final raw = await _storage.read(biometricEnabledKey);
    return raw == 'true';
  }

  Future<void> writeBiometricEnabled(bool enabled) async {
    await _storage.write(biometricEnabledKey, enabled ? 'true' : 'false');
  }
}
