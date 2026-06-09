import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:school_camera/core/network/api_error.dart';
import 'package:school_camera/core/network/api_result.dart';
import 'package:school_camera/features/subscription/data/subscription_api.dart';
import 'package:school_camera/features/subscription/domain/parent_subscription.dart';

final subscriptionRepositoryProvider = Provider<SubscriptionRepository>((ref) {
  return SubscriptionRepository(ref.watch(subscriptionApiProvider));
});

class SubscriptionRepository {
  SubscriptionRepository(this._api);

  final SubscriptionApi _api;

  Future<List<ParentSubscription>> fetchSubscriptions() async {
    final result = await _api.fetchSubscriptions();
    return switch (result) {
      ApiSuccess(:final data) => data,
      ApiFailure(:final error) => throw AppError(
          code: error.code,
          message: 'Could not load subscription details.',
          statusCode: error.statusCode,
          originalError: error.originalError,
        ),
    };
  }
}
