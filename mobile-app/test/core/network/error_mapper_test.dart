import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:school_camera/core/network/api_error.dart';
import 'package:school_camera/core/network/error_mapper.dart';

void main() {
  group('mapDioError', () {
    test('maps backend LIVE_OUTSIDE_SCHOOL_HOURS code', () {
      final error = DioException(
        requestOptions: RequestOptions(path: '/test'),
        response: Response(
          requestOptions: RequestOptions(path: '/test'),
          statusCode: 403,
          data: {'code': 'LIVE_OUTSIDE_SCHOOL_HOURS'},
        ),
        type: DioExceptionType.badResponse,
      );

      final result = mapDioError(error);
      expect(result.code, AppErrorCode.liveOutsideSchoolHours);
      expect(result.message, contains('school hours'));
    });

    test('maps nested error.code', () {
      final error = DioException(
        requestOptions: RequestOptions(path: '/test'),
        response: Response(
          requestOptions: RequestOptions(path: '/test'),
          statusCode: 403,
          data: {
            'error': {'code': 'ACCESS_DENIED', 'message': 'raw'},
          },
        ),
        type: DioExceptionType.badResponse,
      );

      final result = mapDioError(error);
      expect(result.code, AppErrorCode.accessDenied);
      expect(result.message, isNot(contains('raw')));
    });

    test('maps 401 to unauthorized', () {
      final error = DioException(
        requestOptions: RequestOptions(path: '/test'),
        response: Response(
          requestOptions: RequestOptions(path: '/test'),
          statusCode: 401,
        ),
        type: DioExceptionType.badResponse,
      );

      final result = mapDioError(error);
      expect(result.code, AppErrorCode.unauthorized);
      expect(result.message, contains('log in'));
    });

    test('maps NO_RECENT_SEGMENT code', () {
      final error = DioException(
        requestOptions: RequestOptions(path: '/live'),
        response: Response(
          requestOptions: RequestOptions(path: '/live'),
          statusCode: 400,
          data: {'code': 'NO_RECENT_SEGMENT'},
        ),
        type: DioExceptionType.badResponse,
      );

      final result = mapDioError(error);
      expect(result.code, AppErrorCode.noRecentSegment);
      expect(result.message, contains('not ready yet'));
    });

    test('maps connection error to network', () {
      final error = DioException(
        requestOptions: RequestOptions(path: '/test'),
        type: DioExceptionType.connectionError,
      );

      final result = mapDioError(error);
      expect(result.code, AppErrorCode.network);
    });
  });
}
