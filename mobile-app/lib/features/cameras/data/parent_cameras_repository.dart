import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:school_camera/core/network/api_result.dart';
import 'package:school_camera/features/cameras/data/parent_cameras_api.dart';
import 'package:school_camera/features/cameras/domain/parent_camera.dart';

final parentCamerasRepositoryProvider = Provider<ParentCamerasRepository>((ref) {
  return ParentCamerasRepository(ref.watch(parentCamerasApiProvider));
});

class ParentCamerasRepository {
  ParentCamerasRepository(this._api);

  final ParentCamerasApi _api;

  Future<List<ParentCamera>> fetchCameras() async {
    final result = await _api.fetchCameras();
    return switch (result) {
      ApiSuccess(:final data) => data,
      ApiFailure(:final error) => throw error,
    };
  }
}
