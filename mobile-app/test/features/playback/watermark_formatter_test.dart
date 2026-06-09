import 'package:flutter_test/flutter_test.dart';
import 'package:school_camera/features/playback/domain/watermark_formatter.dart';

void main() {
  test('parentLine includes label and time', () {
    final line = WatermarkFormatter.parentLine(
      parentLabel: 'parent@example.com',
      at: DateTime(2026, 5, 24, 14, 32),
    );
    expect(line, contains('parent@example.com'));
    expect(line, contains('2026-05-24 14:32'));
  });

  test('detailLine joins child classroom camera', () {
    expect(
      WatermarkFormatter.detailLine(
        childName: 'Abel',
        classroomName: 'KG-1 A',
        cameraName: 'Front Camera',
      ),
      'Abel • KG-1 A • Front Camera',
    );
  });
}
