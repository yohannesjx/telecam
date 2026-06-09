import 'package:flutter_test/flutter_test.dart';
import 'package:school_camera/core/config/app_config.dart';
import 'package:school_camera/core/config/environment.dart';

void main() {
  test('default production API base URL', () {
    expect(defaultApiBaseUrl, 'https://camera.iglooks.com/api');
  });

  test('AppConfig.fromEnvironment uses production defaults', () {
    final config = AppConfig.fromEnvironment();
    expect(config.environment, AppEnvironment.production);
    expect(config.apiBaseUrl, defaultApiBaseUrl);
  });
}
