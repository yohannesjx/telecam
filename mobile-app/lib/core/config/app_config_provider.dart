import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:school_camera/core/config/app_config.dart';

/// Global application configuration provider.
final appConfigProvider = Provider<AppConfig>((ref) {
  return AppConfig.fromEnvironment();
});
