import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:school_camera/app/theme.dart';
import 'package:school_camera/core/network/api_error.dart';
import 'package:school_camera/core/widgets/app_card.dart';
import 'package:school_camera/features/auth/application/auth_providers.dart';
import 'package:school_camera/features/playback/application/live_player_state.dart';
import 'package:school_camera/features/playback/application/recording_playback_controller.dart';
import 'package:school_camera/features/playback/domain/recording_playback.dart';
import 'package:school_camera/features/playback/presentation/widgets/playback_error_state.dart';
import 'package:school_camera/features/playback/presentation/widgets/secure_hls_player.dart';
import 'package:school_camera/features/timeline/presentation/widgets/timeline_gap_warning.dart';
import 'package:wakelock_plus/wakelock_plus.dart';

class RecordingPlaybackPage extends ConsumerStatefulWidget {
  const RecordingPlaybackPage({
    required this.args,
    super.key,
  });

  final RecordingPlaybackArgs args;

  @override
  ConsumerState<RecordingPlaybackPage> createState() =>
      _RecordingPlaybackPageState();
}

class _RecordingPlaybackPageState extends ConsumerState<RecordingPlaybackPage>
    with WidgetsBindingObserver {
  final _playerKey = GlobalKey<SecureHlsPlayerState>();
  Timer? _expiryTimer;
  bool _expiryScheduled = false;
  bool _isPlaying = false;

  static final _timeFmt = DateFormat('HH:mm');

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _expiryTimer?.cancel();
    WakelockPlus.disable();
    _resetOrientation();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.paused ||
        state == AppLifecycleState.inactive ||
        state == AppLifecycleState.detached) {
      _playerKey.currentState?.pause();
      WakelockPlus.disable();
      ref
          .read(recordingPlaybackControllerProvider(widget.args).notifier)
          .setAwaitingUserResume(true);
      setState(() => _isPlaying = false);
    }
  }

  String _parentLabel() {
    final user = ref.read(authControllerProvider).user;
    return user?.email ?? user?.name ?? 'Parent';
  }

  String _recordingRange(RecordingPlayback? playback) {
    final start = playback?.start ?? widget.args.start;
    final end = playback?.end ?? widget.args.end;
    return '${_timeFmt.format(start.toLocal())}–${_timeFmt.format(end.toLocal())}';
  }

  String _recordedLabel(RecordingPlayback? playback) {
    return 'Recorded ${_recordingRange(playback)}';
  }

  Future<void> _toggleFullscreen(bool enter) async {
    final notifier =
        ref.read(recordingPlaybackControllerProvider(widget.args).notifier);
    if (enter) {
      await SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
      await SystemChrome.setPreferredOrientations([
        DeviceOrientation.landscapeLeft,
        DeviceOrientation.landscapeRight,
      ]);
      notifier.setFullscreen(true);
    } else {
      await _resetOrientation();
      notifier.setFullscreen(false);
    }
  }

  Future<void> _resetOrientation() async {
    await SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
    await SystemChrome.setPreferredOrientations([DeviceOrientation.portraitUp]);
  }

  void _scheduleExpiryRefresh(RecordingPlayback playback) {
    _expiryTimer?.cancel();
    final expires = playback.expiresAt;
    if (expires == null) return;
    final refreshAt = expires.subtract(const Duration(seconds: 30));
    final delay = refreshAt.difference(DateTime.now());
    if (delay.isNegative) {
      ref.read(recordingPlaybackControllerProvider(widget.args).notifier).retryPlayback();
      return;
    }
    _expiryTimer = Timer(delay, () {
      ref.read(recordingPlaybackControllerProvider(widget.args).notifier).retryPlayback();
    });
  }

  void _onPlayPause() {
    final playbackState = ref.read(recordingPlaybackControllerProvider(widget.args));
    if (playbackState.awaitingUserResume) {
      ref
          .read(recordingPlaybackControllerProvider(widget.args).notifier)
          .setAwaitingUserResume(false);
    }
    if (_isPlaying) {
      _playerKey.currentState?.pause();
      setState(() => _isPlaying = false);
    } else {
      _playerKey.currentState?.play();
      setState(() => _isPlaying = true);
      WakelockPlus.enable();
    }
  }

  @override
  Widget build(BuildContext context) {
    final playbackState = ref.watch(recordingPlaybackControllerProvider(widget.args));
    final playback = playbackState.playback;
    final title = widget.args.cameraName ?? playback?.cameraName ?? 'Recording';

    if (playback != null && !_expiryScheduled) {
      _expiryScheduled = true;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _scheduleExpiryRefresh(playback);
      });
    }

    if (playbackState.isFullscreen) {
      return PopScope(
        onPopInvokedWithResult: (didPop, _) async {
          if (didPop) await _resetOrientation();
        },
        child: Scaffold(
          backgroundColor: Colors.black,
          body: SafeArea(
            child: Stack(
              children: [
                Center(child: _buildPlayer(playbackState)),
                Positioned(
                  top: 0,
                  left: 0,
                  child: IconButton(
                    icon: const Icon(Icons.arrow_back, color: Colors.white),
                    onPressed: () => _toggleFullscreen(false),
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    }

    return PopScope(
      onPopInvokedWithResult: (didPop, _) {
        if (didPop) {
          _playerKey.currentState?.pause();
          WakelockPlus.disable();
        }
      },
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Recording Playback'),
          leading: IconButton(
            icon: const Icon(Icons.arrow_back),
            onPressed: () => context.pop(),
          ),
        ),
        body: ListView(
          padding: const EdgeInsets.all(AppSpacing.lg),
          children: [
            Text(
              title,
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: AppSpacing.xs),
            Text(
              _recordedLabel(playback),
              style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                    color: AppColors.textSecondary,
                  ),
            ),
            const SizedBox(height: AppSpacing.lg),
            _buildPlayer(playbackState),
            const SizedBox(height: AppSpacing.md),
            if (widget.args.blockHasGaps ||
                (playback?.hasGaps ?? false)) ...[
              const TimelineGapWarning(),
              const SizedBox(height: AppSpacing.sm),
            ],
            if (playback != null && playback.warnings.isNotEmpty)
              ...playback.warnings.map(
                (w) => Padding(
                  padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                  child: AppCard(
                    child: Text(
                      _friendlyWarning(w),
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  String _friendlyWarning(String raw) {
    final lower = raw.toLowerCase();
    if (lower.contains('gap') || lower.contains('missing')) {
      return TimelineGapWarning.defaultMessage;
    }
    return raw;
  }

  Widget _buildPlayer(RecordingPlaybackState playbackState) {
    return AspectRatio(
      aspectRatio: 16 / 9,
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: Colors.black,
          borderRadius: playbackState.isFullscreen
              ? null
              : BorderRadius.circular(AppRadius.lg),
        ),
        child: _buildPlayerContent(playbackState),
      ),
    );
  }

  Widget _buildPlayerContent(RecordingPlaybackState playbackState) {
    switch (playbackState.phase) {
      case LivePlayerPhase.initial:
      case LivePlayerPhase.loadingSignedUrl:
        return const Center(
          child: CircularProgressIndicator(color: Colors.white70),
        );
      case LivePlayerPhase.error:
        return PlaybackErrorState(
          error: playbackState.error ??
              const AppError(
                code: AppErrorCode.unknown,
                message: 'Something went wrong. Please try again.',
              ),
          onRetry: () => ref
              .read(recordingPlaybackControllerProvider(widget.args).notifier)
              .retryPlayback(),
        );
      case LivePlayerPhase.ready:
      case LivePlayerPhase.buffering:
      case LivePlayerPhase.playing:
      case LivePlayerPhase.paused:
        final playback = playbackState.playback;
        if (playback == null) {
          return const Center(
            child: CircularProgressIndicator(color: Colors.white70),
          );
        }
        return SecureHlsPlayer(
          key: _playerKey,
          playbackUrl: playback.playbackUrl,
          badgeLabel: 'Recording',
          parentLabel: _parentLabel(),
          childName: widget.args.childName,
          classroomName: widget.args.classroomName,
          cameraName: widget.args.cameraName ?? playback.cameraName,
          recordingRange: _recordingRange(playback),
          isPlaying: _isPlaying,
          awaitingUserResume: playbackState.awaitingUserResume,
          isFullscreen: playbackState.isFullscreen,
          enableSeek: true,
          onPhaseChanged: (phase) {
            ref
                .read(recordingPlaybackControllerProvider(widget.args).notifier)
                .setPhase(phase);
            if (phase == LivePlayerPhase.playing) {
              WakelockPlus.enable();
              if (!_isPlaying) setState(() => _isPlaying = true);
            }
            if (phase == LivePlayerPhase.error) {
              ref
                  .read(recordingPlaybackControllerProvider(widget.args).notifier)
                  .setError(
                    const AppError(
                      code: AppErrorCode.unknown,
                      message: 'Playback stopped. Please try again.',
                    ),
                  );
            }
          },
          onPlayPause: _onPlayPause,
          onFullscreen: () {
            if (playbackState.isFullscreen) {
              _toggleFullscreen(false);
            } else {
              _toggleFullscreen(true);
            }
          },
        );
    }
  }
}
