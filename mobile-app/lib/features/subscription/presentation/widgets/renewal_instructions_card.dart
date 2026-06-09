import 'package:flutter/material.dart';
import 'package:school_camera/app/theme.dart';
import 'package:school_camera/core/widgets/app_card.dart';
import 'package:school_camera/features/subscription/domain/parent_subscription.dart';

class RenewalInstructionsCard extends StatelessWidget {
  const RenewalInstructionsCard({required this.summary, super.key});

  final ParentSubscriptionSummary summary;

  @override
  Widget build(BuildContext context) {
    final needsRenewal = !summary.playbackAllowed;
    final theme = Theme.of(context);

    final body = needsRenewal
        ? 'Please contact the school or use one of the payment methods below. '
            'Pending payments are reviewed manually by the school. '
            'Approved payments may activate or extend your subscription.'
        : 'Your subscription is active. When it is time to renew, '
            'contact the school office or use the payment methods listed above. '
            'Approved payments may extend your access.';

    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Renewal instructions', style: theme.textTheme.titleMedium),
          const SizedBox(height: AppSpacing.md),
          Text(body, style: theme.textTheme.bodyLarge),
        ],
      ),
    );
  }
}
