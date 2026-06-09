import 'package:flutter_test/flutter_test.dart';
import 'package:school_camera/features/billing/domain/billing_formatters.dart';

void main() {
  test('formatMoney from cents', () {
    expect(
      BillingFormatters.formatMoney(120000),
      contains('1,200'),
    );
  });

  test('formatSubscriptionStatusLabel', () {
    expect(BillingFormatters.formatSubscriptionStatusLabel('PAST_DUE'), 'Needs renewal');
  });

  test('formatPaymentStatusLabel', () {
    expect(BillingFormatters.formatPaymentStatusLabel('PENDING'), 'Pending review');
  });
}
