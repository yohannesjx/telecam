import 'package:school_camera/core/storage/secure_storage_service.dart';
import 'package:school_camera/features/auth/data/models/auth_user.dart';

/// Persisted session in secure storage.
class AuthSession {
  const AuthSession({
    required this.accessToken,
    required this.refreshToken,
    required this.user,
  });

  final String accessToken;
  final String refreshToken;
  final AuthUser user;
}

/// Auth-specific secure storage (tokens, user, device fingerprint).
class AuthStorage {
  AuthStorage(this._storage);

  final SecureStorageService _storage;

  static const String _accessTokenKey = SecureStorageKeys.accessToken;
  static const String _refreshTokenKey = SecureStorageKeys.refreshToken;
  static const String _userKey = SecureStorageKeys.user;
  static const String deviceFingerprintKey = 'device_fingerprint';

  Future<void> saveSession({
    required String accessToken,
    required String refreshToken,
    required AuthUser user,
  }) async {
    await Future.wait([
      saveAccessToken(accessToken),
      _storage.write(_refreshTokenKey, refreshToken),
      _storage.write(_userKey, user.toJsonString()),
    ]);
  }

  Future<AuthSession?> readSession() async {
    final access = await readAccessToken();
    final refresh = await readRefreshToken();
    final userRaw = await _storage.read(_userKey);
    final user = AuthUser.fromJsonString(userRaw);

    if (access == null || refresh == null || user == null) {
      return null;
    }

    return AuthSession(
      accessToken: access,
      refreshToken: refresh,
      user: user,
    );
  }

  Future<void> clearSession() async {
    await Future.wait([
      _storage.delete(_accessTokenKey),
      _storage.delete(_refreshTokenKey),
      _storage.delete(_userKey),
    ]);
  }

  Future<void> saveAccessToken(String accessToken) async {
    await _storage.write(_accessTokenKey, accessToken);
  }

  Future<String?> readAccessToken() => _storage.read(_accessTokenKey);

  Future<String?> readRefreshToken() => _storage.read(_refreshTokenKey);

  Future<String?> readDeviceFingerprint() => _storage.read(deviceFingerprintKey);

  Future<void> saveDeviceFingerprint(String fingerprint) async {
    await _storage.write(deviceFingerprintKey, fingerprint);
  }
}
