import 'package:flutter_test/flutter_test.dart';
import 'package:school_camera/core/utils/account_formatters.dart';

void main() {
  test('roleLabel formats parent', () {
    expect(AccountFormatters.roleLabel('PARENT'), 'Parent');
  });

  test('statusLabel formats active', () {
    expect(AccountFormatters.statusLabel('ACTIVE'), 'Active');
    expect(AccountFormatters.isActiveStatus('ACTIVE'), isTrue);
    expect(AccountFormatters.isActiveStatus('BLOCKED'), isFalse);
  });
}
