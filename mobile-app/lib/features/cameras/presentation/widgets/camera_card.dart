import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:school_camera/app/theme.dart';
import 'package:school_camera/features/playback/presentation/live_navigation.dart';
import 'package:school_camera/features/timeline/presentation/timeline_navigation.dart';
import 'package:school_camera/core/widgets/app_button.dart';
import 'package:school_camera/core/widgets/app_card.dart';
import 'package:school_camera/features/cameras/domain/parent_camera.dart';

class CameraCard extends ConsumerWidget {
  const CameraCard({
    required this.camera,
    this.showLiveButton = true,
    super.key,
  });

  final ParentCamera camera;
  final bool showLiveButton;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(camera.cameraName, style: theme.textTheme.titleMedium),
          const SizedBox(height: AppSpacing.sm),
          Text('School: ${camera.schoolName}', style: theme.textTheme.bodyMedium),
          if (camera.classroomName.isNotEmpty) ...[
            const SizedBox(height: AppSpacing.xs),
            Text('Classroom: ${camera.classroomName}', style: theme.textTheme.bodyMedium),
          ],
          if (camera.linkedChildName != null && camera.linkedChildName!.isNotEmpty) ...[
            const SizedBox(height: AppSpacing.xs),
            Text('Child: ${camera.linkedChildName}', style: theme.textTheme.bodyMedium),
          ],
          if (camera.status.isNotEmpty) ...[
            const SizedBox(height: AppSpacing.xs),
            Text('Status: ${camera.status}', style: theme.textTheme.bodyMedium),
          ],
          if (camera.defaultQuality.isNotEmpty) ...[
            const SizedBox(height: AppSpacing.xs),
            Text(
              'Quality: ${camera.defaultQuality}',
              style: theme.textTheme.bodySmall?.copyWith(color: AppColors.textSecondary),
            ),
          ],
          if (showLiveButton) ...[
            const SizedBox(height: AppSpacing.md),
            AppButton(
              label: 'Live',
              icon: Icons.play_circle_outline,
              onPressed: () => openLivePlayerFromCamera(context, ref, camera),
            ),
            const SizedBox(height: AppSpacing.sm),
            AppButton(
              label: 'Recordings',
              icon: Icons.history,
              variant: AppButtonVariant.secondary,
              onPressed: () => openTimelineFromCamera(context, ref, camera),
            ),
          ],
        ],
      ),
    );
  }
}
