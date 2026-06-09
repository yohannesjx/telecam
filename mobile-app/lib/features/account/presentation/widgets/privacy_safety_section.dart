import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:school_camera/app/router.dart';
import 'package:school_camera/app/theme.dart';
import 'package:school_camera/core/widgets/app_card.dart';

class PrivacySafetySection extends StatelessWidget {
  const PrivacySafetySection({super.key});

  @override
  Widget build(BuildContext context) {
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Privacy & safety', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: AppSpacing.sm),
          Text(
            'Learn how live viewing and recordings are protected for your child.',
            style: Theme.of(context).textTheme.bodyMedium,
          ),
          const SizedBox(height: AppSpacing.md),
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: const Icon(Icons.shield_outlined, color: AppColors.primary),
            title: const Text('Privacy & safety info'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => context.push(AppRoutes.privacySafety),
          ),
        ],
      ),
    );
  }
}
