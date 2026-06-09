import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:school_camera/core/config/app_config_provider.dart';
import 'package:school_camera/core/network/api_client.dart';
import 'package:school_camera/core/network/auth_interceptor.dart';
import 'package:school_camera/features/auth/application/auth_providers.dart';

BaseOptions _baseOptions(String apiBaseUrl) => BaseOptions(
      baseUrl: apiBaseUrl,
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 30),
      sendTimeout: const Duration(seconds: 30),
      headers: const {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      validateStatus: (status) => status != null && status < 500,
    );

/// Dio for auth endpoints only (no auth interceptor — avoids provider cycles).
final authDioProvider = Provider<Dio>((ref) {
  final config = ref.watch(appConfigProvider);
  return Dio(_baseOptions(config.apiBaseUrl));
});

/// Dio for protected API calls with bearer token + refresh interceptor.
final dioProvider = Provider<Dio>((ref) {
  final config = ref.watch(appConfigProvider);
  final dio = Dio(_baseOptions(config.apiBaseUrl));

  dio.interceptors.add(
    AuthInterceptor(
      readAccessToken: () => ref.read(authControllerProvider).accessToken,
      refreshAccessToken: () =>
          ref.read(authControllerProvider.notifier).refreshSession(),
      onForceLogout: () =>
          ref.read(authControllerProvider.notifier).forceLogout(),
    ),
  );

  return dio;
});

/// Application [ApiClient] built on top of [dioProvider].
final apiClientProvider = Provider<ApiClient>((ref) {
  return ApiClient(ref.watch(dioProvider));
});
