import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:school_camera/app/theme.dart';
import 'package:school_camera/core/network/api_error.dart';
import 'package:school_camera/core/widgets/app_card.dart';
import 'package:school_camera/features/auth/application/auth_providers.dart';
import 'package:school_camera/features/playback/application/live_camera_context_provider.dart';
import 'package:school_camera/features/playback/application/live_controller.dart';
import 'package:school_camera/features/playback/application/live_player_state.dart';
import 'package:school_camera/features/playback/domain/live_camera_context.dart';
import 'package:school_camera/features/playback/domain/live_stream.dart';
import 'package:school_camera/features/playback/presentation/widgets/live_error_state.dart';
import 'package:school_camera/features/playback/presentation/widgets/live_loading_state.dart';
import 'package:school_camera/features/playback/presentation/widgets/live_video_player.dart';
import 'package:wakelock_plus/wakelock_plus.dart';

class LivePlayerPage extends ConsumerStatefulWidget {
  const LivePlayerPage({required this.cameraId, super.key});

  final String cameraId;

  @override
  ConsumerState<LivePlayerPage> createState() => _LivePlayerPageState();
}

class _LivePlayerPageState extends ConsumerState<LivePlayerPage>
    with WidgetsBindingObserver {
  final _videoKey = GlobalKey<LiveVideoPlayerState>();
  Timer? _expiryTimer;
  bool _expiryScheduled = false;
  bool _isPlaying = false;

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
    ref.read(liveCameraContextProvider.notifier).state = null;
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.paused ||
        state == AppLifecycleState.inactive ||
        state == AppLifecycleState.detached) {
      _videoKey.currentState?.pause();
      WakelockPlus.disable();
      ref.read(liveControllerProvider(widget.cameraId).notifier).setAwaitingUserResume(true);
      setState(() => _isPlaying = false);
    }
  }

  void _scheduleExpiryRefresh(LiveStream stream) {
    _expiryTimer?.cancel();
    final expires = stream.expiresAt;
    if (expires == null) return;
    final refreshAt = expires.subtract(const Duration(seconds: 30));
    final delay = refreshAt.difference(DateTime.now());
    if (delay.isNegative) {
      _refreshSignedUrl();
      return;
    }
    _expiryTimer = Timer(delay, _refreshSignedUrl);
  }

  Future<void> _refreshSignedUrl() async {
    await ref.read(liveControllerProvider(widget.cameraId).notifier).refreshSignedUrl();
  }

  LiveCameraContext _mergedContext(LiveStream? stream) {
    final routeCtx = ref.read(liveCameraContextProvider);
    final base = routeCtx ??
        LiveCameraContext(cameraId: widget.cameraId);
    if (stream == null) return base;
    return base.mergeFromStream(
      cameraName: stream.cameraName.isNotEmpty ? stream.cameraName : null,
      schoolName: stream.schoolName.isNotEmpty ? stream.schoolName : null,
      classroomName: stream.classroomName.isNotEmpty ? stream.classroomName : null,
    );
  }

  String _parentLabel() {
    final user = ref.read(authControllerProvider).user;
    return user?.email ?? user?.name ?? 'Parent';
  }

  Future<void> _toggleFullscreen(bool enter) async {
    final notifier = ref.read(liveControllerProvider(widget.cameraId).notifier);
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

  void _onPlayPause() {
    final playback = ref.read(liveControllerProvider(widget.cameraId));
    if (playback.awaitingUserResume) {
      ref.read(liveControllerProvider(widget.cameraId).notifier).setAwaitingUserResume(false);
    }
    if (_isPlaying) {
      _videoKey.currentState?.pause();
      setState(() => _isPlaying = false);
    } else {
      _videoKey.currentState?.play();
      setState(() => _isPlaying = true);
      WakelockPlus.enable();
    }
  }

  @override
  Widget build(BuildContext context) {
    final playback = ref.watch(liveControllerProvider(widget.cameraId));
    final stream = playback.stream;
    final ctx = _mergedContext(stream);
    final title = ctx.cameraName ?? 'Live';

    if (stream != null && !_expiryScheduled) {
      _expiryScheduled = true;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _scheduleExpiryRefresh(stream);
      });
    }

    if (playback.isFullscreen) {
      return PopScope(
        onPopInvokedWithResult: (didPop, _) async {
          if (didPop) await _resetOrientation();
        },
        child: Scaffold(
          backgroundColor: Colors.black,
          body: SafeArea(
            child: Stack(
              children: [
                Center(child: _buildPlayerArea(playback, ctx, fullscreen: true)),
                Positioned(
                  top: 0,
                  left: 0,
                  child: IconButton(
                    icon: const Icon(Icons.arrow_back, color: Colors.white),
                    onPressed: () async {
                      await _toggleFullscreen(false);
                    },
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
          _videoKey.currentState?.pause();
          WakelockPlus.disable();
        }
      },
      child: Scaffold(
        appBar: AppBar(
          title: Text(title),
          leading: IconButton(
            icon: const Icon(Icons.arrow_back),
            onPressed: () => context.pop(),
          ),
        ),
        body: ListView(
          padding: const EdgeInsets.all(AppSpacing.lg),
          children: [
            _buildPlayerArea(playback, ctx, fullscreen: false),
            const SizedBox(height: AppSpacing.lg),
            _InfoCard(cameraContext: ctx),
            const SizedBox(height: AppSpacing.md),
            Text(
              'Live viewing is delayed for safety and available during school hours.',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: AppColors.textSecondary,
                  ),
            ),
            if (playback.error?.code == AppErrorCode.liveOutsideSchoolHours) ...[
              const SizedBox(height: AppSpacing.sm),
              Text(
                'Live is available during school hours.',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: AppColors.warning,
                    ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildPlayerArea(
    LivePlayerState playback,
    LiveCameraContext ctx, {
    required bool fullscreen,
  }) {
    return AspectRatio(
      aspectRatio: 16 / 9,
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: Colors.black,
          borderRadius: fullscreen
              ? null
              : BorderRadius.circular(AppRadius.lg),
        ),
        child: _buildPlayerContent(playback, ctx, fullscreen: fullscreen),
      ),
    );
  }

  Widget _buildPlayerContent(
    LivePlayerState playback,
    LiveCameraContext ctx, {
    required bool fullscreen,
  }) {
    switch (playback.phase) {
      case LivePlayerPhase.initial:
      case LivePlayerPhase.loadingSignedUrl:
        return const LiveLoadingState();
      case LivePlayerPhase.error:
        return LiveErrorState(
          error: playback.error ??
              const AppError(
                code: AppErrorCode.unknown,
                message: 'Something went wrong. Please try again.',
              ),
          onRetry: () =>
              ref.read(liveControllerProvider(widget.cameraId).notifier).retry(),
        );
      case LivePlayerPhase.ready:
      case LivePlayerPhase.buffering:
      case LivePlayerPhase.playing:
      case LivePlayerPhase.paused:
        final stream = playback.stream;
        if (stream == null) {
          return const LiveLoadingState();
        }
        return LiveVideoPlayer(
          key: _videoKey,
          playbackUrl: stream.playbackUrl,
          delaySeconds: stream.delaySeconds,
          parentLabel: _parentLabel(),
          childName: ctx.childName,
          classroomName: ctx.classroomName,
          cameraName: ctx.cameraName,
          isPlaying: _isPlaying,
          awaitingUserResume: playback.awaitingUserResume,
          isFullscreen: fullscreen,
          onPhaseChanged: (phase) {
            ref.read(liveControllerProvider(widget.cameraId).notifier).setPhase(phase);
            if (phase == LivePlayerPhase.playing) {
              WakelockPlus.enable();
              if (!_isPlaying) setState(() => _isPlaying = true);
            }
            if (phase == LivePlayerPhase.paused && !playback.awaitingUserResume) {
              if (_isPlaying) setState(() => _isPlaying = false);
            }
            if (phase == LivePlayerPhase.error) {
              ref.read(liveControllerProvider(widget.cameraId).notifier).setError(
                    const AppError(
                      code: AppErrorCode.unknown,
                      message: 'Playback stopped. Please try again.',
                    ),
                  );
            }
          },
          onPlayPause: _onPlayPause,
          onFullscreen: () {
            if (fullscreen) {
              _toggleFullscreen(false);
            } else {
              _toggleFullscreen(true);
            }
          },
        );
    }
  }
}

class _InfoCard extends StatelessWidget {
  const _InfoCard({required this.cameraContext});

  final LiveCameraContext cameraContext;

  @override
  Widget build(BuildContext context) {
    final ctx = cameraContext;
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (ctx.childName != null && ctx.childName!.isNotEmpty)
            _line('Child', ctx.childName!),
          if (ctx.classroomName != null && ctx.classroomName!.isNotEmpty)
            _line('Classroom', ctx.classroomName!),
          if (ctx.cameraName != null && ctx.cameraName!.isNotEmpty)
            _line('Camera', ctx.cameraName!),
          if (ctx.schoolName != null && ctx.schoolName!.isNotEmpty)
            _line('School', ctx.schoolName!),
        ],
      ),
    );
  }

  Widget _line(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.xs),
      child: Text('$label: $value'),
    );
  }
}
