import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:school_camera/app/router.dart';
import 'package:school_camera/app/theme.dart';
import 'package:school_camera/core/constants/app_constants.dart';
import 'package:school_camera/core/widgets/app_lifecycle_guard.dart';
import 'package:school_camera/core/widgets/notification_bootstrap.dart';

class SchoolCameraApp extends ConsumerWidget {
  const SchoolCameraApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);

    return NotificationBootstrap(
      child: AppLifecycleGuard(
        child: MaterialApp.router(
          title: AppConstants.appName,
          debugShowCheckedModeBanner: false,
          theme: buildAppTheme(),
          darkTheme: buildAppTheme(isDark: true),
          themeMode: ThemeMode.light,
          routerConfig: router,
        ),
      ),
    );
  }
}
