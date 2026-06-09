import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:school_camera/core/network/api_result.dart';
import 'package:school_camera/features/playback/application/recording_playback_error_mapper.dart';
import 'package:school_camera/features/timeline/data/timeline_api.dart';
import 'package:school_camera/features/timeline/domain/timeline_block.dart';

final timelineRepositoryProvider = Provider<TimelineRepository>((ref) {
  return TimelineRepository(ref.watch(timelineApiProvider));
});

class TimelineRepository {
  TimelineRepository(this._api);

  final TimelineApi _api;

  Future<TimelineDayResult> getTimeline({
    required String cameraId,
    required DateTime date,
  }) async {
    final result = await _api.fetchTimeline(cameraId: cameraId, date: date);
    return switch (result) {
      ApiSuccess(:final data) => data,
      ApiFailure(:final error) => throw mapRecordingPlaybackError(error),
    };
  }
}
