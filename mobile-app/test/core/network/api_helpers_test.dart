import 'package:flutter_test/flutter_test.dart';
import 'package:school_camera/core/network/api_error.dart';
import 'package:school_camera/core/network/api_helpers.dart';
import 'package:school_camera/features/auth/data/models/login_response.dart';

void main() {
  test('normalizeApiBaseUrl adds /api for production host', () {
    expect(
      normalizeApiBaseUrl('https://camera.iglooks.com'),
      'https://camera.iglooks.com/api/',
    );
    expect(
      normalizeApiBaseUrl('https://camera.iglooks.com/api'),
      'https://camera.iglooks.com/api/',
    );
  });

  test('normalizeApiBaseUrl keeps direct local API URL', () {
    expect(
      normalizeApiBaseUrl('http://10.0.2.2:58081'),
      'http://10.0.2.2:58081/',
    );
  });

  test('parseAuthResponseBody rejects school-camera-api placeholder', () {
    expect(
      () => parseAuthResponseBody('school-camera-api'),
      throwsA(
        isA<AppError>().having(
          (e) => e.message,
          'message',
          apiBaseUrlMisconfiguredMessage,
        ),
      ),
    );
  });

  test('LoginResponse parses production login JSON', () {
    final map = parseAuthResponseBody({
      'access_token': 'access',
      'refresh_token': 'refresh',
      'expires_in': 900,
      'user': {
        'id': '11111111-1111-1111-1111-111111111103',
        'full_name': 'Demo Parent',
        'email': 'parent@example.com',
        'role': 'PARENT',
        'status': 'ACTIVE',
      },
    });

    final login = LoginResponse.fromJson(map);
    expect(login.tokens.accessToken, 'access');
    expect(login.user?.email, 'parent@example.com');
    expect(login.user?.isParent, isTrue);
  });
}
