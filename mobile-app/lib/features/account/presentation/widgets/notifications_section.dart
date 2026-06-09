import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:school_camera/app/router.dart';
import 'package:school_camera/app/theme.dart';
import 'package:school_camera/core/widgets/app_card.dart';

class NotificationsSection extends StatelessWidget {
  const NotificationsSection({super.key});

  @override
  Widget build(BuildContext context) {
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Notifications', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: AppSpacing.sm),
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: const Icon(Icons.notifications_outlined, color: AppColors.primary),
            title: const Text('Notification settings'),
            subtitle: const Text('Subscription, payment, and school notices'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => context.push(AppRoutes.notificationSettings),
          ),
        ],
      ),
    );
  }
}
