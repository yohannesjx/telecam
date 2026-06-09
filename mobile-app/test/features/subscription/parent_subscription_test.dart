import 'package:flutter_test/flutter_test.dart';
import 'package:school_camera/features/subscription/domain/parent_subscription.dart';

void main() {
  test('statusMessage for active subscription', () {
    const sub = ParentSubscription(
      id: '1',
      schoolId: 's',
      schoolName: 'School',
      status: 'ACTIVE',
      playbackAllowed: true,
      daysRemaining: 10,
    );
    expect(sub.statusMessage, 'Your camera access is active.');
    expect(sub.statusLabel, 'Active');
  });

  test('parses payment methods as strings', () {
    final sub = ParentSubscription.fromJson({
      'id': '1',
      'school_id': 's',
      'school_name': 'School',
      'status': 'ACTIVE',
      'allowed_playback': true,
      'payment_methods': ['BANK_TRANSFER', 'TELEBIRR'],
    });
    expect(sub.paymentMethods, hasLength(2));
    expect(sub.paymentMethods.first.label, 'Bank Transfer');
  });

  test('resolvedPaymentMethods handles string list', () {
    const sub = ParentSubscription(
      id: '1',
      schoolId: 's',
      schoolName: 'School',
      status: 'ACTIVE',
      paymentMethods: [],
    );
    // Simulate pre-Phase-6 in-memory shape via dynamic assignment pattern.
    final legacy = ParentSubscription.fromJson({
      'id': '1',
      'school_id': 's',
      'school_name': 'School',
      'status': 'ACTIVE',
      'payment_methods': ['CASH'],
    });
    expect(legacy.resolvedPaymentMethods.first.label, 'Cash at school');
  });

  test('ParentSubscriptionSummary playbackAllowed', () {
    const summary = ParentSubscriptionSummary(subscriptions: [
      ParentSubscription(
        id: '1',
        schoolId: 's',
        schoolName: 'School',
        status: 'EXPIRED',
        playbackAllowed: false,
      ),
      ParentSubscription(
        id: '2',
        schoolId: 's2',
        schoolName: 'School 2',
        status: 'ACTIVE',
        playbackAllowed: true,
      ),
    ]);
    expect(summary.playbackAllowed, isTrue);
  });
}
