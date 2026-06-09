import 'package:school_camera/features/billing/domain/billing_formatters.dart';

class ParentPayment {
  const ParentPayment({
    required this.id,
    required this.amountCents,
    required this.currency,
    required this.method,
    required this.status,
    this.schoolName,
    this.reference,
    this.createdAt,
    this.approvedAt,
    this.rejectedAt,
  });

  final String id;
  final int amountCents;
  final String currency;
  final String method;
  final String status;
  final String? schoolName;
  final String? reference;
  final DateTime? createdAt;
  final DateTime? approvedAt;
  final DateTime? rejectedAt;

  String get amountLabel => BillingFormatters.formatMoney(amountCents, currency: currency);

  String get methodLabel => BillingFormatters.paymentMethodLabel(method);

  String get statusLabel => BillingFormatters.formatPaymentStatusLabel(status);

  factory ParentPayment.fromJson(Map<String, dynamic> json) {
    return ParentPayment(
      id: _string(json['id']) ?? '',
      amountCents: _int(json['amount_cents'] ?? json['amountCents']) ?? 0,
      currency: _string(json['currency']) ?? BillingFormatters.defaultCurrency,
      method: _string(json['payment_method'] ?? json['method']) ?? 'UNKNOWN',
      status: (_string(json['status']) ?? 'UNKNOWN').toUpperCase(),
      schoolName: _string(json['school_name'] ?? json['schoolName']),
      reference: _string(json['reference']),
      createdAt: _parseTime(json['created_at'] ?? json['createdAt']),
      approvedAt: _parseTime(json['approved_at'] ?? json['approvedAt']),
      rejectedAt: _parseTime(json['rejected_at'] ?? json['rejectedAt']),
    );
  }

  static List<ParentPayment> listFromJson(dynamic raw) {
    if (raw is! List) return [];
    return raw
        .whereType<Map>()
        .map((e) => ParentPayment.fromJson(Map<String, dynamic>.from(e)))
        .toList();
  }

  static String? _string(dynamic value) {
    if (value is String && value.trim().isNotEmpty) return value.trim();
    return null;
  }

  static int? _int(dynamic value) {
    if (value is int) return value;
    if (value is num) return value.toInt();
    if (value is String) return int.tryParse(value);
    return null;
  }

  static DateTime? _parseTime(dynamic value) {
    if (value is String && value.isNotEmpty) return DateTime.tryParse(value);
    return null;
  }

  @override
  String toString() => 'ParentPayment(id: $id, status: $status, amountCents: $amountCents)';
}
