import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:school_camera/app/theme.dart';
import 'package:school_camera/core/widgets/app_button.dart';
import 'package:school_camera/features/notifications/application/notification_providers.dart';

/// Optional post-login prompt to enable calm parent notifications.
class NotificationPermissionBanner extends ConsumerWidget {
  const NotificationPermissionBanner({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notifications = ref.watch(notificationControllerProvider);

    if (notifications.promptDismissed || notifications.permissionGranted) {
      return const SizedBox.shrink();
    }

    return Card(
      margin: const EdgeInsets.only(bottom: AppSpacing.lg),
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.lg),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Stay informed',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: AppSpacing.sm),
            Text(
              'Enable notifications to receive subscription and payment updates from your school.',
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            if (notifications.errorMessage != null) ...[
              const SizedBox(height: AppSpacing.sm),
              Text(
                notifications.errorMessage!,
                style: const TextStyle(color: AppColors.error, fontSize: 13),
              ),
            ],
            const SizedBox(height: AppSpacing.md),
            AppButton(
              label: 'Enable notifications',
              loading: notifications.registering,
              onPressed: notifications.registering
                  ? null
                  : () async {
                      final message = await ref
                          .read(notificationControllerProvider.notifier)
                          .enableNotifications();
                      if (message != null && context.mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text(message)),
                        );
                      }
                    },
            ),
            const SizedBox(height: AppSpacing.sm),
            TextButton(
              onPressed: notifications.registering
                  ? null
                  : () => ref
                      .read(notificationControllerProvider.notifier)
                      .dismissPermissionPrompt(),
              child: const Text('Not now'),
            ),
          ],
        ),
      ),
    );
  }
}
