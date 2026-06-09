import 'package:flutter_test/flutter_test.dart';

/// Mirrors validation rules in [ChangePasswordForm].
({String? current, String? newPassword, String? confirm}) validateChangePassword({
  required String current,
  required String newPassword,
  required String confirm,
}) {
  String? currentError;
  String? newError;
  String? confirmError;

  if (current.isEmpty) currentError = 'Current password is required';
  if (newPassword.isEmpty) {
    newError = 'New password is required';
  } else if (newPassword.length < 8) {
    newError = 'Password must be at least 8 characters';
  } else if (newPassword == current) {
    newError = 'New password must be different from your current password';
  }
  if (confirm.isEmpty) {
    confirmError = 'Please confirm your new password';
  } else if (confirm != newPassword) {
    confirmError = 'Passwords do not match';
  }

  return (current: currentError, newPassword: newError, confirm: confirmError);
}

void main() {
  test('requires current password', () {
    final result = validateChangePassword(
      current: '',
      newPassword: 'newpass12',
      confirm: 'newpass12',
    );
    expect(result.current, isNotNull);
  });

  test('requires minimum length', () {
    final result = validateChangePassword(
      current: 'oldpass1',
      newPassword: 'short',
      confirm: 'short',
    );
    expect(result.newPassword, contains('8'));
  });

  test('new password must differ from current', () {
    final result = validateChangePassword(
      current: 'samepass1',
      newPassword: 'samepass1',
      confirm: 'samepass1',
    );
    expect(result.newPassword, contains('different'));
  });

  test('confirm must match', () {
    final result = validateChangePassword(
      current: 'oldpass12',
      newPassword: 'newpass123',
      confirm: 'newpass999',
    );
    expect(result.confirm, contains('match'));
  });

  test('valid passwords pass', () {
    final result = validateChangePassword(
      current: 'oldpass12',
      newPassword: 'newpass123',
      confirm: 'newpass123',
    );
    expect(result.current, isNull);
    expect(result.newPassword, isNull);
    expect(result.confirm, isNull);
  });
}
