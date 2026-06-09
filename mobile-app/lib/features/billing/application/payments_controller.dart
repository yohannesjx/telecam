import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:school_camera/features/billing/data/billing_repository.dart';
import 'package:school_camera/features/billing/domain/parent_payment.dart';

final paymentsControllerProvider =
    AsyncNotifierProvider<PaymentsController, List<ParentPayment>>(
  PaymentsController.new,
);

class PaymentsController extends AsyncNotifier<List<ParentPayment>> {
  @override
  Future<List<ParentPayment>> build() => _load();

  Future<List<ParentPayment>> _load() =>
      ref.read(billingRepositoryProvider).fetchPayments();

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(_load);
  }
}
