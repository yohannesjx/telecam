import 'package:flutter/foundation.dart';
import 'package:school_camera/core/config/app_config.dart';

/// Safe application logger — never logs secrets or sensitive URLs.
class AppLogger {
  AppLogger._();

  static bool _enabled(AppConfig? config) {
    if (kReleaseMode) return false;
    return config == null || !config.isProduction;
  }

  static void debug(String message, {AppConfig? config}) {
    if (!_enabled(config)) return;
    debugPrint('[SchoolCamera] $message');
  }

  static void info(String message, {AppConfig? config}) {
    if (!_enabled(config)) return;
    debugPrint('[SchoolCamera] $message');
  }

  static void warning(String message, {AppConfig? config}) {
    if (!_enabled(config)) return;
    debugPrint('[SchoolCamera][warn] $message');
  }

  static void error(
    String message, {
    Object? error,
    StackTrace? stackTrace,
    AppConfig? config,
  }) {
    if (!_enabled(config)) return;
    debugPrint('[SchoolCamera][error] $message');
    if (error != null) {
      debugPrint(_sanitize(error.toString()));
    }
    if (stackTrace != null) {
      debugPrint(stackTrace.toString());
    }
  }

  static String _sanitize(String input) {
    var out = input;
    const sensitivePatterns = [
      'password',
      'token',
      'authorization',
      'bearer',
      'rtsp://',
      'rtsp:',
      '.m3u8',
      'refresh_token',
      'access_token',
      'fcm_token',
      'fcm',
    ];
    for (final pattern in sensitivePatterns) {
      if (out.toLowerCase().contains(pattern)) {
        return '[redacted]';
      }
    }
    return out;
  }
}
