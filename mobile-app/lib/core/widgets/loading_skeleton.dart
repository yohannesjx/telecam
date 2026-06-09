import 'package:flutter/material.dart';
import 'package:school_camera/app/theme.dart';
import 'package:school_camera/core/widgets/app_card.dart';

/// Simple shimmer-style placeholder blocks.
class LoadingSkeleton extends StatelessWidget {
  const LoadingSkeleton({this.lines = 3, super.key});

  final int lines;

  @override
  Widget build(BuildContext context) {
    final base = Theme.of(context).colorScheme.surfaceContainerHighest;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: List.generate(lines, (i) {
        return Padding(
          padding: EdgeInsets.only(bottom: i < lines - 1 ? AppSpacing.sm : 0),
          child: Container(
            height: i == 0 ? 20 : 14,
            width: i == 0 ? double.infinity : (i == 1 ? 200.0 : 140.0),
            decoration: BoxDecoration(
              color: base,
              borderRadius: BorderRadius.circular(AppRadius.sm),
            ),
          ),
        );
      }),
    );
  }
}

class CardLoadingSkeleton extends StatelessWidget {
  const CardLoadingSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return const AppCard(
      child: LoadingSkeleton(lines: 4),
    );
  }
}
