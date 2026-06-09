import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:school_camera/features/playback/domain/live_camera_context.dart';

/// Set before navigating to `/live/:cameraId` to pass list-screen metadata.
final liveCameraContextProvider =
    StateProvider<LiveCameraContext?>((ref) => null);
