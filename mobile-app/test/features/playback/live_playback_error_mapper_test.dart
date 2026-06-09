import 'package:flutter_test/flutter_test.dart';
import 'package:school_camera/core/network/api_error.dart';
import 'package:school_camera/features/playback/application/live_playback_error_mapper.dart';

void main() {
  test('mapLivePlaybackError maps 403 to camera access message', () {
    final err = mapLivePlaybackError(
      const AppError(
        code: AppErrorCode.accessDenied,
        message: 'forbidden',
        statusCode: 403,
      ),
    );
    expect(err.message, 'You do not have access to this camera.');
  });

  test('refineLiveErrorFromBody maps subscription code', () {
    final err = refineLiveErrorFromBody(
      const AppError(code: AppErrorCode.unknown, message: 'x', statusCode: 403),
      {'code': 'SUBSCRIPTION_REQUIRED'},
    );
    expect(err.code, AppErrorCode.subscriptionRequired);
    expect(err.message, 'Your subscription needs renewal.');
  });
}
