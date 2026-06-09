/// App unlock state for biometric gate (not backend auth).
class SecurityState {
  const SecurityState({
    this.prefsLoaded = false,
    this.biometricEnabled = false,
    this.isUnlocked = false,
    this.biometricAvailable = false,
    this.biometricLabel = 'Biometric unlock',
    this.authenticating = false,
  });

  final bool prefsLoaded;
  final bool biometricEnabled;
  final bool isUnlocked;
  final bool biometricAvailable;
  final String biometricLabel;
  final bool authenticating;

  bool get requiresUnlock =>
      biometricEnabled && biometricAvailable && !isUnlocked;

  SecurityState copyWith({
    bool? prefsLoaded,
    bool? biometricEnabled,
    bool? isUnlocked,
    bool? biometricAvailable,
    String? biometricLabel,
    bool? authenticating,
  }) {
    return SecurityState(
      prefsLoaded: prefsLoaded ?? this.prefsLoaded,
      biometricEnabled: biometricEnabled ?? this.biometricEnabled,
      isUnlocked: isUnlocked ?? this.isUnlocked,
      biometricAvailable: biometricAvailable ?? this.biometricAvailable,
      biometricLabel: biometricLabel ?? this.biometricLabel,
      authenticating: authenticating ?? this.authenticating,
    );
  }

  static const initial = SecurityState();
}
