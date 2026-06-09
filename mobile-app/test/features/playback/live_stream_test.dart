import 'package:flutter_test/flutter_test.dart';
import 'package:school_camera/features/playback/domain/live_stream.dart';

void main() {
  test('parses signed_hls_url from backend payload', () {
    final stream = LiveStream.fromJson({
      'camera_id': 'cam-1',
      'camera_name': 'Front Camera',
      'school_name': 'Sunshine Kindergarten',
      'classroom_name': 'KG-1 A',
      'quality': 'sd_360p',
      'delay_seconds': 30,
      'signed_hls_url': 'https://cdn.example.com/live/index.m3u8?sig=secret',
      'expires_at': '2026-05-24T12:00:00Z',
    });

    expect(stream.playbackUrl, contains('m3u8'));
    expect(stream.cameraName, 'Front Camera');
    expect(stream.delaySeconds, 30);
    expect(stream.toString(), isNot(contains('secret')));
  });

  test('parses flexible url keys', () {
    final stream = LiveStream.fromJson({
      'camera_id': 'c',
      'hls_url': 'https://cdn.example.com/a.m3u8',
      'delay_seconds': 15,
    });
    expect(stream.playbackUrl, contains('m3u8'));
  });
}
