import 'package:flutter/material.dart';
import 'package:school_camera/app/theme.dart';
import 'package:school_camera/core/widgets/app_card.dart';
import 'package:school_camera/features/billing/domain/billing_formatters.dart';
import 'package:school_camera/features/subscription/domain/parent_subscription.dart';

class DaysRemainingCard extends StatelessWidget {
  const DaysRemainingCard({required this.summary, super.key});

  final ParentSubscriptionSummary summary;

  @override
  Widget build(BuildContext context) {
    final primary = summary.primarySubscription;
    final theme = Theme.of(context);

    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Access period', style: theme.textTheme.titleMedium),
          const SizedBox(height: AppSpacing.md),
          if (primary?.daysRemaining != null) ...[
            Text(
              BillingFormatters.formatDaysRemaining(primary!.daysRemaining),
              style: theme.textTheme.headlineSmall?.copyWith(
                color: AppColors.primary,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: AppSpacing.sm),
          ],
          _Row(
            label: 'Playback allowed',
            value: summary.playbackAllowedNullable == null
                ? 'Unknown'
                : summary.playbackAllowed ? 'Yes' : 'No',
          ),
          const SizedBox(height: AppSpacing.xs),
          Text(
            BillingFormatters.formatPlaybackAllowedMessage(
              summary.playbackAllowedNullable,
            ),
            style: theme.textTheme.bodyMedium?.copyWith(
              color: AppColors.textSecondary,
            ),
          ),
          if (primary?.startsAt != null) ...[
            const SizedBox(height: AppSpacing.md),
            _Row(label: 'Start date', value: BillingFormatters.formatDate(primary!.startsAt)),
          ],
          if (primary?.endsAt != null)
            _Row(label: 'End date', value: BillingFormatters.formatDate(primary!.endsAt)),
        ],
      ),
    );
  }
}

class _Row extends StatelessWidget {
  const _Row({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.xs),
      child: Row(
        children: [
          Expanded(child: Text(label)),
          Text(value, style: const TextStyle(fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}
