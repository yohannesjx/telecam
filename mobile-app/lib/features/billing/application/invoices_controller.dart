import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:school_camera/features/billing/data/billing_repository.dart';
import 'package:school_camera/features/billing/domain/parent_invoice.dart';

final invoicesControllerProvider =
    AsyncNotifierProvider<InvoicesController, List<ParentInvoice>>(
  InvoicesController.new,
);

class InvoicesController extends AsyncNotifier<List<ParentInvoice>> {
  @override
  Future<List<ParentInvoice>> build() => _load();

  Future<List<ParentInvoice>> _load() =>
      ref.read(billingRepositoryProvider).fetchInvoices();

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(_load);
  }
}
