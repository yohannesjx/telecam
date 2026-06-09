import 'package:flutter/material.dart';
import 'package:school_camera/app/theme.dart';
import 'package:school_camera/core/widgets/app_card.dart';
import 'package:school_camera/features/billing/domain/billing_formatters.dart';
import 'package:school_camera/features/billing/domain/parent_payment.dart';
import 'package:school_camera/features/billing/presentation/widgets/billing_status_badge.dart';

class PaymentCard extends StatelessWidget {
  const PaymentCard({required this.payment, super.key});

  final ParentPayment payment;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(payment.amountLabel, style: theme.textTheme.titleMedium),
              ),
              BillingStatusBadge(
                label: payment.statusLabel,
                tone: paymentTone(payment.status),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(payment.methodLabel, style: theme.textTheme.bodyLarge),
          if (payment.schoolName != null && payment.schoolName!.isNotEmpty) ...[
            const SizedBox(height: AppSpacing.xs),
            Text('School: ${payment.schoolName}', style: theme.textTheme.bodyMedium),
          ],
          if (payment.reference != null && payment.reference!.isNotEmpty) ...[
            const SizedBox(height: AppSpacing.xs),
            Text('Reference: ${payment.reference}', style: theme.textTheme.bodyMedium),
          ],
          const SizedBox(height: AppSpacing.sm),
          Text(
            'Submitted ${BillingFormatters.formatDateTime(payment.createdAt)}',
            style: theme.textTheme.bodySmall?.copyWith(color: AppColors.textSecondary),
          ),
          if (payment.approvedAt != null) ...[
            const SizedBox(height: AppSpacing.xs),
            Text(
              'Approved ${BillingFormatters.formatDateTime(payment.approvedAt)}',
              style: theme.textTheme.bodySmall?.copyWith(color: AppColors.success),
            ),
          ],
          if (payment.rejectedAt != null) ...[
            const SizedBox(height: AppSpacing.xs),
            Text(
              'Rejected ${BillingFormatters.formatDateTime(payment.rejectedAt)}',
              style: theme.textTheme.bodySmall?.copyWith(color: AppColors.error),
            ),
          ],
        ],
      ),
    );
  }
}
