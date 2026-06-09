import 'package:flutter_test/flutter_test.dart';
import 'package:school_camera/features/children/domain/child.dart';

void main() {
  test('Child.fromJson parses parent child payload', () {
    final child = Child.fromJson({
      'id': 'c1',
      'full_name': 'Ada Lovelace',
      'status': 'ACTIVE',
      'school_id': 's1',
      'school_name': 'Sunrise School',
      'classroom_name': 'Butterflies',
    });

    expect(child.fullName, 'Ada Lovelace');
    expect(child.schoolName, 'Sunrise School');
    expect(child.classroomName, 'Butterflies');
  });

  test('Child.listFromJson parses array', () {
    final list = Child.listFromJson([
      {'id': '1', 'full_name': 'A', 'status': 'ACTIVE', 'school_id': 's', 'school_name': 'S'},
    ]);
    expect(list, hasLength(1));
  });
}
