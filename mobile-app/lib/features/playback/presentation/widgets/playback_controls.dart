import 'package:flutter/material.dart';
import 'package:school_camera/app/theme.dart';

class PlaybackControls extends StatelessWidget {
  const PlaybackControls({
    required this.isPlaying,
    required this.onPlayPause,
    required this.onFullscreen,
    required this.isFullscreen,
    required this.badgeLabel,
    this.showAudioDisabled = true,
    this.position,
    this.duration,
    this.onSeek,
    super.key,
  });

  final bool isPlaying;
  final VoidCallback onPlayPause;
  final VoidCallback onFullscreen;
  final bool isFullscreen;
  final String badgeLabel;
  final bool showAudioDisabled;
  final Duration? position;
  final Duration? duration;
  final ValueChanged<Duration>? onSeek;

  @override
  Widget build(BuildContext context) {
    final showSeek = position != null &&
        duration != null &&
        duration!.inMilliseconds > 0 &&
        onSeek != null;

    return Stack(
      children: [
        Positioned(
          top: AppSpacing.sm,
          left: AppSpacing.sm,
          child: _Badge(label: badgeLabel),
        ),
        if (showAudioDisabled)
          Positioned(
            top: AppSpacing.sm,
            right: AppSpacing.sm,
            child: const _Badge(
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
              icon: Icon(
                isPlaying ? Icons.pause_circle_filled : Icons.play_circle_filled,
              ),
              onPressed: onPlayPause,
            ),
          ),
        ),
        if (showSeek)
          Positioned(
            left: AppSpacing.sm,
            right: AppSpacing.sm,
            bottom: AppSpacing.xl + AppSpacing.sm,
            child: _SeekBar(
              position: position!,
              duration: duration!,
              onSeek: onSeek!,
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

class _SeekBar extends StatelessWidget {
  const _SeekBar({
    required this.position,
    required this.duration,
    required this.onSeek,
  });

  final Duration position;
  final Duration duration;
  final ValueChanged<Duration> onSeek;

  @override
  Widget build(BuildContext context) {
    final maxMs = duration.inMilliseconds.toDouble();
    final value = position.inMilliseconds.clamp(0, duration.inMilliseconds).toDouble();

    return Material(
      color: Colors.black54,
      borderRadius: BorderRadius.circular(AppRadius.sm),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm),
        child: SliderTheme(
          data: SliderTheme.of(context).copyWith(
            trackHeight: 2,
            thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 6),
          ),
          child: Slider(
            value: value,
            max: maxMs > 0 ? maxMs : 1,
            activeColor: Colors.white,
            inactiveColor: Colors.white24,
            onChanged: (v) => onSeek(Duration(milliseconds: v.round())),
          ),
        ),
      ),
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
