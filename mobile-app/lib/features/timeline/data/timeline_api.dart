import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:school_camera/core/constants/api_paths.dart';
import 'package:school_camera/core/network/api_client.dart';
import 'package:school_camera/core/network/api_result.dart';
import 'package:school_camera/core/network/dio_provider.dart';
import 'package:school_camera/features/timeline/domain/timeline_block.dart';

final timelineApiProvider = Provider<TimelineApi>((ref) {
  return TimelineApi(ref.watch(apiClientProvider));
});

class TimelineApi {
  TimelineApi(this._client);

  final ApiClient _client;
  static final _dateFormat = DateFormat('yyyy-MM-dd');

  Future<ApiResult<TimelineDayResult>> fetchTimeline({
    required String cameraId,
    required DateTime date,
  }) {
    return _client.getSafe<TimelineDayResult>(
      ApiPaths.parentCameraTimeline(cameraId),
      queryParameters: {'date': _dateFormat.format(date)},
      parser: (json) {
        if (json is! Map) throw const FormatException('invalid_timeline_response');
        return TimelineDayResult.fromJson(Map<String, dynamic>.from(json));
      },
    );
  }
}
