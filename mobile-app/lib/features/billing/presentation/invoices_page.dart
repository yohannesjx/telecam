import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:school_camera/app/theme.dart';
import 'package:school_camera/core/widgets/async_section.dart';
import 'package:school_camera/core/widgets/loading_skeleton.dart';
import 'package:school_camera/features/billing/application/invoices_controller.dart';
import 'package:school_camera/features/billing/domain/parent_invoice.dart';
import 'package:school_camera/features/billing/presentation/widgets/invoice_card.dart';

class InvoicesPage extends ConsumerWidget {
  const InvoicesPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final invoices = ref.watch(invoicesControllerProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Invoices')),
      body: RefreshIndicator(
        onRefresh: () => ref.read(invoicesControllerProvider.notifier).refresh(),
        child: ListView(
          padding: const EdgeInsets.all(AppSpacing.lg),
          physics: const AlwaysScrollableScrollPhysics(),
          children: [
            AsyncSection<List<ParentInvoice>>(
              asyncValue: invoices,
              onRetry: () => ref.read(invoicesControllerProvider.notifier).refresh(),
              emptyMessage: 'No invoices yet.',
              loadingBuilder: () => const CardLoadingSkeleton(),
              dataBuilder: (list) => Column(
                children: [
                  for (final invoice in list) ...[
                    InvoiceCard(invoice: invoice),
                    const SizedBox(height: AppSpacing.sm),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
