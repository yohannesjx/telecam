import 'package:flutter_test/flutter_test.dart';
import 'package:school_camera/features/billing/domain/parent_invoice.dart';

void main() {
  test('parses parent invoice', () {
    final invoice = ParentInvoice.fromJson({
      'id': 'inv1',
      'invoice_number': 'INV-2026-001',
      'amount_cents': 120000,
      'currency': 'ETB',
      'status': 'OPEN',
      'due_date': '2026-06-01',
    });
    expect(invoice.displayNumber, 'INV-2026-001');
    expect(invoice.statusLabel, 'Open');
  });
}
