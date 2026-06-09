import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:school_camera/app/theme.dart';
import 'package:school_camera/core/widgets/app_card.dart';
import 'package:school_camera/features/notifications/application/notification_providers.dart';
import 'package:school_camera/features/notifications/presentation/widgets/notification_toggle_tile.dart';

class NotificationSettingsPage extends ConsumerStatefulWidget {
  const NotificationSettingsPage({super.key});

  @override
  ConsumerState<NotificationSettingsPage> createState() =>
      _NotificationSettingsPageState();
}

class _NotificationSettingsPageState extends ConsumerState<NotificationSettingsPage> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(notificationControllerProvider.notifier).loadDevice();
    });
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(notificationControllerProvider);
    final notifier = ref.read(notificationControllerProvider.notifier);

    return Scaffold(
      appBar: AppBar(title: const Text('Notifications')),
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.lg),
        children: [
          if (!state.permissionGranted) ...[
            AppCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Notifications are off',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  Text(
                    'Turn on notifications to get subscription and payment updates. You can change this anytime in phone settings.',
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                  const SizedBox(height: AppSpacing.md),
                  FilledButton(
                    onPressed: state.registering
                        ? null
                        : () async {
                            final message = await notifier.enableNotifications();
                            if (message != null && mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(content: Text(message)),
                              );
                            }
                          },
                    child: state.registering
                        ? const SizedBox(
                            height: 22,
                            width: 22,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Text('Enable notifications'),
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.lg),
          ],
          AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Notification types', style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: AppSpacing.sm),
                if (state.loading)
                  const Center(child: CircularProgressIndicator())
                else ...[
                  NotificationToggleTile(
                    title: 'Subscription reminders',
                    subtitle: 'Expiry and renewal reminders for your plan.',
                    value: state.preferences.subscriptionReminders,
                    enabled: !state.saving && state.permissionGranted,
                    onChanged: (v) => _update(notifier.updatePreference(subscriptionReminders: v)),
                  ),
                  const Divider(height: 1),
                  NotificationToggleTile(
                    title: 'Payment updates',
                    subtitle: 'When payments are approved or need attention.',
                    value: state.preferences.paymentUpdates,
                    enabled: !state.saving && state.permissionGranted,
                    onChanged: (v) => _update(notifier.updatePreference(paymentUpdates: v)),
                  ),
                  const Divider(height: 1),
                  NotificationToggleTile(
                    title: 'Important notices',
                    subtitle: 'Messages from your school or support team.',
                    value: state.preferences.importantNotices,
                    enabled: !state.saving && state.permissionGranted,
                    onChanged: (v) => _update(notifier.updatePreference(importantNotices: v)),
                  ),
                  const Divider(height: 1),
                  NotificationToggleTile(
                    title: 'Camera availability',
                    subtitle: 'Optional alerts when viewing may be limited.',
                    value: state.preferences.cameraStatusNotices,
                    enabled: !state.saving && state.permissionGranted,
                    onChanged: (v) => _update(notifier.updatePreference(cameraStatusNotices: v)),
                  ),
                ],
                if (state.errorMessage != null) ...[
                  const SizedBox(height: AppSpacing.md),
                  Text(
                    state.errorMessage!,
                    style: const TextStyle(color: AppColors.error),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _update(Future<String?> future) async {
    final message = await future;
    if (message != null && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
    }
  }
}
