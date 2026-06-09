import 'package:flutter/material.dart';
import 'package:school_camera/app/theme.dart';
import 'package:school_camera/core/widgets/app_card.dart';
import 'package:school_camera/features/billing/domain/billing_formatters.dart';
import 'package:school_camera/features/subscription/domain/parent_subscription.dart';

/// Compact subscription summary for the home screen.
class SubscriptionSummaryCard extends StatelessWidget {
  const SubscriptionSummaryCard({
    required this.summary,
    this.compact = false,
    super.key,
  });

  final ParentSubscriptionSummary summary;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final primary = summary.primarySubscription;

    if (primary == null) {
      return AppCard(
        child: Text(
          'We could not confirm your subscription status.',
          style: theme.textTheme.bodyLarge,
        ),
      );
    }

    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(summary.primaryStatusMessage, style: theme.textTheme.titleMedium),
          const SizedBox(height: AppSpacing.md),
          _InfoRow(
            label: 'Playback allowed',
            value: summary.playbackAllowedNullable == null
                ? 'Unknown'
                : summary.playbackAllowed
                    ? 'Yes'
                    : 'No',
            highlight: summary.playbackAllowedNullable,
          ),
          if (!summary.playbackAllowed) ...[
            const SizedBox(height: AppSpacing.sm),
            Text(
              'Renew your subscription to continue watching.',
              style: theme.textTheme.bodyMedium?.copyWith(color: AppColors.warning),
            ),
          ],
          if (!compact) ...[
            const SizedBox(height: AppSpacing.md),
            const Divider(height: 1),
            const SizedBox(height: AppSpacing.md),
            Text(primary.schoolName, style: theme.textTheme.titleSmall),
            const SizedBox(height: AppSpacing.sm),
            _InfoRow(label: 'Status', value: primary.statusLabel),
            if (primary.daysRemaining != null)
              _InfoRow(
                label: 'Days remaining',
                value: BillingFormatters.formatDaysRemaining(primary.daysRemaining),
              ),
            if (primary.endsAt != null)
              _InfoRow(
                label: 'End date',
                value: BillingFormatters.formatDate(primary.endsAt),
              ),
          ],
        ],
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({
    required this.label,
    required this.value,
    this.highlight,
  });

  final String label;
  final String value;
  final bool? highlight;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.xs),
      child: Row(
        children: [
          Expanded(
            child: Text(label, style: Theme.of(context).textTheme.bodyMedium),
          ),
          Text(
            value,
            style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                  fontWeight: FontWeight.w600,
                  color: highlight == true
                      ? AppColors.success
                      : highlight == false
                          ? AppColors.error
                          : null,
                ),
          ),
        ],
      ),
    );
  }
}
