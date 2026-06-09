import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:school_camera/app/theme.dart';
import 'package:school_camera/core/widgets/async_section.dart';
import 'package:school_camera/core/widgets/loading_skeleton.dart';
import 'package:school_camera/features/cameras/application/parent_cameras_controller.dart';
import 'package:school_camera/features/cameras/domain/parent_camera.dart';
import 'package:school_camera/features/cameras/presentation/widgets/camera_card.dart';
/// Live tab — camera list only (no player in Phase 3).
class CamerasPage extends ConsumerWidget {
  const CamerasPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cameras = ref.watch(parentCamerasControllerProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Live')),
      body: RefreshIndicator(
        onRefresh: () => ref.read(parentCamerasControllerProvider.notifier).refresh(),
        child: ListView(
          padding: const EdgeInsets.all(AppSpacing.lg),
          physics: const AlwaysScrollableScrollPhysics(),
          children: [
            Text(
              'Available cameras',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    color: AppColors.textSecondary,
                  ),
            ),
            const SizedBox(height: AppSpacing.md),
            AsyncSection<List<ParentCamera>>(
              asyncValue: cameras,
              onRetry: () => ref.read(parentCamerasControllerProvider.notifier).refresh(),
              emptyMessage: 'No cameras are available for your account yet.',
              loadingBuilder: () => const CardLoadingSkeleton(),
              dataBuilder: (list) => Column(
                children: [
                  for (final cam in list) ...[
                    CameraCard(camera: cam),
                    const SizedBox(height: AppSpacing.sm),
                  ],
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.lg),
            Text(
              'Live viewing is delayed for safety.',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: AppColors.textSecondary,
                  ),
            ),
          ],
        ),
      ),
    );
  }
}
