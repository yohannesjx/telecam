import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:school_camera/core/network/api_result.dart';
import 'package:school_camera/features/playback/application/recording_playback_error_mapper.dart';
import 'package:school_camera/features/playback/data/recording_playback_api.dart';
import 'package:school_camera/features/playback/domain/recording_playback.dart';

final recordingPlaybackRepositoryProvider =
    Provider<RecordingPlaybackRepository>((ref) {
  return RecordingPlaybackRepository(ref.watch(recordingPlaybackApiProvider));
});

class RecordingPlaybackRepository {
  RecordingPlaybackRepository(this._api);

  final RecordingPlaybackApi _api;

  Future<RecordingPlayback> getPlayback({
    required String cameraId,
    required DateTime start,
    required DateTime end,
    String quality = 'sd_360p',
  }) async {
    final result = await _api.fetchPlayback(
      cameraId: cameraId,
      start: start,
      end: end,
      quality: quality,
    );
    return switch (result) {
      ApiSuccess(:final data) => data,
      ApiFailure(:final error) => throw mapRecordingPlaybackError(error),
    };
  }
}
