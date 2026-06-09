import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:school_camera/core/storage/secure_storage_service.dart';
import 'package:school_camera/features/auth/data/auth_api.dart';
import 'package:school_camera/features/auth/data/auth_repository.dart';
import 'package:school_camera/features/auth/data/auth_storage.dart';
import 'package:school_camera/features/auth/data/models/auth_user.dart';

void main() {
  late AuthRepository repository;

  setUp(() {
    repository = AuthRepository(
      api: AuthApi(Dio(BaseOptions(baseUrl: 'https://example.com'))),
      storage: AuthStorage(SecureStorageService()),
    );
  });

  group('isAllowedParent', () {
    test('allows active parent', () {
      const user = AuthUser(
        id: '1',
        email: 'p@test.com',
        role: 'PARENT',
        status: 'ACTIVE',
      );
      expect(repository.isAllowedParent(user), isTrue);
    });

    test('blocks super admin', () {
      const user = AuthUser(
        id: '1',
        email: 'a@test.com',
        role: 'SUPER_ADMIN',
        status: 'ACTIVE',
      );
      expect(repository.isAllowedParent(user), isFalse);
    });

    test('blocks school admin and technician', () {
      expect(
        repository.isAllowedParent(
          const AuthUser(id: '1', email: 'a@b.com', role: 'SCHOOL_ADMIN', status: 'ACTIVE'),
        ),
        isFalse,
      );
      expect(
        repository.isAllowedParent(
          const AuthUser(id: '1', email: 'a@b.com', role: 'TECHNICIAN', status: 'ACTIVE'),
        ),
        isFalse,
      );
    });

    test('blocks inactive parent', () {
      expect(
        repository.isAllowedParent(
          const AuthUser(id: '1', email: 'p@b.com', role: 'PARENT', status: 'BLOCKED'),
        ),
        isFalse,
      );
      expect(
        repository.isAllowedParent(
          const AuthUser(id: '1', email: 'p@b.com', role: 'PARENT', status: 'DISABLED'),
        ),
        isFalse,
      );
    });
  });

  test('friendly messages are defined', () {
    expect(AuthRepository.parentOnlyMessage, contains('parent'));
    expect(AuthRepository.inactiveMessage, contains('not active'));
  });
}
