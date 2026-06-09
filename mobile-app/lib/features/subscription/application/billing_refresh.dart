import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:school_camera/features/billing/application/invoices_controller.dart';
import 'package:school_camera/features/billing/application/payments_controller.dart';
import 'package:school_camera/features/subscription/application/subscription_controller.dart';

Future<void> refreshSubscriptionBilling(WidgetRef ref) async {
  await Future.wait([
    ref.read(subscriptionControllerProvider.notifier).refresh(),
    ref.read(paymentsControllerProvider.notifier).refresh(),
    ref.read(invoicesControllerProvider.notifier).refresh(),
  ]);
}
