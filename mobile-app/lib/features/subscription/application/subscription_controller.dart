import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:school_camera/features/subscription/data/subscription_repository.dart';
import 'package:school_camera/features/subscription/domain/parent_subscription.dart';

final subscriptionControllerProvider =
    AsyncNotifierProvider<SubscriptionController, List<ParentSubscription>>(
  SubscriptionController.new,
);

class SubscriptionController extends AsyncNotifier<List<ParentSubscription>> {
  @override
  Future<List<ParentSubscription>> build() => _load();

  Future<List<ParentSubscription>> _load() =>
      ref.read(subscriptionRepositoryProvider).fetchSubscriptions();

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(_load);
  }

  ParentSubscriptionSummary get summary =>
      ParentSubscriptionSummary(subscriptions: state.value ?? []);
}
