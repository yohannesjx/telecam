/// POST /auth/login request body.
class LoginRequest {
  const LoginRequest({
    required this.email,
    required this.password,
    required this.deviceName,
    required this.deviceFingerprint,
  });

  final String email;
  final String password;
  final String deviceName;
  final String deviceFingerprint;

  Map<String, dynamic> toJson() => {
        'email': email,
        'password': password,
        'device_name': deviceName,
        'device_fingerprint': deviceFingerprint,
      };
}
