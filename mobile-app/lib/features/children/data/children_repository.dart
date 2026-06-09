import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:school_camera/core/network/api_result.dart';
import 'package:school_camera/features/children/data/children_api.dart';
import 'package:school_camera/features/children/domain/child.dart';

final childrenRepositoryProvider = Provider<ChildrenRepository>((ref) {
  return ChildrenRepository(ref.watch(childrenApiProvider));
});

class ChildrenRepository {
  ChildrenRepository(this._api);

  final ChildrenApi _api;

  Future<List<Child>> fetchChildren() async {
    final result = await _api.fetchChildren();
    return switch (result) {
      ApiSuccess(:final data) => data,
      ApiFailure(:final error) => throw error,
    };
  }
}
