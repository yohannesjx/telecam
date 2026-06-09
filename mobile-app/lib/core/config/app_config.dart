import 'package:school_camera/core/config/environment.dart';
import 'package:school_camera/core/network/api_helpers.dart';

/// Runtime application configuration (API URL, environment).
class AppConfig {
  final AppEnvironment environment;
  final String apiBaseUrl;

  const AppConfig({
    required this.environment,
    required this.apiBaseUrl,
  });

  /// Loads config from compile-time `--dart-define` values.
  factory AppConfig.fromEnvironment() {
    const envName = String.fromEnvironment(
      'APP_ENV',
      defaultValue: 'production',
    );
    const apiBaseUrl = String.fromEnvironment(
      'API_BASE_URL',
      defaultValue: defaultApiBaseUrl,
    );

    return AppConfig(
      environment: _parseEnvironment(envName),
      apiBaseUrl: normalizeApiBaseUrl(apiBaseUrl),
    );
  }

  static AppEnvironment _parseEnvironment(String value) {
    switch (value.toLowerCase()) {
      case 'development':
      case 'dev':
        return AppEnvironment.development;
      case 'staging':
      case 'stage':
        return AppEnvironment.staging;
      case 'production':
      case 'prod':
      default:
        return AppEnvironment.production;
    }
  }

  bool get isProduction => environment == AppEnvironment.production;
  bool get isDevelopment => environment == AppEnvironment.development;
}
