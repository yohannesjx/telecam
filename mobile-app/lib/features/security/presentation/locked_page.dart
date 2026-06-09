import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:school_camera/app/router.dart';
import 'package:school_camera/app/theme.dart';
import 'package:school_camera/core/constants/app_constants.dart';
import 'package:school_camera/core/session/logout_helper.dart';
import 'package:school_camera/core/widgets/app_button.dart';
import 'package:school_camera/features/auth/application/auth_providers.dart';
import 'package:school_camera/features/security/application/security_providers.dart';

class LockedPage extends ConsumerStatefulWidget {
  const LockedPage({super.key});

  @override
  ConsumerState<LockedPage> createState() => _LockedPageState();
}

class _LockedPageState extends ConsumerState<LockedPage> {
  String? _message;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _tryUnlock());
  }

  Future<void> _tryUnlock() async {
    final auth = ref.read(authControllerProvider);
    if (!auth.isAuthenticated) {
      if (mounted) context.go(AppRoutes.login);
      return;
    }

    final user = auth.user;
    if (user != null && !user.isActive) {
      await performLogout(ref);
      if (mounted) context.go(AppRoutes.login);
      return;
    }

    final error = await ref.read(securityControllerProvider.notifier).unlock();
    if (!mounted) return;

    if (error != null) {
      setState(() => _message = error);
      return;
    }

    setState(() => _message = null);
    if (mounted) context.go(AppRoutes.home);
  }

  Future<void> _logout() async {
    await performLogout(ref);
    if (mounted) context.go(AppRoutes.login);
  }

  @override
  Widget build(BuildContext context) {
    final security = ref.watch(securityControllerProvider);
    final label = security.biometricAvailable
        ? 'Unlock with ${security.biometricLabel}'
        : 'Biometric unlock is not available on this device.';

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
                  Icons.lock_outline_rounded,
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
                label,
                style: Theme.of(context).textTheme.bodyLarge,
                textAlign: TextAlign.center,
              ),
              if (_message != null) ...[
                const SizedBox(height: AppSpacing.md),
                Text(
                  _message!,
                  style: const TextStyle(color: AppColors.error),
                  textAlign: TextAlign.center,
                ),
              ],
              const SizedBox(height: AppSpacing.xxl),
              AppButton(
                label: 'Try again',
                loading: security.authenticating,
                onPressed: security.authenticating || !security.biometricAvailable
                    ? null
                    : () => _tryUnlock(),
              ),
              const SizedBox(height: AppSpacing.md),
              AppButton(
                label: 'Sign out',
                variant: AppButtonVariant.secondary,
                onPressed: security.authenticating ? null : _logout,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
