import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:school_camera/core/constants/api_paths.dart';
import 'package:school_camera/core/network/api_client.dart';
import 'package:school_camera/core/network/api_result.dart';
import 'package:school_camera/core/network/dio_provider.dart';
import 'package:school_camera/features/cameras/domain/parent_camera.dart';

final parentCamerasApiProvider = Provider<ParentCamerasApi>((ref) {
  return ParentCamerasApi(ApiClient(ref.watch(dioProvider)));
});

class ParentCamerasApi {
  ParentCamerasApi(this._client);

  final ApiClient _client;

  Future<ApiResult<List<ParentCamera>>> fetchCameras() {
    return _client.getSafe<List<ParentCamera>>(
      ApiPaths.parentCameras,
      parser: ParentCamera.listFromJson,
    );
  }
}
