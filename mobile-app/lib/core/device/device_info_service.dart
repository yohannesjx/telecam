import 'dart:io';

import 'package:device_info_plus/device_info_plus.dart';
import 'package:flutter/foundation.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:school_camera/features/auth/data/auth_storage.dart';
import 'package:uuid/uuid.dart';

/// Provides human-readable device name and stable app-scoped fingerprint.
class DeviceInfoService {
  DeviceInfoService(this._authStorage);

  final AuthStorage _authStorage;
  final DeviceInfoPlugin _deviceInfo = DeviceInfoPlugin();
  static const _uuid = Uuid();

  Future<String> getDeviceName() async {
    try {
      if (kIsWeb) return 'Web Browser';

      if (Platform.isAndroid) {
        final info = await _deviceInfo.androidInfo;
        final model = info.model.trim();
        final manufacturer = info.manufacturer.trim();
        if (manufacturer.isNotEmpty && model.isNotEmpty) {
          return '$manufacturer $model';
        }
        return model.isNotEmpty ? model : 'Android Device';
      }

      if (Platform.isIOS) {
        final info = await _deviceInfo.iosInfo;
        final name = info.name.trim();
        if (name.isNotEmpty) return name;
        return 'iPhone';
      }

      final package = await PackageInfo.fromPlatform();
      return '${package.appName} Device';
    } catch (_) {
      return 'Mobile Device';
    }
  }

  Future<String> getPlatformLabel() async {
    if (kIsWeb) return 'Web';
    if (Platform.isIOS) return 'iOS';
    if (Platform.isAndroid) return 'Android';
    return 'Unknown';
  }

  Future<String> getAppVersionLabel() async {
    try {
      final info = await PackageInfo.fromPlatform();
      return '${info.version} (${info.buildNumber})';
    } catch (_) {
      return '—';
    }
  }

  /// Stable UUID stored in secure storage (not hardware IDs).
  Future<String> getOrCreateDeviceFingerprint() async {
    final existing = await _authStorage.readDeviceFingerprint();
    if (existing != null && existing.isNotEmpty) {
      return existing;
    }

    final fingerprint = _uuid.v4();
    await _authStorage.saveDeviceFingerprint(fingerprint);
    return fingerprint;
  }
}
