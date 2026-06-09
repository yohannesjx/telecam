import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:media_kit/media_kit.dart';
import 'package:school_camera/app/app.dart';
import 'package:school_camera/core/config/app_config.dart';
import 'package:school_camera/core/utils/logger.dart';
import 'package:school_camera/firebase_options.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  MediaKit.ensureInitialized();
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);

  final config = AppConfig.fromEnvironment();
  AppLogger.info('Starting ${config.environment.name} (${config.apiBaseUrl})', config: config);

  runApp(
    const ProviderScope(
      child: SchoolCameraApp(),
    ),
  );
}
