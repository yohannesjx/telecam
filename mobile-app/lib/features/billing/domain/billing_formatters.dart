import 'package:intl/intl.dart';
import 'package:school_camera/features/subscription/domain/payment_method_info.dart';

/// Parent-facing labels for subscription and billing.
class BillingFormatters {
  BillingFormatters._();

  static const String defaultCurrency = 'ETB';

  static final NumberFormat _money = NumberFormat.currency(
    symbol: '$defaultCurrency ',
    decimalDigits: 2,
  );

  static final DateFormat _date = DateFormat('MMM d, yyyy');
  static final DateFormat _dateTime = DateFormat('MMM d, yyyy · h:mm a');

  static String formatMoney(int amountCents, {String? currency}) {
    final amount = amountCents / 100.0;
    final code = currency?.toUpperCase() ?? defaultCurrency;
    if (code == defaultCurrency) return _money.format(amount);
    return '$code ${amount.toStringAsFixed(2)}';
  }

  static String formatDate(DateTime? value) {
    if (value == null) return '—';
    return _date.format(value.toLocal());
  }

  static String formatDateTime(DateTime? value) {
    if (value == null) return '—';
    return _dateTime.format(value.toLocal());
  }

  static String formatDaysRemaining(int? days) {
    if (days == null) return '—';
    if (days <= 0) return 'Ends today';
    if (days == 1) return '1 day remaining';
    return '$days days remaining';
  }

  static String formatSubscriptionStatusLabel(String status) {
    switch (status.toUpperCase()) {
      case 'ACTIVE':
        return 'Active';
      case 'TRIAL':
        return 'Trial';
      case 'EXPIRED':
        return 'Expired';
      case 'PAST_DUE':
        return 'Needs renewal';
      case 'DISABLED':
        return 'Disabled';
      case 'CANCELLED':
        return 'Cancelled';
      default:
        return 'Unknown';
    }
  }

  static String formatSubscriptionStatusMessage(String status) {
    switch (status.toUpperCase()) {
      case 'ACTIVE':
        return 'Your camera access is active.';
      case 'TRIAL':
        return 'Your trial access is active.';
      case 'EXPIRED':
      case 'PAST_DUE':
        return 'Your subscription needs renewal.';
      case 'DISABLED':
      case 'CANCELLED':
        return 'Your camera access is not active.';
      default:
        return 'We could not confirm your subscription status.';
    }
  }

  static String formatPlaybackAllowedMessage(bool? allowed) {
    if (allowed == null) return 'Playback access is unavailable right now.';
    if (allowed) return 'You can watch live and recordings.';
    return 'Renew your subscription to continue watching.';
  }

  static String formatPaymentStatusLabel(String status) {
    switch (status.toUpperCase()) {
      case 'PENDING':
        return 'Pending review';
      case 'APPROVED':
        return 'Approved';
      case 'REJECTED':
        return 'Rejected';
      default:
        return 'Unknown';
    }
  }

  static String formatInvoiceStatusLabel(String status) {
    switch (status.toUpperCase()) {
      case 'OPEN':
        return 'Open';
      case 'PAID':
        return 'Paid';
      case 'OVERDUE':
        return 'Overdue';
      case 'VOID':
      case 'VOIDED':
        return 'Voided';
      default:
        return 'Unknown';
    }
  }

  static String paymentMethodLabel(String method) =>
      PaymentMethodInfo.labelForType(method);
}
