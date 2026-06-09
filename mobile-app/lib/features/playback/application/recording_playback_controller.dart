import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:school_camera/core/network/api_error.dart';
import 'package:school_camera/features/playback/application/live_player_state.dart';
import 'package:school_camera/features/playback/application/recording_playback_error_mapper.dart';
import 'package:school_camera/features/playback/data/recording_playback_repository.dart';
import 'package:school_camera/features/playback/domain/recording_playback.dart';

class RecordingPlaybackState {
  const RecordingPlaybackState({
    this.phase = LivePlayerPhase.initial,
    this.playback,
    this.error,
    this.isFullscreen = false,
    this.awaitingUserResume = false,
  });

  final LivePlayerPhase phase;
  final RecordingPlayback? playback;
  final AppError? error;
  final bool isFullscreen;
  final bool awaitingUserResume;

  RecordingPlaybackState copyWith({
    LivePlayerPhase? phase,
    RecordingPlayback? playback,
    AppError? error,
    bool? isFullscreen,
    bool? awaitingUserResume,
    bool clearError = false,
    bool clearPlayback = false,
  }) {
    return RecordingPlaybackState(
      phase: phase ?? this.phase,
      playback: clearPlayback ? null : (playback ?? this.playback),
      error: clearError ? null : (error ?? this.error),
      isFullscreen: isFullscreen ?? this.isFullscreen,
      awaitingUserResume: awaitingUserResume ?? this.awaitingUserResume,
    );
  }
}

class RecordingPlaybackArgs {
  const RecordingPlaybackArgs({
    required this.cameraId,
    required this.start,
    required this.end,
    this.quality,
    this.cameraName,
    this.schoolName,
    this.classroomName,
    this.childName,
    this.blockHasGaps = false,
  });

  final String cameraId;
  final DateTime start;
  final DateTime end;
  final String? quality;
  final String? cameraName;
  final String? schoolName;
  final String? classroomName;
  final String? childName;
  final bool blockHasGaps;
}

final recordingPlaybackControllerProvider = AutoDisposeNotifierProviderFamily<
    RecordingPlaybackController,
    RecordingPlaybackState,
    RecordingPlaybackArgs>(RecordingPlaybackController.new);

class RecordingPlaybackController
    extends AutoDisposeFamilyNotifier<RecordingPlaybackState, RecordingPlaybackArgs> {
  @override
  RecordingPlaybackState build(RecordingPlaybackArgs args) {
    Future.microtask(loadPlayback);
    return const RecordingPlaybackState(phase: LivePlayerPhase.loadingSignedUrl);
  }

  Future<void> loadPlayback() async {
    state = state.copyWith(
      phase: LivePlayerPhase.loadingSignedUrl,
      clearError: true,
    );
    try {
      final playback = await ref.read(recordingPlaybackRepositoryProvider).getPlayback(
            cameraId: arg.cameraId,
            start: arg.start,
            end: arg.end,
            quality: arg.quality ?? 'sd_360p',
          );
      state = state.copyWith(
        phase: LivePlayerPhase.ready,
        playback: playback,
        clearError: true,
      );
    } catch (e) {
      state = state.copyWith(
        phase: LivePlayerPhase.error,
        error: mapRecordingPlaybackError(e),
        clearPlayback: true,
      );
    }
  }

  Future<void> retryPlayback() => loadPlayback();

  void setPhase(LivePlayerPhase phase) => state = state.copyWith(phase: phase);

  void setFullscreen(bool value) => state = state.copyWith(isFullscreen: value);

  void setAwaitingUserResume(bool value) =>
      state = state.copyWith(awaitingUserResume: value);

  void setError(AppError error) =>
      state = state.copyWith(phase: LivePlayerPhase.error, error: error);
}
