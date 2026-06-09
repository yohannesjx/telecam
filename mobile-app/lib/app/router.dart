import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:school_camera/app/router_notifier.dart';
import 'package:school_camera/app/router_redirect.dart';
import 'package:school_camera/features/account/presentation/account_page.dart';
import 'package:school_camera/features/account/presentation/privacy_safety_page.dart';
import 'package:school_camera/features/auth/application/auth_providers.dart';
import 'package:school_camera/features/auth/presentation/change_password_page.dart';
import 'package:school_camera/features/auth/presentation/login_page.dart';
import 'package:school_camera/features/cameras/presentation/cameras_page.dart';
import 'package:school_camera/features/playback/application/recording_playback_controller.dart';
import 'package:school_camera/features/playback/presentation/live_player_page.dart';
import 'package:school_camera/features/playback/presentation/recording_playback_page.dart';
import 'package:school_camera/features/children/presentation/children_page.dart';
import 'package:school_camera/features/home/presentation/home_page.dart';
import 'package:school_camera/features/notifications/presentation/notification_settings_page.dart';
import 'package:school_camera/features/security/application/security_providers.dart';
import 'package:school_camera/features/security/presentation/locked_page.dart';
import 'package:school_camera/features/shell/presentation/parent_shell.dart';
import 'package:school_camera/features/splash/splash_page.dart';
import 'package:school_camera/features/billing/presentation/invoices_page.dart';
import 'package:school_camera/features/billing/presentation/payments_page.dart';
import 'package:school_camera/features/subscription/presentation/subscription_page.dart';
import 'package:school_camera/features/timeline/presentation/timeline_cameras_page.dart';
import 'package:school_camera/features/timeline/presentation/timeline_page.dart';

/// Named route paths for the parent app.
class AppRoutes {
  AppRoutes._();

  static const String splash = '/splash';
  static const String login = '/login';
  static const String locked = '/locked';
  static const String home = '/home';
  static const String children = '/children';
  /// Live tab — camera list (no player).
  static const String cameras = '/cameras';
  static const String timeline = '/timeline';
  static const String subscription = '/subscription';
  static const String billingPayments = '/billing/payments';
  static const String billingInvoices = '/billing/invoices';
  static const String account = '/account';
  static const String changePassword = '/change-password';
  static const String privacySafety = '/privacy-safety';
  static const String notificationSettings = '/notification-settings';

  static String liveCamera(String cameraId) => '/live/$cameraId';
  static String timelineCamera(String cameraId) => '/timeline/$cameraId';
  static String playbackCamera(String cameraId) => '/playback/$cameraId';
}

final _rootNavigatorKey = GlobalKey<NavigatorState>();
final routerProvider = Provider<GoRouter>((ref) {
  final notifier = ref.watch(routerNotifierProvider);

  return GoRouter(
    navigatorKey: _rootNavigatorKey,
    initialLocation: AppRoutes.splash,
    refreshListenable: notifier,
    redirect: (context, state) {
      final auth = ref.read(authControllerProvider);
      final security = ref.read(securityControllerProvider);
      return resolveAppRedirect(
        auth: auth,
        security: security,
        location: state.matchedLocation,
      );
    },
    routes: [
      GoRoute(
        path: AppRoutes.splash,
        name: 'splash',
        builder: (context, state) => const SplashPage(),
      ),
      GoRoute(
        path: AppRoutes.login,
        name: 'login',
        builder: (context, state) => LoginPage(
          message: state.uri.queryParameters['message'],
        ),
      ),
      GoRoute(
        path: AppRoutes.locked,
        name: 'locked',
        builder: (context, state) => const LockedPage(),
      ),
      GoRoute(
        path: AppRoutes.changePassword,
        name: 'changePassword',
        builder: (context, state) => const ChangePasswordPage(),
      ),
      GoRoute(
        path: AppRoutes.privacySafety,
        name: 'privacySafety',
        builder: (context, state) => const PrivacySafetyPage(),
      ),
      GoRoute(
        path: AppRoutes.notificationSettings,
        name: 'notificationSettings',
        builder: (context, state) => const NotificationSettingsPage(),
      ),
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: AppRoutes.children,
        name: 'children',
        builder: (context, state) => const ChildrenPage(),
      ),
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: '/live/:cameraId',
        name: 'liveCamera',
        builder: (context, state) {
          final cameraId = state.pathParameters['cameraId']!;
          return LivePlayerPage(cameraId: cameraId);
        },
      ),
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: '/timeline/:cameraId',
        name: 'timelineCamera',
        builder: (context, state) {
          final cameraId = state.pathParameters['cameraId']!;
          return TimelinePage(cameraId: cameraId);
        },
      ),
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: AppRoutes.billingPayments,
        name: 'billingPayments',
        builder: (context, state) => const PaymentsPage(),
      ),
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: AppRoutes.billingInvoices,
        name: 'billingInvoices',
        builder: (context, state) => const InvoicesPage(),
      ),
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: '/playback/:cameraId',
        name: 'playbackCamera',
        builder: (context, state) {
          final extra = state.extra;
          if (extra is! RecordingPlaybackArgs) {
            return const Scaffold(
              body: Center(child: Text('Recording session not found.')),
            );
          }
          return RecordingPlaybackPage(args: extra);
        },
      ),
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) {
          return ParentShell(navigationShell: navigationShell);
        },
        branches: [
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: AppRoutes.home,
                name: 'home',
                builder: (context, state) => const HomePage(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: AppRoutes.cameras,
                name: 'cameras',
                builder: (context, state) => const CamerasPage(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: AppRoutes.timeline,
                name: 'timeline',
                builder: (context, state) => const TimelineCamerasPage(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: AppRoutes.subscription,
                name: 'subscription',
                builder: (context, state) => const SubscriptionPage(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: AppRoutes.account,
                name: 'account',
                builder: (context, state) => const AccountPage(),
              ),
            ],
          ),
        ],
      ),
    ],
    errorBuilder: (context, state) => Scaffold(
      body: Center(child: Text('Page not found: ${state.uri}')),
    ),
  );
});
