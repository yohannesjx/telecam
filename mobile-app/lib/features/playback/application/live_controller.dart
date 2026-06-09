import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:school_camera/core/network/api_error.dart';
import 'package:school_camera/features/playback/application/live_playback_error_mapper.dart';
import 'package:school_camera/features/playback/application/live_player_state.dart';
import 'package:school_camera/features/playback/data/live_repository.dart';
import 'package:school_camera/features/playback/domain/live_stream.dart';

final liveControllerProvider = AutoDisposeNotifierProviderFamily<LiveController,
    LivePlayerState, String>(LiveController.new);

class LiveController extends AutoDisposeFamilyNotifier<LivePlayerState, String> {
  @override
  LivePlayerState build(String cameraId) {
    Future.microtask(load);
    return const LivePlayerState(phase: LivePlayerPhase.loadingSignedUrl);
  }

  String get cameraId => arg;

  Future<void> load() async {
    state = state.copyWith(
      phase: LivePlayerPhase.loadingSignedUrl,
      clearError: true,
    );
    try {
      final stream =
          await ref.read(liveRepositoryProvider).getLiveStream(cameraId);
      state = state.copyWith(
        phase: LivePlayerPhase.ready,
        stream: stream,
        clearError: true,
      );
    } catch (error) {
      state = state.copyWith(
        phase: LivePlayerPhase.error,
        error: mapLivePlaybackError(error),
        clearStream: true,
      );
    }
  }

  Future<void> retry() => load();

  Future<void> refreshSignedUrl() => load();

  void setPhase(LivePlayerPhase phase) {
    state = state.copyWith(phase: phase);
  }

  void setFullscreen(bool value) {
    state = state.copyWith(isFullscreen: value);
  }

  void setAwaitingUserResume(bool value) {
    state = state.copyWith(awaitingUserResume: value);
  }

  void setError(AppError error) {
    state = state.copyWith(phase: LivePlayerPhase.error, error: error);
  }

  void applyStream(LiveStream stream) {
    state = state.copyWith(stream: stream, clearError: true);
  }
}
