import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:school_camera/core/network/api_error.dart';
import 'package:school_camera/core/network/api_result.dart';
import 'package:school_camera/features/billing/data/billing_api.dart';
import 'package:school_camera/features/billing/domain/parent_invoice.dart';
import 'package:school_camera/features/billing/domain/parent_payment.dart';

final billingRepositoryProvider = Provider<BillingRepository>((ref) {
  return BillingRepository(ref.watch(billingApiProvider));
});

class BillingRepository {
  BillingRepository(this._api);

  final BillingApi _api;

  Future<List<ParentPayment>> fetchPayments() async {
    final result = await _api.fetchPayments();
    return switch (result) {
      ApiSuccess(:final data) => data,
      ApiFailure(:final error) => throw _mapBillingError(error, 'payments'),
    };
  }

  Future<List<ParentInvoice>> fetchInvoices() async {
    final result = await _api.fetchInvoices();
    return switch (result) {
      ApiSuccess(:final data) => data,
      ApiFailure(:final error) => throw _mapBillingError(error, 'invoices'),
    };
  }

  AppError _mapBillingError(AppError error, String section) {
    if (error.code == AppErrorCode.network) return error;
    if (error.code == AppErrorCode.unauthorized) return error;
    return AppError(
      code: error.code,
      message: section == 'payments'
          ? 'Could not load payments.'
          : 'Could not load invoices.',
      statusCode: error.statusCode,
      originalError: error.originalError,
    );
  }
}
