import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:school_camera/app/router.dart';
import 'package:school_camera/features/cameras/domain/parent_camera.dart';
import 'package:school_camera/features/playback/application/live_camera_context_provider.dart';
import 'package:school_camera/features/playback/domain/live_camera_context.dart';

void openLivePlayer(
  BuildContext context,
  WidgetRef ref, {
  required String cameraId,
  String? cameraName,
  String? schoolName,
  String? classroomName,
  String? childName,
}) {
  ref.read(liveCameraContextProvider.notifier).state = LiveCameraContext(
    cameraId: cameraId,
    cameraName: cameraName,
    schoolName: schoolName,
    classroomName: classroomName,
    childName: childName,
  );
  context.push(AppRoutes.liveCamera(cameraId));
}

void openLivePlayerFromCamera(BuildContext context, WidgetRef ref, ParentCamera camera) {
  openLivePlayer(
    context,
    ref,
    cameraId: camera.cameraId,
    cameraName: camera.cameraName,
    schoolName: camera.schoolName,
    classroomName: camera.classroomName.isNotEmpty ? camera.classroomName : null,
    childName: camera.linkedChildName,
  );
}
