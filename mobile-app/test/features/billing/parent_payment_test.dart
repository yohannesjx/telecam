import 'package:flutter_test/flutter_test.dart';
import 'package:school_camera/features/billing/domain/parent_payment.dart';

void main() {
  test('parses parent payment', () {
    final payment = ParentPayment.fromJson({
      'id': 'p1',
      'amount_cents': 50000,
      'currency': 'ETB',
      'payment_method': 'TELEBIRR',
      'status': 'PENDING',
      'reference': 'REF-123',
      'created_at': '2026-05-24T10:00:00Z',
    });
    expect(payment.amountCents, 50000);
    expect(payment.statusLabel, 'Pending review');
    expect(payment.toString(), isNot(contains('REF-123')));
  });
}
