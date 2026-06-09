import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('dio resolves login URL with /api base and leading-slash path', () async {
    String? captured;
    final dio = Dio(BaseOptions(baseUrl: 'https://camera.iglooks.com/api'));
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          captured = options.uri.toString();
          handler.reject(
            DioException(
              requestOptions: options,
              type: DioExceptionType.cancel,
            ),
          );
        },
      ),
    );

    try {
      await dio.post<dynamic>('/auth/login', data: const {});
    } catch (_) {}

    expect(captured, 'https://camera.iglooks.com/api/auth/login');
  });

  test('missing /api prefix hits wrong host path', () async {
    String? captured;
    final dio = Dio(BaseOptions(baseUrl: 'https://camera.iglooks.com'));
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          captured = options.uri.toString();
          handler.reject(
            DioException(
              requestOptions: options,
              type: DioExceptionType.cancel,
            ),
          );
        },
      ),
    );

    try {
      await dio.post<dynamic>('/auth/login', data: const {});
    } catch (_) {}

    expect(captured, 'https://camera.iglooks.com/auth/login');
  });
}
