import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:school_camera/app/router.dart';
import 'package:school_camera/features/cameras/domain/parent_camera.dart';
import 'package:school_camera/features/timeline/application/timeline_camera_context_provider.dart';
import 'package:school_camera/features/timeline/domain/timeline_camera_context.dart';

void openTimeline(
  BuildContext context,
  WidgetRef ref, {
  required String cameraId,
  String? cameraName,
  String? schoolName,
  String? classroomName,
  String? childName,
}) {
  ref.read(timelineCameraContextProvider.notifier).state = TimelineCameraContext(
    cameraId: cameraId,
    cameraName: cameraName,
    schoolName: schoolName,
    classroomName: classroomName,
    childName: childName,
  );
  context.push(AppRoutes.timelineCamera(cameraId));
}

void openTimelineFromCamera(BuildContext context, WidgetRef ref, ParentCamera camera) {
  openTimeline(
    context,
    ref,
    cameraId: camera.cameraId,
    cameraName: camera.cameraName,
    schoolName: camera.schoolName,
    classroomName: camera.classroomName.isNotEmpty ? camera.classroomName : null,
    childName: camera.linkedChildName,
  );
}
