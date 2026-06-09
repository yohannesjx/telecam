import 'package:flutter/material.dart';
import 'package:school_camera/app/theme.dart';
import 'package:school_camera/core/widgets/app_card.dart';
import 'package:school_camera/features/children/domain/child.dart';

class ChildCard extends StatelessWidget {
  const ChildCard({required this.child, super.key});

  final Child child;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(child.fullName, style: theme.textTheme.titleMedium),
          const SizedBox(height: AppSpacing.sm),
          _Row(label: 'School', value: child.schoolName),
          if (child.classroomName != null && child.classroomName!.isNotEmpty)
            _Row(label: 'Classroom', value: child.classroomName!),
          const SizedBox(height: AppSpacing.sm),
          _StatusChip(status: child.status),
        ],
      ),
    );
  }
}

class _Row extends StatelessWidget {
  const _Row({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.xs),
      child: Text(
        '$label: $value',
        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              color: AppColors.textSecondary,
            ),
      ),
    );
  }
}

class _StatusChip extends StatelessWidget {
  const _StatusChip({required this.status});

  final String status;

  @override
  Widget build(BuildContext context) {
    final isActive = status.toUpperCase() == 'ACTIVE';
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm, vertical: AppSpacing.xs),
      decoration: BoxDecoration(
        color: isActive ? AppColors.primaryLight : AppColors.border.withValues(alpha: 0.5),
        borderRadius: BorderRadius.circular(AppRadius.sm),
      ),
      child: Text(
        status,
        style: Theme.of(context).textTheme.labelLarge?.copyWith(
              color: isActive ? AppColors.primary : AppColors.textSecondary,
            ),
      ),
    );
  }
}
