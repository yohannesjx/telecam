import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:school_camera/features/children/data/children_repository.dart';
import 'package:school_camera/features/children/domain/child.dart';

final childrenControllerProvider =
    AsyncNotifierProvider<ChildrenController, List<Child>>(ChildrenController.new);

class ChildrenController extends AsyncNotifier<List<Child>> {
  @override
  Future<List<Child>> build() => _load();

  Future<List<Child>> _load() =>
      ref.read(childrenRepositoryProvider).fetchChildren();

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(_load);
  }
}
