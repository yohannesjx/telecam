import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:school_camera/app/router.dart';
import 'package:school_camera/app/theme.dart';
import 'package:school_camera/core/widgets/app_card.dart';
import 'package:school_camera/features/security/application/security_providers.dart';

class SecuritySection extends ConsumerWidget {
  const SecuritySection({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final security = ref.watch(securityControllerProvider);

    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Security', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: AppSpacing.sm),
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: const Icon(Icons.password_outlined, color: AppColors.primary),
            title: const Text('Change password'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => context.push(AppRoutes.changePassword),
          ),
          const Divider(height: 1),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            secondary: const Icon(Icons.fingerprint, color: AppColors.primary),
            title: const Text('Biometric unlock'),
            subtitle: Text(
              security.biometricAvailable
                  ? 'Use ${security.biometricLabel} to unlock the app'
                  : 'Biometric unlock is not available on this device.',
            ),
            value: security.biometricEnabled,
            onChanged: security.biometricAvailable
                ? (value) async {
                    final message = await ref
                        .read(securityControllerProvider.notifier)
                        .setBiometricEnabled(value);
                    if (message != null && context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text(message)),
                      );
                    }
                  }
                : null,
          ),
        ],
      ),
    );
  }
}
