import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:school_camera/app/router.dart';
import 'package:school_camera/app/theme.dart';
import 'package:school_camera/core/constants/app_constants.dart';
import 'package:school_camera/features/auth/application/auth_providers.dart';
import 'package:school_camera/features/auth/application/auth_state.dart';
import 'package:school_camera/features/auth/presentation/widgets/login_form.dart';
import 'package:school_camera/features/security/application/security_providers.dart';

class LoginPage extends ConsumerStatefulWidget {
  const LoginPage({super.key, this.message});

  final String? message;

  @override
  ConsumerState<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends ConsumerState<LoginPage> {
  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authControllerProvider);

    ref.listen<AuthState>(authControllerProvider, (prev, next) {
      if (next.isAuthenticated && context.mounted) {
        ref.read(securityControllerProvider.notifier).grantUnlockedAccess();
        context.go(AppRoutes.home);
      }
    });

    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(AppSpacing.lg),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: AppSpacing.xl),
              Center(
                child: Container(
                  width: 72,
                  height: 72,
                  decoration: BoxDecoration(
                    color: AppColors.primaryLight,
                    borderRadius: BorderRadius.circular(AppRadius.lg),
                  ),
                  child: const Icon(
                    Icons.family_restroom_rounded,
                    size: 36,
                    color: AppColors.primary,
                  ),
                ),
              ),
              const SizedBox(height: AppSpacing.lg),
              Text(
                AppConstants.appName,
                style: Theme.of(context).textTheme.headlineLarge,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: AppSpacing.xs),
              Text(
                'Parent Login',
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      color: AppColors.textSecondary,
                    ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: AppSpacing.sm),
              Text(
                'Secure access for parents.\nWatch school camera streams safely during allowed hours.',
                style: Theme.of(context).textTheme.bodyMedium,
                textAlign: TextAlign.center,
              ),
              if (widget.message != null && widget.message!.isNotEmpty) ...[
                const SizedBox(height: AppSpacing.md),
                Container(
                  padding: const EdgeInsets.all(AppSpacing.md),
                  decoration: BoxDecoration(
                    color: AppColors.primaryLight,
                    borderRadius: BorderRadius.circular(AppRadius.md),
                  ),
                  child: Text(
                    widget.message!,
                    style: Theme.of(context).textTheme.bodyMedium,
                    textAlign: TextAlign.center,
                  ),
                ),
              ],
              const SizedBox(height: AppSpacing.xl),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(AppSpacing.lg),
                  child: LoginForm(
                    isLoading: auth.isLoading,
                    errorMessage: auth.error?.message,
                    onSubmit: (email, password) async {
                      ref.read(authControllerProvider.notifier).clearError();
                      await ref
                          .read(authControllerProvider.notifier)
                          .login(email, password);
                    },
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
