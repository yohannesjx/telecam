import 'dart:convert';

import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:go_router/go_router.dart';
import 'package:school_camera/app/router.dart';
import 'package:school_camera/core/utils/logger.dart';
import 'package:school_camera/features/notifications/data/notification_repository.dart';

/// Background FCM handler (top-level).
@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  // No secrets logged; OS may show notification when payload includes notification block.
}

class NotificationService {
  NotificationService({required NotificationRepository repository})
      : _repository = repository;

  final NotificationRepository _repository;
  final FirebaseMessaging _messaging = FirebaseMessaging.instance;
  final FlutterLocalNotificationsPlugin _local = FlutterLocalNotificationsPlugin();

  static const _channelId = 'parent_updates';
  static const _channelName = 'School updates';

  GoRouter? _router;
  void Function(String token)? _onTokenRefresh;
  bool _initialized = false;

  Future<void> initialize(GoRouter router) async {
    if (_initialized) return;
    _router = router;
    _initialized = true;

    await _initLocalNotifications();
    FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);

    FirebaseMessaging.onMessage.listen(_onForegroundMessage);
    FirebaseMessaging.onMessageOpenedApp.listen(_onMessageOpened);
    final initial = await _messaging.getInitialMessage();
    if (initial != null) {
      _navigateFromMessage(initial);
    }

    _messaging.onTokenRefresh.listen((token) {
      if (token.isEmpty) return;
      _onTokenRefresh?.call(token);
    });
  }

  void setTokenRefreshHandler(void Function(String token)? handler) {
    _onTokenRefresh = handler;
  }

  Future<bool> requestPermission() async {
    if (!kIsWeb && defaultTargetPlatform == TargetPlatform.android) {
      final android = _local.resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin>();
      await android?.requestNotificationsPermission();
    }

    final settings = await _messaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );
    final granted = settings.authorizationStatus == AuthorizationStatus.authorized ||
        settings.authorizationStatus == AuthorizationStatus.provisional;
    return granted;
  }

  Future<String?> getToken() async {
    try {
      return await _messaging.getToken();
    } catch (e) {
      AppLogger.warning('FCM token unavailable');
      return null;
    }
  }

  Future<void> registerTokenWithBackend({
    required String token,
    required bool notificationsEnabled,
  }) async {
    await _repository.registerToken(
      fcmToken: token,
      notificationsEnabled: notificationsEnabled,
    );
  }

  Future<void> disableOnBackend() => _repository.disableNotificationsBestEffort();

  void clearLocalState() {
    _onTokenRefresh = null;
  }

  void dispose() {
    clearLocalState();
  }

  Future<void> _initLocalNotifications() async {
    const android = AndroidInitializationSettings('@mipmap/ic_launcher');
    const ios = DarwinInitializationSettings();
    await _local.initialize(
      settings: const InitializationSettings(android: android, iOS: ios),
      onDidReceiveNotificationResponse: (details) {
        final payload = details.payload;
        if (payload == null || payload.isEmpty) return;
        try {
          final map = jsonDecode(payload) as Map<String, dynamic>;
          _navigateFromData(map);
        } catch (_) {}
      },
    );

    const channel = AndroidNotificationChannel(
      _channelId,
      _channelName,
      description: 'Subscription, payment, and school notices',
      importance: Importance.high,
    );
    final androidPlugin = _local.resolvePlatformSpecificImplementation<
        AndroidFlutterLocalNotificationsPlugin>();
    await androidPlugin?.createNotificationChannel(channel);
  }

  Future<void> _onForegroundMessage(RemoteMessage message) async {
    final title = message.notification?.title ?? message.data['title'] ?? 'School Camera';
    final body = message.notification?.body ?? message.data['body'] ?? '';
    if (body.isEmpty) return;

    final payload = jsonEncode(message.data);
    const androidDetails = AndroidNotificationDetails(
      _channelId,
      _channelName,
      importance: Importance.high,
      priority: Priority.high,
    );
    const iosDetails = DarwinNotificationDetails();
    await _local.show(
      id: message.hashCode,
      title: title,
      body: body,
      notificationDetails: const NotificationDetails(
        android: androidDetails,
        iOS: iosDetails,
      ),
      payload: payload,
    );
  }

  void _onMessageOpened(RemoteMessage message) {
    _navigateFromMessage(message);
  }

  void _navigateFromMessage(RemoteMessage message) {
    _navigateFromData(message.data);
  }

  void _navigateFromData(Map<String, dynamic> data) {
    final router = _router;
    if (router == null) return;

    final type = data['type']?.toString() ?? '';
    final route = data['route']?.toString();

    if (route != null && route.isNotEmpty) {
      router.go(route);
      return;
    }

    switch (type) {
      case 'PAYMENT_APPROVED':
      case 'SUBSCRIPTION_EXPIRING':
      case 'SUBSCRIPTION_EXPIRED':
        router.go(AppRoutes.subscription);
      case 'PAYMENT_REJECTED':
        router.go(AppRoutes.billingPayments);
      case 'INVOICE_CREATED':
        router.go(AppRoutes.billingInvoices);
      case 'IMPORTANT_NOTICE':
      case 'CAMERA_UNAVAILABLE_PARENT_NOTICE':
        router.go(AppRoutes.home);
      default:
        break;
    }
  }
}
