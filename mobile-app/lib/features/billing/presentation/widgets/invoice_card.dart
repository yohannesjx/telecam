import 'package:flutter/material.dart';
import 'package:school_camera/app/theme.dart';
import 'package:school_camera/core/widgets/app_card.dart';
import 'package:school_camera/features/billing/domain/billing_formatters.dart';
import 'package:school_camera/features/billing/domain/parent_invoice.dart';
import 'package:school_camera/features/billing/presentation/widgets/billing_status_badge.dart';

class InvoiceCard extends StatelessWidget {
  const InvoiceCard({required this.invoice, super.key});

  final ParentInvoice invoice;

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
                child: Text(
                  'Invoice ${invoice.displayNumber}',
                  style: theme.textTheme.titleMedium,
                ),
              ),
              BillingStatusBadge(
                label: invoice.statusLabel,
                tone: invoiceTone(invoice.status),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(invoice.amountLabel, style: theme.textTheme.titleLarge),
          if (invoice.description != null && invoice.description!.isNotEmpty) ...[
            const SizedBox(height: AppSpacing.xs),
            Text(invoice.description!, style: theme.textTheme.bodyMedium),
          ],
          if (invoice.schoolName != null && invoice.schoolName!.isNotEmpty) ...[
            const SizedBox(height: AppSpacing.xs),
            Text('School: ${invoice.schoolName}', style: theme.textTheme.bodyMedium),
          ],
          const SizedBox(height: AppSpacing.sm),
          if (invoice.dueDate != null)
            Text('Due ${BillingFormatters.formatDate(invoice.dueDate)}'),
          if (invoice.paidAt != null) ...[
            const SizedBox(height: AppSpacing.xs),
            Text(
              'Paid ${BillingFormatters.formatDateTime(invoice.paidAt)}',
              style: theme.textTheme.bodySmall?.copyWith(color: AppColors.success),
            ),
          ],
        ],
      ),
    );
  }
}
