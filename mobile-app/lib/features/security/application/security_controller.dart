import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:local_auth/local_auth.dart';
import 'package:school_camera/features/security/application/security_state.dart';
import 'package:school_camera/features/security/data/biometric_service.dart';
import 'package:school_camera/features/security/data/security_storage.dart';

/// Local app unlock (biometric gate) after a valid backend session exists.
class SecurityController extends StateNotifier<SecurityState> {
  SecurityController({
    required SecurityStorage storage,
    required BiometricService biometricService,
  })  : _storage = storage,
        _biometric = biometricService,
        super(SecurityState.initial);

  final SecurityStorage _storage;
  final BiometricService _biometric;

  static const backgroundLockTimeout = Duration(minutes: 5);

  DateTime? _backgroundedAt;
  bool _skipNextLock = false;

  Future<void> initialize() async {
    final enabled = await _storage.readBiometricEnabled();
    final available = await _biometric.isBiometricAvailable();
    final types = available ? await _biometric.availableBiometrics() : <BiometricType>[];
    final needsLock = enabled && available;
    state = state.copyWith(
      prefsLoaded: true,
      biometricEnabled: enabled,
      biometricAvailable: available,
      biometricLabel: _biometric.biometricLabel(types),
      isUnlocked: !needsLock,
    );
  }

  /// After password login — skip biometric until next cold start or background lock.
  void grantUnlockedAccess() {
    _skipNextLock = true;
    state = state.copyWith(isUnlocked: true);
  }

  /// After session restore on splash — require biometric when enabled.
  void onSessionRestored() {
    if (_skipNextLock) {
      _skipNextLock = false;
      return;
    }
    if (state.biometricEnabled && state.biometricAvailable) {
      state = state.copyWith(isUnlocked: false);
    }
  }

  void onLogout() {
    _backgroundedAt = null;
    _skipNextLock = false;
    state = state.copyWith(isUnlocked: false);
  }

  void lock() {
    if (!state.biometricEnabled || !state.biometricAvailable) return;
    state = state.copyWith(isUnlocked: false);
  }

  void onAppPaused() {
    _backgroundedAt = DateTime.now();
  }

  void onAppResumed() {
    if (!state.biometricEnabled) return;
    final pausedAt = _backgroundedAt;
    _backgroundedAt = null;
    if (pausedAt == null) return;
    final elapsed = DateTime.now().difference(pausedAt);
    if (elapsed >= backgroundLockTimeout) {
      lock();
    }
  }

  Future<String?> setBiometricEnabled(bool enabled) async {
    if (enabled) {
      final available = await _biometric.isBiometricAvailable();
      if (!available) {
        return 'Biometric unlock is not available on this device.';
      }
      final result = await _biometric.authenticate(
        reason: 'Confirm to enable biometric unlock',
      );
      if (result != BiometricAuthResult.success) {
        if (result == BiometricAuthResult.notEnrolled) {
          return 'Biometric unlock is not set up on this device.';
        }
        if (result == BiometricAuthResult.cancelled) {
          return null;
        }
        return 'Could not verify your identity. Please try again.';
      }
    }

    await _storage.writeBiometricEnabled(enabled);
    final types = enabled ? await _biometric.availableBiometrics() : <BiometricType>[];
    state = state.copyWith(
      biometricEnabled: enabled,
      biometricAvailable: enabled ? await _biometric.isBiometricAvailable() : state.biometricAvailable,
      biometricLabel: _biometric.biometricLabel(types),
      isUnlocked: enabled ? state.isUnlocked : true,
    );
    return null;
  }

  Future<String?> unlock() async {
    if (!state.biometricEnabled) {
      state = state.copyWith(isUnlocked: true);
      return null;
    }

    if (!state.biometricAvailable) {
      return 'Biometric unlock is not available on this device.';
    }

    state = state.copyWith(authenticating: true);
    final result = await _biometric.authenticate(
      reason: 'Unlock School Camera',
    );
    state = state.copyWith(authenticating: false);

    switch (result) {
      case BiometricAuthResult.success:
        state = state.copyWith(isUnlocked: true);
        return null;
      case BiometricAuthResult.cancelled:
        return null;
      case BiometricAuthResult.notEnrolled:
        return 'Biometric unlock is not set up on this device.';
      case BiometricAuthResult.notAvailable:
        return 'Biometric unlock is not available on this device.';
      case BiometricAuthResult.failed:
        return 'Could not verify your identity. Please try again.';
    }
  }
}
