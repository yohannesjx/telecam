import 'package:flutter/material.dart';
import 'package:school_camera/core/network/api_error.dart';
import 'package:school_camera/features/playback/presentation/widgets/live_error_state.dart';

/// Recording playback errors (reuses live error layout).
class PlaybackErrorState extends StatelessWidget {
  const PlaybackErrorState({
    required this.error,
    required this.onRetry,
    this.showRetry = true,
    super.key,
  });

  final AppError error;
  final VoidCallback? onRetry;
  final bool showRetry;

  @override
  Widget build(BuildContext context) {
    return LiveErrorState(
      error: error,
      onRetry: onRetry,
      showRetry: showRetry,
    );
  }
}
