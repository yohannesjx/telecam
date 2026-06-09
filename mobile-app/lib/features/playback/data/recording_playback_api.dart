import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:school_camera/core/constants/api_paths.dart';
import 'package:school_camera/core/network/api_client.dart';
import 'package:school_camera/core/network/api_result.dart';
import 'package:school_camera/core/network/dio_provider.dart';
import 'package:school_camera/features/playback/domain/recording_playback.dart';

final recordingPlaybackApiProvider = Provider<RecordingPlaybackApi>((ref) {
  return RecordingPlaybackApi(ref.watch(apiClientProvider));
});

class RecordingPlaybackApi {
  RecordingPlaybackApi(this._client);

  final ApiClient _client;

  Future<ApiResult<RecordingPlayback>> fetchPlayback({
    required String cameraId,
    required DateTime start,
    required DateTime end,
    String quality = 'sd_360p',
  }) {
    return _client.getSafe<RecordingPlayback>(
      ApiPaths.parentCameraPlayback(cameraId),
      queryParameters: {
        'start': start.toUtc().toIso8601String(),
        'end': end.toUtc().toIso8601String(),
        'quality': quality,
      },
      parser: (json) {
        if (json is! Map) throw const FormatException('invalid_playback_response');
        return RecordingPlayback.fromJson(Map<String, dynamic>.from(json));
      },
    );
  }
}
