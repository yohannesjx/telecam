import 'package:flutter/material.dart';
import 'package:school_camera/app/theme.dart';
import 'package:school_camera/core/widgets/app_card.dart';
import 'package:school_camera/features/billing/presentation/widgets/billing_status_badge.dart';
import 'package:school_camera/features/subscription/domain/parent_subscription.dart';

class SubscriptionStatusCard extends StatelessWidget {
  const SubscriptionStatusCard({
    required this.summary,
    super.key,
  });

  final ParentSubscriptionSummary summary;

  @override
  Widget build(BuildContext context) {
    final primary = summary.primarySubscription;
    final theme = Theme.of(context);

    if (primary == null) {
      return AppCard(
        child: Text(
          'We could not confirm your subscription status.',
          style: theme.textTheme.bodyLarge,
        ),
      );
    }

    final headline = primary.isActiveStatus
        ? 'Your access is active'
        : 'Your subscription needs renewal';

    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(headline, style: theme.textTheme.titleLarge),
              ),
              BillingStatusBadge(
                label: primary.statusLabel,
                tone: subscriptionTone(primary.status),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(primary.statusMessage, style: theme.textTheme.bodyLarge),
          if (primary.schoolName.isNotEmpty) ...[
            const SizedBox(height: AppSpacing.sm),
            Text('School: ${primary.schoolName}', style: theme.textTheme.bodyMedium),
          ],
          if (primary.childName != null && primary.childName!.isNotEmpty) ...[
            const SizedBox(height: AppSpacing.xs),
            Text('Child: ${primary.childName}', style: theme.textTheme.bodyMedium),
          ],
        ],
      ),
    );
  }
}
