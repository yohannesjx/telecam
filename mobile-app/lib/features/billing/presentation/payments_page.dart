import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:school_camera/app/theme.dart';
import 'package:school_camera/core/widgets/async_section.dart';
import 'package:school_camera/core/widgets/loading_skeleton.dart';
import 'package:school_camera/features/billing/application/payments_controller.dart';
import 'package:school_camera/features/billing/domain/parent_payment.dart';
import 'package:school_camera/features/billing/presentation/widgets/payment_card.dart';

class PaymentsPage extends ConsumerWidget {
  const PaymentsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final payments = ref.watch(paymentsControllerProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Payment history')),
      body: RefreshIndicator(
        onRefresh: () => ref.read(paymentsControllerProvider.notifier).refresh(),
        child: ListView(
          padding: const EdgeInsets.all(AppSpacing.lg),
          physics: const AlwaysScrollableScrollPhysics(),
          children: [
            Text(
              'Approved payments may activate or extend your subscription.',
              style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                    color: AppColors.textSecondary,
                  ),
            ),
            const SizedBox(height: AppSpacing.lg),
            AsyncSection<List<ParentPayment>>(
              asyncValue: payments,
              onRetry: () => ref.read(paymentsControllerProvider.notifier).refresh(),
              emptyMessage: 'No payments yet.',
              loadingBuilder: () => const CardLoadingSkeleton(),
              dataBuilder: (list) => Column(
                children: [
                  for (final payment in list) ...[
                    PaymentCard(payment: payment),
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
