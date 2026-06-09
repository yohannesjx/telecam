import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:school_camera/app/theme.dart';
import 'package:school_camera/core/constants/app_constants.dart';
import 'package:school_camera/core/widgets/app_loading.dart';
import 'package:school_camera/features/auth/application/auth_providers.dart';
import 'package:school_camera/features/security/application/security_providers.dart';

class SplashPage extends ConsumerStatefulWidget {
  const SplashPage({super.key});

  @override
  ConsumerState<SplashPage> createState() => _SplashPageState();
}

class _SplashPageState extends ConsumerState<SplashPage> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      await ref.read(securityControllerProvider.notifier).initialize();
      await ref.read(authControllerProvider.notifier).restoreSession();
      if (!mounted) return;
      if (ref.read(authControllerProvider).isAuthenticated) {
        ref.read(securityControllerProvider.notifier).onSessionRestored();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.xl),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 88,
                height: 88,
                decoration: BoxDecoration(
                  color: AppColors.primaryLight,
                  borderRadius: BorderRadius.circular(AppRadius.xl),
                ),
                child: const Icon(
                  Icons.videocam_rounded,
                  size: 44,
                  color: AppColors.primary,
                ),
              ),
              const SizedBox(height: AppSpacing.lg),
              Text(
                AppConstants.appName,
                style: Theme.of(context).textTheme.headlineLarge,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: AppSpacing.sm),
              Text(
                'Checking your session…',
                style: Theme.of(context).textTheme.bodyMedium,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: AppSpacing.xxl),
              const AppLoading(),
            ],
          ),
        ),
      ),
    );
  }
}
