import 'package:flutter/services.dart';
import 'package:local_auth/local_auth.dart';

/// Wraps [LocalAuthentication] with parent-friendly error mapping.
class BiometricService {
  BiometricService({LocalAuthentication? auth}) : _auth = auth ?? LocalAuthentication();

  final LocalAuthentication _auth;

  Future<bool> isDeviceSupported() async {
    try {
      return await _auth.isDeviceSupported();
    } on PlatformException {
      return false;
    }
  }

  Future<bool> canCheckBiometrics() async {
    try {
      return await _auth.canCheckBiometrics;
    } on PlatformException {
      return false;
    }
  }

  Future<bool> isBiometricAvailable() async {
    if (!await isDeviceSupported()) return false;
    if (!await canCheckBiometrics()) return false;
    try {
      final types = await _auth.getAvailableBiometrics();
      return types.isNotEmpty;
    } on PlatformException {
      return false;
    }
  }

  Future<List<BiometricType>> availableBiometrics() async {
    try {
      return await _auth.getAvailableBiometrics();
    } on PlatformException {
      return const [];
    }
  }

  String biometricLabel(List<BiometricType> types) {
    if (types.contains(BiometricType.face)) {
      return 'Face ID';
    }
    if (types.contains(BiometricType.fingerprint)) {
      return 'Fingerprint';
    }
    if (types.contains(BiometricType.strong) || types.contains(BiometricType.weak)) {
      return 'Biometrics';
    }
    return 'Biometric unlock';
  }

  /// Returns true when the user successfully authenticated.
  Future<BiometricAuthResult> authenticate({
    required String reason,
  }) async {
    try {
      final ok = await _auth.authenticate(
        localizedReason: reason,
        biometricOnly: true,
      );
      if (ok) return BiometricAuthResult.success;
      return BiometricAuthResult.cancelled;
    } on PlatformException catch (e) {
      if (e.code == 'NotAvailable' || e.code == 'notAvailable') {
        return BiometricAuthResult.notAvailable;
      }
      if (e.code == 'NotEnrolled' || e.code == 'notEnrolled') {
        return BiometricAuthResult.notEnrolled;
      }
      if (e.code == 'LockedOut' || e.code == 'lockedOut') {
        return BiometricAuthResult.failed;
      }
      return BiometricAuthResult.failed;
    } catch (_) {
      return BiometricAuthResult.failed;
    }
  }
}

enum BiometricAuthResult {
  success,
  cancelled,
  notAvailable,
  notEnrolled,
  failed,
}
