import 'package:flutter_test/flutter_test.dart';
import 'package:school_camera/features/playback/domain/recording_playback.dart';

void main() {
  test('parses signed_hls_url for recording playback', () {
    final playback = RecordingPlayback.fromJson({
      'camera_id': 'c1',
      'camera_name': 'Front',
      'start': '2026-05-24T08:30:00Z',
      'end': '2026-05-24T09:00:00Z',
      'quality': 'sd_360p',
      'signed_hls_url': 'https://cdn.example.com/vod.m3u8?sig=x',
      'warnings': ['Requested range contains missing recording gaps'],
    });
    expect(playback.playbackUrl, contains('m3u8'));
    expect(playback.hasGaps, isTrue);
    expect(playback.toString(), isNot(contains('sig=')));
  });
}
