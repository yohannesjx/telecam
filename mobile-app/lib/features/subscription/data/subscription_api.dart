import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:school_camera/core/constants/api_paths.dart';
import 'package:school_camera/core/network/api_client.dart';
import 'package:school_camera/core/network/api_result.dart';
import 'package:school_camera/core/network/dio_provider.dart';
import 'package:school_camera/features/subscription/domain/parent_subscription.dart';

final subscriptionApiProvider = Provider<SubscriptionApi>((ref) {
  return SubscriptionApi(ApiClient(ref.watch(dioProvider)));
});

class SubscriptionApi {
  SubscriptionApi(this._client);

  final ApiClient _client;

  Future<ApiResult<List<ParentSubscription>>> fetchSubscriptions() {
    return _client.getSafe<List<ParentSubscription>>(
      ApiPaths.parentSubscriptions,
      parser: ParentSubscription.listFromJson,
    );
  }
}
