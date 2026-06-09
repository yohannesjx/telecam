import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:school_camera/app/theme.dart';
import 'package:school_camera/core/widgets/app_button.dart';
import 'package:school_camera/features/cameras/domain/parent_camera.dart';
import 'package:school_camera/features/home/presentation/widgets/home_decorations.dart';
import 'package:school_camera/features/playback/presentation/live_navigation.dart';

class HomeCameraHeroCard extends ConsumerWidget {
  const HomeCameraHeroCard({required this.camera, super.key});

  final ParentCamera camera;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isActive = camera.status.toUpperCase() == 'ACTIVE';

    return Container(
      decoration: HomeDecorations.surfaceCard(),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _PreviewHeader(
            cameraName: camera.cameraName,
            isLive: isActive,
            onTap: () => openLivePlayerFromCamera(context, ref, camera),
          ),
          Padding(
            padding: const EdgeInsets.all(AppSpacing.md),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _MetaRow(icon: Icons.school_outlined, text: camera.schoolName),
                if (camera.classroomName.isNotEmpty)
                  _MetaRow(
                    icon: Icons.meeting_room_outlined,
                    text: camera.classroomName,
                  ),
                _MetaRow(
                  icon: Icons.hd_outlined,
                  text: _formatQuality(camera.defaultQuality),
                ),
                const SizedBox(height: AppSpacing.md),
                AppButton(
                  label: 'Watch live',
                  icon: Icons.play_arrow_rounded,
                  onPressed: () => openLivePlayerFromCamera(context, ref, camera),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  String _formatQuality(String raw) {
    if (raw.isEmpty) return 'HD quality';
    return raw;
  }
}

class HomeCameraListTile extends StatelessWidget {
  const HomeCameraListTile({
    required this.camera,
    required this.onTap,
    super.key,
  });

  final ParentCamera camera;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: HomeDecorations.cardSurface,
      borderRadius: BorderRadius.circular(HomeDecorations.cardRadius),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(HomeDecorations.cardRadius),
        child: Container(
          decoration: HomeDecorations.surfaceCard(),
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.md,
            vertical: AppSpacing.md,
          ),
          child: Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: AppColors.primaryLight,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.videocam_outlined, color: AppColors.primary),
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      camera.cameraName,
                      style: Theme.of(context).textTheme.titleSmall?.copyWith(
                            fontWeight: FontWeight.w600,
                          ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    Text(
                      camera.classroomName.isNotEmpty
                          ? camera.classroomName
                          : camera.schoolName,
                      style: HomeDecorations.subtitle(context),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right, color: AppColors.textSecondary),
            ],
          ),
        ),
      ),
    );
  }
}

class _PreviewHeader extends StatelessWidget {
  const _PreviewHeader({
    required this.cameraName,
    required this.isLive,
    required this.onTap,
  });

  final String cameraName;
  final bool isLive;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        child: AspectRatio(
          aspectRatio: 16 / 9,
          child: Stack(
            fit: StackFit.expand,
            children: [
              DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      const Color(0xFFCBD5E1),
                      const Color(0xFF94A3B8),
                    ],
                  ),
                ),
                child: Icon(
                  Icons.class_outlined,
                  size: 64,
                  color: Colors.white.withValues(alpha: 0.35),
                ),
              ),
              DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      Colors.black.withValues(alpha: 0.35),
                      Colors.transparent,
                      Colors.black.withValues(alpha: 0.2),
                    ],
                  ),
                ),
              ),
              Positioned(
                left: AppSpacing.md,
                right: AppSpacing.md,
                top: AppSpacing.md,
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        cameraName,
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w600,
                          fontSize: 15,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    if (isLive) const HomeLiveBadge(),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class HomeLiveBadge extends StatelessWidget {
  const HomeLiveBadge({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: HomeDecorations.liveGreen,
        borderRadius: BorderRadius.circular(8),
      ),
      child: const Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.circle, size: 6, color: Colors.white),
          SizedBox(width: 5),
          Text(
            'LIVE',
            style: TextStyle(
              color: Colors.white,
              fontSize: 11,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.4,
            ),
          ),
        ],
      ),
    );
  }
}

class _MetaRow extends StatelessWidget {
  const _MetaRow({required this.icon, required this.text});

  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    if (text.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.xs),
      child: Row(
        children: [
          Icon(icon, size: 18, color: AppColors.textSecondary),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Text(
              text,
              style: HomeDecorations.subtitle(context).copyWith(
                color: AppColors.textPrimary,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }
}
