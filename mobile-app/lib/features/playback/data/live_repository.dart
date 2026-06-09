import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:school_camera/core/network/api_result.dart';
import 'package:school_camera/features/playback/application/live_playback_error_mapper.dart';
import 'package:school_camera/features/playback/data/live_api.dart';
import 'package:school_camera/features/playback/domain/live_stream.dart';

final liveRepositoryProvider = Provider<LiveRepository>((ref) {
  return LiveRepository(ref.watch(liveApiProvider));
});

class LiveRepository {
  LiveRepository(this._api);

  final LiveApi _api;

  Future<LiveStream> getLiveStream(String cameraId, {String? quality}) async {
    final result = await _api.fetchLive(cameraId, quality: quality);
    return switch (result) {
      ApiSuccess(:final data) => data,
      ApiFailure(:final error) => throw mapLivePlaybackError(error),
    };
  }
}
