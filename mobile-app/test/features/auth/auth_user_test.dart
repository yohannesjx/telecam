import 'package:flutter_test/flutter_test.dart';
import 'package:school_camera/features/auth/data/models/auth_user.dart';

void main() {
  test('parses snake_case user json', () {
    final user = AuthUser.fromJson({
      'id': 'uuid-1',
      'email': 'parent@example.com',
      'role': 'PARENT',
      'status': 'ACTIVE',
      'full_name': 'Parent One',
      'force_password_change': false,
    });

    expect(user.id, 'uuid-1');
    expect(user.email, 'parent@example.com');
    expect(user.role, 'PARENT');
    expect(user.status, 'ACTIVE');
    expect(user.name, 'Parent One');
    expect(user.isParent, isTrue);
    expect(user.isActive, isTrue);
  });

  test('round-trips through json string storage', () {
    const user = AuthUser(
      id: '1',
      email: 'a@b.com',
      role: 'PARENT',
      status: 'ACTIVE',
    );
    final restored = AuthUser.fromJsonString(user.toJsonString());
    expect(restored?.email, 'a@b.com');
  });
}
