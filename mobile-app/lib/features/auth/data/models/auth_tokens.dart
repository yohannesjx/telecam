/// Access and refresh token pair.
class AuthTokens {
  const AuthTokens({
    required this.accessToken,
    required this.refreshToken,
  });

  final String accessToken;
  final String refreshToken;
}
