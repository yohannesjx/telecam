import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:school_camera/features/cameras/application/parent_cameras_controller.dart';
import 'package:school_camera/features/children/application/children_controller.dart';
import 'package:school_camera/features/subscription/application/subscription_controller.dart';

Future<void> refreshParentHomeData(WidgetRef ref) async {
  await Future.wait([
    ref.read(childrenControllerProvider.notifier).refresh(),
    ref.read(parentCamerasControllerProvider.notifier).refresh(),
    ref.read(subscriptionControllerProvider.notifier).refresh(),
  ]);
}
