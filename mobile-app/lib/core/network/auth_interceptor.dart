import 'dart:async';

import 'package:dio/dio.dart';

typedef AccessTokenReader = String? Function();
typedef TokenRefreshCallback = Future<String?> Function();
typedef ForceLogoutCallback = Future<void> Function();

/// Attaches bearer tokens and refreshes once on 401.
class AuthInterceptor extends QueuedInterceptor {
  AuthInterceptor({
    required this.readAccessToken,
    required this.refreshAccessToken,
    required this.onForceLogout,
  });

  final AccessTokenReader readAccessToken;
  final TokenRefreshCallback refreshAccessToken;
  final ForceLogoutCallback onForceLogout;

  Completer<String?>? _refreshCompleter;

  static const _skipAuthKey = 'skipAuth';

  bool _shouldSkip(RequestOptions options) {
    if (options.extra[_skipAuthKey] == true) return true;
    final path = options.path;
    return path.contains('/auth/login') || path.contains('/auth/refresh');
  }

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    if (!_shouldSkip(options)) {
      final token = readAccessToken();
      if (token != null && token.isNotEmpty) {
        options.headers['Authorization'] = 'Bearer $token';
      }
    }
    handler.next(options);
  }

  @override
  Future<void> onError(
    DioException err,
    ErrorInterceptorHandler handler,
  ) async {
    final response = err.response;
    final options = err.requestOptions;

    if (response?.statusCode != 401 || _shouldSkip(options)) {
      handler.next(err);
      return;
    }

    if (options.extra['retried'] == true) {
      await onForceLogout();
      handler.next(err);
      return;
    }

    try {
      final newToken = await _refreshTokenOnce();
      if (newToken == null || newToken.isEmpty) {
        await onForceLogout();
        handler.next(err);
        return;
      }

      final retryOptions = options.copyWith(
        headers: Map<String, dynamic>.from(options.headers)
          ..['Authorization'] = 'Bearer $newToken',
        extra: Map<String, dynamic>.from(options.extra)..['retried'] = true,
      );

      final dio = Dio(
        BaseOptions(
          baseUrl: options.baseUrl,
          connectTimeout: options.connectTimeout,
          receiveTimeout: options.receiveTimeout,
          sendTimeout: options.sendTimeout,
        ),
      );

      final retryResponse = await dio.fetch<dynamic>(retryOptions);
      handler.resolve(retryResponse);
    } catch (_) {
      await onForceLogout();
      handler.next(err);
    }
  }

  Future<String?> _refreshTokenOnce() async {
    if (_refreshCompleter != null) {
      return _refreshCompleter!.future;
    }

    _refreshCompleter = Completer<String?>();
    try {
      final token = await refreshAccessToken();
      _refreshCompleter!.complete(token);
      return token;
    } catch (e) {
      _refreshCompleter!.completeError(e);
      rethrow;
    } finally {
      _refreshCompleter = null;
    }
  }
}
