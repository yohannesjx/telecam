import 'dart:async';

import 'package:flutter/material.dart';
import 'package:media_kit/media_kit.dart';
import 'package:media_kit_video/media_kit_video.dart';
import 'package:school_camera/app/theme.dart';
import 'package:school_camera/features/playback/application/live_player_state.dart';
import 'package:school_camera/features/playback/presentation/widgets/live_player_controls.dart';
import 'package:school_camera/features/playback/presentation/widgets/video_watermark_overlay.dart';

typedef LivePlayerPhaseCallback = void Function(LivePlayerPhase phase);

/// media_kit HLS player — [playbackUrl] must never be logged.
class LiveVideoPlayer extends StatefulWidget {
  const LiveVideoPlayer({
    required this.playbackUrl,
    required this.delaySeconds,
    required this.parentLabel,
    required this.onPhaseChanged,
    required this.onPlayPause,
    required this.isPlaying,
    required this.onFullscreen,
    required this.isFullscreen,
    this.childName,
    this.classroomName,
    this.cameraName,
    this.awaitingUserResume = false,
    super.key,
  });

  final String playbackUrl;
  final int delaySeconds;
  final String parentLabel;
  final String? childName;
  final String? classroomName;
  final String? cameraName;
  final LivePlayerPhaseCallback onPhaseChanged;
  final VoidCallback onPlayPause;
  final bool isPlaying;
  final VoidCallback onFullscreen;
  final bool isFullscreen;
  final bool awaitingUserResume;

  @override
  State<LiveVideoPlayer> createState() => LiveVideoPlayerState();
}

class LiveVideoPlayerState extends State<LiveVideoPlayer> {
  Player? _player;
  VideoController? _videoController;
  final List<StreamSubscription<dynamic>> _subscriptions = [];
  bool _buffering = false;

  @override
  void initState() {
    super.initState();
    _openStream(widget.playbackUrl);
  }

  @override
  void didUpdateWidget(covariant LiveVideoPlayer oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.playbackUrl != widget.playbackUrl) {
      _openStream(widget.playbackUrl);
    }
    if (widget.awaitingUserResume && _player != null) {
      _player!.pause();
    }
  }

  @override
  void dispose() {
    _disposePlayer();
    super.dispose();
  }

  void _disposePlayer() {
    for (final sub in _subscriptions) {
      sub.cancel();
    }
    _subscriptions.clear();
    _videoController = null;
    _player?.dispose();
    _player = null;
  }

  Future<void> _openStream(String url) async {
    _disposePlayer();
    final player = Player();
    final controller = VideoController(player);
    _player = player;
    _videoController = controller;

    _subscriptions.add(
      player.stream.buffering.listen((buffering) {
        if (!mounted) return;
        setState(() => _buffering = buffering);
        widget.onPhaseChanged(
          buffering ? LivePlayerPhase.buffering : LivePlayerPhase.playing,
        );
      }),
    );
    _subscriptions.add(
      player.stream.playing.listen((playing) {
        if (!mounted) return;
        if (!playing && widget.awaitingUserResume) return;
        widget.onPhaseChanged(
          playing ? LivePlayerPhase.playing : LivePlayerPhase.paused,
        );
      }),
    );
    _subscriptions.add(
      player.stream.error.listen((_) {
        if (!mounted) return;
        widget.onPhaseChanged(LivePlayerPhase.error);
      }),
    );

    widget.onPhaseChanged(LivePlayerPhase.buffering);
    await player.open(Media(url), play: !widget.awaitingUserResume);
  }

  void play() => _player?.play();

  void pause() => _player?.pause();

  @override
  Widget build(BuildContext context) {
    final controller = _videoController;
    if (controller == null) {
      return const ColoredBox(color: Colors.black);
    }

    final delayLabel = widget.delaySeconds > 0
        ? 'Delayed Live · ~${widget.delaySeconds}s'
        : 'Delayed Live';

    return ClipRRect(
      borderRadius: widget.isFullscreen
          ? BorderRadius.zero
          : BorderRadius.circular(AppRadius.lg),
      child: AspectRatio(
        aspectRatio: 16 / 9,
        child: Stack(
          fit: StackFit.expand,
          children: [
            ColoredBox(
              color: Colors.black,
              child: Video(
                controller: controller,
                fit: BoxFit.contain,
                controls: NoVideoControls,
              ),
            ),
            VideoWatermarkOverlay(
              parentLabel: widget.parentLabel,
              childName: widget.childName,
              classroomName: widget.classroomName,
              cameraName: widget.cameraName,
              compact: widget.isFullscreen,
            ),
            LivePlayerControls(
              isPlaying: widget.isPlaying,
              onPlayPause: widget.onPlayPause,
              onFullscreen: widget.onFullscreen,
              isFullscreen: widget.isFullscreen,
              delayLabel: delayLabel,
            ),
            if (_buffering)
              const Positioned.fill(
                child: ColoredBox(
                  color: Colors.black38,
                  child: Center(
                    child: CircularProgressIndicator(color: Colors.white70),
                  ),
                ),
              ),
            if (widget.awaitingUserResume)
              Positioned.fill(
                child: Material(
                  color: Colors.black54,
                  child: Center(
                    child: TextButton.icon(
                      onPressed: () {
                        widget.onPlayPause();
                        play();
                      },
                      icon: const Icon(Icons.play_arrow, color: Colors.white),
                      label: const Text(
                        'Tap to resume',
                        style: TextStyle(color: Colors.white),
                      ),
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
