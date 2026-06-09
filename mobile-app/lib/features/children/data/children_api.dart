import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:school_camera/core/constants/api_paths.dart';
import 'package:school_camera/core/network/api_client.dart';
import 'package:school_camera/core/network/api_result.dart';
import 'package:school_camera/core/network/dio_provider.dart';
import 'package:school_camera/features/children/domain/child.dart';

final childrenApiProvider = Provider<ChildrenApi>((ref) {
  return ChildrenApi(ApiClient(ref.watch(dioProvider)));
});

class ChildrenApi {
  ChildrenApi(this._client);

  final ApiClient _client;

  Future<ApiResult<List<Child>>> fetchChildren() {
    return _client.getSafe<List<Child>>(
      ApiPaths.parentChildren,
      parser: Child.listFromJson,
    );
  }
}
