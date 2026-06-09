import 'package:school_camera/core/network/api_error.dart';
import 'package:school_camera/features/playback/domain/live_stream.dart';

enum LivePlayerPhase {
  initial,
  loadingSignedUrl,
  ready,
  buffering,
  playing,
  paused,
  error,
}

class LivePlayerState {
  const LivePlayerState({
    this.phase = LivePlayerPhase.initial,
    this.stream,
    this.error,
    this.isFullscreen = false,
    this.awaitingUserResume = false,
  });

  final LivePlayerPhase phase;
  final LiveStream? stream;
  final AppError? error;
  final bool isFullscreen;
  final bool awaitingUserResume;

  LivePlayerState copyWith({
    LivePlayerPhase? phase,
    LiveStream? stream,
    AppError? error,
    bool? isFullscreen,
    bool? awaitingUserResume,
    bool clearError = false,
    bool clearStream = false,
  }) {
    return LivePlayerState(
      phase: phase ?? this.phase,
      stream: clearStream ? null : (stream ?? this.stream),
      error: clearError ? null : (error ?? this.error),
      isFullscreen: isFullscreen ?? this.isFullscreen,
      awaitingUserResume: awaitingUserResume ?? this.awaitingUserResume,
    );
  }
}
