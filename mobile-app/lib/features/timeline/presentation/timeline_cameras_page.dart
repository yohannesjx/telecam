import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:school_camera/app/theme.dart';
import 'package:school_camera/core/widgets/app_button.dart';
import 'package:school_camera/core/widgets/async_section.dart';
import 'package:school_camera/core/widgets/loading_skeleton.dart';
import 'package:school_camera/features/cameras/application/parent_cameras_controller.dart';
import 'package:school_camera/features/cameras/domain/parent_camera.dart';
import 'package:school_camera/features/timeline/presentation/timeline_navigation.dart';
import 'package:school_camera/core/widgets/app_card.dart';

/// Timeline tab — pick a camera to view recordings.
class TimelineCamerasPage extends ConsumerWidget {
  const TimelineCamerasPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cameras = ref.watch(parentCamerasControllerProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Timeline')),
      body: RefreshIndicator(
        onRefresh: () => ref.read(parentCamerasControllerProvider.notifier).refresh(),
        child: ListView(
          padding: const EdgeInsets.all(AppSpacing.lg),
          physics: const AlwaysScrollableScrollPhysics(),
          children: [
            Text(
              'Choose a camera to view past recordings.',
              style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                    color: AppColors.textSecondary,
                  ),
            ),
            const SizedBox(height: AppSpacing.lg),
            AsyncSection<List<ParentCamera>>(
              asyncValue: cameras,
              onRetry: () => ref.read(parentCamerasControllerProvider.notifier).refresh(),
              emptyMessage: 'No cameras available for recordings yet.',
              loadingBuilder: () => const CardLoadingSkeleton(),
              dataBuilder: (list) => Column(
                children: [
                  for (final cam in list) ...[
                    _TimelineCameraCard(camera: cam),
                    const SizedBox(height: AppSpacing.sm),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _TimelineCameraCard extends ConsumerWidget {
  const _TimelineCameraCard({required this.camera});

  final ParentCamera camera;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(camera.cameraName, style: Theme.of(context).textTheme.titleMedium),
          if (camera.schoolName.isNotEmpty) ...[
            const SizedBox(height: AppSpacing.xs),
            Text('School: ${camera.schoolName}'),
          ],
          if (camera.classroomName.isNotEmpty) ...[
            const SizedBox(height: AppSpacing.xs),
            Text('Classroom: ${camera.classroomName}'),
          ],
          const SizedBox(height: AppSpacing.md),
          AppButton(
            label: 'View recordings',
            icon: Icons.history,
            onPressed: () => openTimelineFromCamera(context, ref, camera),
          ),
        ],
      ),
    );
  }
}
