import 'package:flutter/material.dart';
import 'package:school_camera/app/theme.dart';
import 'package:school_camera/features/timeline/domain/timeline_block.dart';
import 'package:school_camera/features/timeline/presentation/widgets/timeline_block_card.dart';

class TimelineBlocks extends StatelessWidget {
  const TimelineBlocks({
    required this.blocks,
    required this.onPlayBlock,
    super.key,
  });

  final List<TimelineBlock> blocks;
  final void Function(TimelineBlock block) onPlayBlock;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          'Available recordings',
          style: Theme.of(context).textTheme.titleLarge,
        ),
        const SizedBox(height: AppSpacing.md),
        for (final block in blocks) ...[
          TimelineBlockCard(
            block: block,
            onPlay: () => onPlayBlock(block),
          ),
          const SizedBox(height: AppSpacing.sm),
        ],
      ],
    );
  }
}
