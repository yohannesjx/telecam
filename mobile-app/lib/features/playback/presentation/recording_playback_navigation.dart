import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:school_camera/app/router.dart';
import 'package:school_camera/features/playback/application/recording_playback_controller.dart';
import 'package:school_camera/features/timeline/domain/timeline_block.dart';
import 'package:school_camera/features/timeline/domain/timeline_camera_context.dart';

void openRecordingPlayback(
  BuildContext context, {
  required TimelineCameraContext cameraContext,
  required TimelineBlock block,
}) {
  final args = RecordingPlaybackArgs(
    cameraId: cameraContext.cameraId,
    start: block.start,
    end: block.end,
    quality: block.quality,
    cameraName: cameraContext.cameraName,
    schoolName: cameraContext.schoolName,
    classroomName: cameraContext.classroomName,
    childName: cameraContext.childName,
    blockHasGaps: block.hasGaps,
  );
  context.push(AppRoutes.playbackCamera(cameraContext.cameraId), extra: args);
}
