import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:school_camera/features/billing/application/invoices_controller.dart';
import 'package:school_camera/features/billing/application/payments_controller.dart';
import 'package:school_camera/features/cameras/application/parent_cameras_controller.dart';
import 'package:school_camera/features/children/application/children_controller.dart';
import 'package:school_camera/features/playback/application/live_camera_context_provider.dart';
import 'package:school_camera/features/subscription/application/subscription_controller.dart';

/// Clears in-memory parent data and playback context after logout.
void clearSessionProviders(WidgetRef ref) {
  ref.invalidate(liveCameraContextProvider);
  ref.invalidate(childrenControllerProvider);
  ref.invalidate(parentCamerasControllerProvider);
  ref.invalidate(subscriptionControllerProvider);
  ref.invalidate(paymentsControllerProvider);
  ref.invalidate(invoicesControllerProvider);
}
