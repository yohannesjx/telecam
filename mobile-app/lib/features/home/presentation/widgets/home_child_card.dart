import 'package:flutter/material.dart';
import 'package:school_camera/app/theme.dart';
import 'package:school_camera/features/children/domain/child.dart';
import 'package:school_camera/features/home/presentation/widgets/home_decorations.dart';

class HomeChildCard extends StatelessWidget {
  const HomeChildCard({required this.child, super.key});

  final Child child;

  @override
  Widget build(BuildContext context) {
    final isActive = child.status.toUpperCase() == 'ACTIVE';
    final subtitle = [
      if (child.schoolName.isNotEmpty) child.schoolName,
      if (child.classroomName != null && child.classroomName!.isNotEmpty)
        child.classroomName!,
    ].join(' · ');

    return Container(
      decoration: HomeDecorations.surfaceCard(),
      padding: const EdgeInsets.all(AppSpacing.md),
      child: Row(
        children: [
          _ChildAvatar(name: child.fullName),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  child.fullName,
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                if (subtitle.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(
                    subtitle,
                    style: HomeDecorations.subtitle(context),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
                const SizedBox(height: AppSpacing.sm),
                HomeStatusChip(label: child.status, active: isActive),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ChildAvatar extends StatelessWidget {
  const _ChildAvatar({required this.name});

  final String name;

  @override
  Widget build(BuildContext context) {
    return CircleAvatar(
      radius: 26,
      backgroundColor: AppColors.primaryLight,
      child: Text(
        _initials(name),
        style: const TextStyle(
          fontWeight: FontWeight.w600,
          fontSize: 16,
          color: AppColors.primary,
        ),
      ),
    );
  }

  String _initials(String fullName) {
    final parts = fullName.trim().split(RegExp(r'\s+'));
    if (parts.isEmpty) return '?';
    if (parts.length == 1) return parts.first[0].toUpperCase();
    return '${parts.first[0]}${parts.last[0]}'.toUpperCase();
  }
}
