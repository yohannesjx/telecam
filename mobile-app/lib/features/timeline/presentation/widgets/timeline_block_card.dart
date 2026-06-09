import 'package:flutter/material.dart';
import 'package:school_camera/app/theme.dart';
import 'package:school_camera/core/widgets/app_button.dart';
import 'package:school_camera/core/widgets/app_card.dart';
import 'package:school_camera/features/timeline/domain/timeline_block.dart';
import 'package:school_camera/features/timeline/presentation/widgets/timeline_gap_warning.dart';

class TimelineBlockCard extends StatelessWidget {
  const TimelineBlockCard({
    required this.block,
    required this.onPlay,
    super.key,
  });

  final TimelineBlock block;
  final VoidCallback onPlay;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(block.formatTimeRange(), style: theme.textTheme.titleMedium),
          const SizedBox(height: AppSpacing.xs),
          Text(
            block.formatDurationLabel(),
            style: theme.textTheme.bodyMedium?.copyWith(
              color: AppColors.textSecondary,
            ),
          ),
          if (block.quality != null && block.quality!.isNotEmpty) ...[
            const SizedBox(height: AppSpacing.xs),
            Text('Quality: ${block.quality}', style: theme.textTheme.bodySmall),
          ],
          if (block.hasGaps) ...[
            const SizedBox(height: AppSpacing.sm),
            Text(
              TimelineGapWarning.defaultMessage,
              style: theme.textTheme.bodySmall?.copyWith(color: AppColors.warning),
            ),
          ],
          const SizedBox(height: AppSpacing.md),
          AppButton(
            label: 'Play',
            icon: Icons.play_circle_outline,
            onPressed: onPlay,
          ),
        ],
      ),
    );
  }
}
