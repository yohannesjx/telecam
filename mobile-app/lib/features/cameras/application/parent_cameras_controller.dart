import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:school_camera/features/cameras/data/parent_cameras_repository.dart';
import 'package:school_camera/features/cameras/domain/parent_camera.dart';

final parentCamerasControllerProvider =
    AsyncNotifierProvider<ParentCamerasController, List<ParentCamera>>(
  ParentCamerasController.new,
);

class ParentCamerasController extends AsyncNotifier<List<ParentCamera>> {
  @override
  Future<List<ParentCamera>> build() => _load();

  Future<List<ParentCamera>> _load() =>
      ref.read(parentCamerasRepositoryProvider).fetchCameras();

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(_load);
  }
}
