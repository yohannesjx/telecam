import 'package:flutter/material.dart';
import 'package:school_camera/app/theme.dart';
import 'package:school_camera/core/utils/account_formatters.dart';
import 'package:school_camera/core/widgets/app_card.dart';
import 'package:school_camera/features/auth/data/models/auth_user.dart';

class ProfileSection extends StatelessWidget {
  const ProfileSection({
    super.key,
    required this.user,
    this.showWarning = false,
  });

  final AuthUser user;
  final bool showWarning;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Profile', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: AppSpacing.md),
          if (showWarning) ...[
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(AppSpacing.md),
              decoration: BoxDecoration(
                color: const Color(0xFFFEF3C7),
                borderRadius: BorderRadius.circular(AppRadius.md),
              ),
              child: const Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(Icons.warning_amber_rounded, color: Color(0xFFB45309)),
                  SizedBox(width: AppSpacing.sm),
                  Expanded(
                    child: Text(
                      'Your account is not active. Some features may be unavailable.',
                      style: TextStyle(color: Color(0xFFB45309), fontSize: 14),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.md),
          ],
          _line(context, 'Name', user.name ?? '—'),
          _line(context, 'Email', user.email),
          _line(context, 'Role', AccountFormatters.roleLabel(user.role)),
          _line(context, 'Status', AccountFormatters.statusLabel(user.status)),
        ],
      ),
    );
  }

  Widget _line(BuildContext context, String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 72,
            child: Text(label, style: Theme.of(context).textTheme.bodyMedium),
          ),
          Expanded(
            child: Text(value, style: Theme.of(context).textTheme.bodyLarge),
          ),
        ],
      ),
    );
  }
}
