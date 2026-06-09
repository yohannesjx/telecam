import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:school_camera/app/router.dart';
import 'package:school_camera/app/theme.dart';
import 'package:school_camera/core/widgets/app_button.dart';
import 'package:school_camera/core/widgets/app_card.dart';
import 'package:school_camera/core/widgets/async_section.dart';
import 'package:school_camera/core/widgets/loading_skeleton.dart';
import 'package:school_camera/features/billing/application/invoices_controller.dart';
import 'package:school_camera/features/billing/application/payments_controller.dart';
import 'package:school_camera/features/billing/domain/parent_invoice.dart';
import 'package:school_camera/features/billing/domain/parent_payment.dart';
import 'package:school_camera/features/billing/presentation/widgets/invoice_card.dart';
import 'package:school_camera/features/billing/presentation/widgets/payment_card.dart';
import 'package:school_camera/features/subscription/application/billing_refresh.dart';
import 'package:school_camera/features/subscription/application/subscription_controller.dart';
import 'package:school_camera/features/subscription/domain/parent_subscription.dart';
import 'package:school_camera/features/subscription/presentation/widgets/days_remaining_card.dart';
import 'package:school_camera/features/subscription/presentation/widgets/payment_methods_card.dart';
import 'package:school_camera/features/subscription/presentation/widgets/renewal_instructions_card.dart';
import 'package:school_camera/features/subscription/presentation/widgets/subscription_status_card.dart';

class SubscriptionPage extends ConsumerWidget {
  const SubscriptionPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final subscriptions = ref.watch(subscriptionControllerProvider);
    final payments = ref.watch(paymentsControllerProvider);
    final invoices = ref.watch(invoicesControllerProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Subscription')),
      body: RefreshIndicator(
        onRefresh: () => refreshSubscriptionBilling(ref),
        child: ListView(
          padding: const EdgeInsets.all(AppSpacing.lg),
          physics: const AlwaysScrollableScrollPhysics(),
          children: [
            AsyncSection<List<ParentSubscription>>(
              asyncValue: subscriptions,
              onRetry: () => ref.read(subscriptionControllerProvider.notifier).refresh(),
              emptyMessage: 'We could not confirm your subscription status.',
              loadingBuilder: () => const CardLoadingSkeleton(),
              dataBuilder: (list) {
                final summary = ParentSubscriptionSummary(subscriptions: list);
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    SubscriptionStatusCard(summary: summary),
                    const SizedBox(height: AppSpacing.md),
                    DaysRemainingCard(summary: summary),
                    const SizedBox(height: AppSpacing.md),
                    PaymentMethodsCard(methods: summary.allPaymentMethods),
                    const SizedBox(height: AppSpacing.md),
                    RenewalInstructionsCard(summary: summary),
                    if (list.length > 1) ...[
                      const SizedBox(height: AppSpacing.xl),
                      Text('All schools', style: Theme.of(context).textTheme.titleLarge),
                      const SizedBox(height: AppSpacing.md),
                      for (final sub in list) ...[
                        _SchoolSubscriptionTile(subscription: sub),
                        const SizedBox(height: AppSpacing.sm),
                      ],
                    ],
                  ],
                );
              },
            ),
            const SizedBox(height: AppSpacing.xl),
            _RecentPaymentsSection(payments: payments),
            const SizedBox(height: AppSpacing.xl),
            _RecentInvoicesSection(invoices: invoices),
          ],
        ),
      ),
    );
  }
}

class _SchoolSubscriptionTile extends StatelessWidget {
  const _SchoolSubscriptionTile({required this.subscription});

  final ParentSubscription subscription;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(subscription.schoolName, style: Theme.of(context).textTheme.titleSmall),
          const SizedBox(height: AppSpacing.xs),
          Text('${subscription.statusLabel} · ${subscription.playbackMessage}'),
        ],
      ),
    );
  }
}

class _RecentPaymentsSection extends ConsumerWidget {
  const _RecentPaymentsSection({required this.payments});

  final AsyncValue<List<ParentPayment>> payments;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Expanded(
              child: Text('Recent payments', style: Theme.of(context).textTheme.titleLarge),
            ),
            TextButton(
              onPressed: () => context.push(AppRoutes.billingPayments),
              child: const Text('See all'),
            ),
          ],
        ),
        const SizedBox(height: AppSpacing.sm),
        Text(
          'Pending payments are reviewed manually by the school.',
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: AppColors.textSecondary,
              ),
        ),
        const SizedBox(height: AppSpacing.md),
        AsyncSection<List<ParentPayment>>(
          asyncValue: payments,
          onRetry: () => ref.read(paymentsControllerProvider.notifier).refresh(),
          emptyMessage: 'No payments yet.',
          loadingBuilder: () => const CardLoadingSkeleton(),
          dataBuilder: (list) {
            final recent = list.take(3).toList();
            return Column(
              children: [
                for (final p in recent) ...[
                  PaymentCard(payment: p),
                  const SizedBox(height: AppSpacing.sm),
                ],
                if (list.length > 3)
                  AppButton(
                    label: 'View all payments',
                    variant: AppButtonVariant.secondary,
                    onPressed: () => context.push(AppRoutes.billingPayments),
                  ),
              ],
            );
          },
        ),
      ],
    );
  }
}

class _RecentInvoicesSection extends ConsumerWidget {
  const _RecentInvoicesSection({required this.invoices});

  final AsyncValue<List<ParentInvoice>> invoices;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Expanded(
              child: Text('Invoices', style: Theme.of(context).textTheme.titleLarge),
            ),
            TextButton(
              onPressed: () => context.push(AppRoutes.billingInvoices),
              child: const Text('See all'),
            ),
          ],
        ),
        const SizedBox(height: AppSpacing.md),
        AsyncSection<List<ParentInvoice>>(
          asyncValue: invoices,
          onRetry: () => ref.read(invoicesControllerProvider.notifier).refresh(),
          emptyMessage: 'No invoices yet.',
          loadingBuilder: () => const CardLoadingSkeleton(),
          dataBuilder: (list) {
            final recent = list.take(3).toList();
            return Column(
              children: [
                for (final inv in recent) ...[
                  InvoiceCard(invoice: inv),
                  const SizedBox(height: AppSpacing.sm),
                ],
                if (list.length > 3)
                  AppButton(
                    label: 'View all invoices',
                    variant: AppButtonVariant.secondary,
                    onPressed: () => context.push(AppRoutes.billingInvoices),
                  ),
              ],
            );
          },
        ),
      ],
    );
  }
}
