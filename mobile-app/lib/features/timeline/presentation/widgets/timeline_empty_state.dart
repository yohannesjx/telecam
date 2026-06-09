import 'package:flutter/material.dart';
import 'package:school_camera/app/theme.dart';
import 'package:school_camera/core/widgets/app_card.dart';

class TimelineEmptyState extends StatelessWidget {
  const TimelineEmptyState({super.key});

  @override
  Widget build(BuildContext context) {
    return AppCard(
      child: Column(
        children: [
          Icon(Icons.event_busy, size: 48, color: Theme.of(context).colorScheme.primary),
          const SizedBox(height: AppSpacing.md),
          Text(
            'No recordings for this date',
            style: Theme.of(context).textTheme.titleMedium,
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(
            'Try another day or pull down to refresh.',
            style: Theme.of(context).textTheme.bodyMedium,
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}
