import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:school_camera/core/constants/api_paths.dart';
import 'package:school_camera/core/network/api_client.dart';
import 'package:school_camera/core/network/api_result.dart';
import 'package:school_camera/core/network/dio_provider.dart';
import 'package:school_camera/features/billing/domain/parent_invoice.dart';
import 'package:school_camera/features/billing/domain/parent_payment.dart';

final billingApiProvider = Provider<BillingApi>((ref) {
  return BillingApi(ref.watch(apiClientProvider));
});

class BillingApi {
  BillingApi(this._client);

  final ApiClient _client;

  Future<ApiResult<List<ParentPayment>>> fetchPayments() {
    return _client.getSafe<List<ParentPayment>>(
      ApiPaths.parentPayments,
      parser: ParentPayment.listFromJson,
    );
  }

  Future<ApiResult<List<ParentInvoice>>> fetchInvoices() {
    return _client.getSafe<List<ParentInvoice>>(
      ApiPaths.parentInvoices,
      parser: ParentInvoice.listFromJson,
    );
  }
}
