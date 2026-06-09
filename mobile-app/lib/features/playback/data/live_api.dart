import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:school_camera/core/constants/api_paths.dart';
import 'package:school_camera/core/network/api_client.dart';
import 'package:school_camera/core/network/api_result.dart';
import 'package:school_camera/core/network/dio_provider.dart';
import 'package:school_camera/features/playback/domain/live_stream.dart';

final liveApiProvider = Provider<LiveApi>((ref) {
  return LiveApi(ref.watch(apiClientProvider));
});

class LiveApi {
  LiveApi(this._client);

  final ApiClient _client;

  Future<ApiResult<LiveStream>> fetchLive(String cameraId, {String? quality}) {
    return _client.getSafe<LiveStream>(
      ApiPaths.parentCameraLive(cameraId),
      queryParameters: quality != null && quality.isNotEmpty ? {'quality': quality} : null,
      parser: (json) {
        if (json is! Map) {
          throw const FormatException('invalid_live_response');
        }
        return LiveStream.fromJson(Map<String, dynamic>.from(json));
      },
    );
  }
}
