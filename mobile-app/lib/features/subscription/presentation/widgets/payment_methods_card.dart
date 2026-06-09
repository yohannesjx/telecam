import 'package:flutter/material.dart';
import 'package:school_camera/app/theme.dart';
import 'package:school_camera/core/widgets/app_card.dart';
import 'package:school_camera/features/subscription/domain/payment_method_info.dart';

class PaymentMethodsCard extends StatelessWidget {
  const PaymentMethodsCard({required this.methods, super.key});

  final List<PaymentMethodInfo> methods;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Payment methods', style: theme.textTheme.titleMedium),
          const SizedBox(height: AppSpacing.md),
          if (methods.isEmpty)
            Text(
              'Please contact the school office for payment instructions.',
              style: theme.textTheme.bodyLarge,
            )
          else
            for (final method in methods) ...[
              Text(method.label, style: theme.textTheme.titleSmall),
              if (method.instructions != null) ...[
                const SizedBox(height: AppSpacing.xs),
                Text(
                  method.instructions!,
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
              const SizedBox(height: AppSpacing.md),
            ],
        ],
      ),
    );
  }
}
