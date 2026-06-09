import 'package:school_camera/core/network/api_helpers.dart';
import 'package:school_camera/features/auth/data/models/auth_tokens.dart';
import 'package:school_camera/features/auth/data/models/auth_user.dart';

/// Successful login or refresh token response.
class LoginResponse {
  const LoginResponse({
    required this.tokens,
    this.user,
    this.expiresIn,
  });

  final AuthTokens tokens;
  final AuthUser? user;
  final int? expiresIn;

  factory LoginResponse.fromJson(Map<String, dynamic> json) {
    final access =
        _string(json['access_token']) ?? _string(json['accessToken']) ?? '';
    final refresh =
        _string(json['refresh_token']) ?? _string(json['refreshToken']) ?? '';

    AuthUser? user;
    final userMap = asStringKeyMap(json['user']);
    if (userMap != null) {
      user = AuthUser.fromJson(userMap);
    }

    final expires = json['expires_in'] ?? json['expiresIn'];
    int? expiresIn;
    if (expires is int) {
      expiresIn = expires;
    } else if (expires is String) {
      expiresIn = int.tryParse(expires);
    }

    return LoginResponse(
      tokens: AuthTokens(accessToken: access, refreshToken: refresh),
      user: user,
      expiresIn: expiresIn,
    );
  }

  static String? _string(dynamic value) {
    if (value is String && value.isNotEmpty) return value;
    return null;
  }
}
