import 'package:flutter/material.dart';
import 'package:school_camera/app/theme.dart';

class LivePlayerControls extends StatelessWidget {
  const LivePlayerControls({
    required this.isPlaying,
    required this.onPlayPause,
    required this.onFullscreen,
    required this.isFullscreen,
    required this.delayLabel,
    this.showAudioDisabled = true,
    super.key,
  });

  final bool isPlaying;
  final VoidCallback onPlayPause;
  final VoidCallback onFullscreen;
  final bool isFullscreen;
  final String delayLabel;
  final bool showAudioDisabled;

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        Positioned(
          top: AppSpacing.sm,
          left: AppSpacing.sm,
          child: _Badge(label: delayLabel),
        ),
        if (showAudioDisabled)
          Positioned(
            top: AppSpacing.sm,
            right: AppSpacing.sm,
            child: _Badge(
              label: 'Audio disabled',
              icon: Icons.volume_off_outlined,
            ),
          ),
        Center(
          child: Material(
            color: Colors.black45,
            shape: const CircleBorder(),
            child: IconButton(
              iconSize: 56,
              color: Colors.white,
              icon: Icon(isPlaying ? Icons.pause_circle_filled : Icons.play_circle_filled),
              onPressed: onPlayPause,
            ),
          ),
        ),
        Positioned(
          bottom: AppSpacing.sm,
          right: AppSpacing.sm,
          child: IconButton(
            style: IconButton.styleFrom(
              backgroundColor: Colors.black45,
              foregroundColor: Colors.white,
            ),
            icon: Icon(isFullscreen ? Icons.fullscreen_exit : Icons.fullscreen),
            onPressed: onFullscreen,
          ),
        ),
      ],
    );
  }
}

class _Badge extends StatelessWidget {
  const _Badge({required this.label, this.icon});

  final String label;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.sm,
        vertical: AppSpacing.xs,
      ),
      decoration: BoxDecoration(
        color: Colors.black54,
        borderRadius: BorderRadius.circular(AppRadius.sm),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 14, color: Colors.white70),
            const SizedBox(width: 4),
          ],
          Text(
            label,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 12,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}
