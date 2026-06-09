import 'package:flutter/material.dart';
import 'package:school_camera/app/theme.dart';
import 'package:school_camera/core/widgets/app_card.dart';

class TimelineGapWarning extends StatelessWidget {
  const TimelineGapWarning({this.message, super.key});

  final String? message;

  static const String defaultMessage =
      'Some parts of this recording may be missing.';

  @override
  Widget build(BuildContext context) {
    return AppCard(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(Icons.warning_amber_rounded, color: AppColors.warning),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Text(
              message ?? defaultMessage,
              style: Theme.of(context).textTheme.bodyMedium,
            ),
          ),
        ],
      ),
    );
  }
}
