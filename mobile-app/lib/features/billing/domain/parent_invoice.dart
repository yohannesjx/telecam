import 'package:school_camera/features/billing/domain/billing_formatters.dart';

class ParentInvoice {
  const ParentInvoice({
    required this.id,
    required this.amountCents,
    required this.currency,
    required this.status,
    this.invoiceNumber,
    this.description,
    this.schoolName,
    this.dueDate,
    this.paidAt,
    this.createdAt,
  });

  final String id;
  final String? invoiceNumber;
  final int amountCents;
  final String currency;
  final String status;
  final String? description;
  final String? schoolName;
  final DateTime? dueDate;
  final DateTime? paidAt;
  final DateTime? createdAt;

  String get amountLabel => BillingFormatters.formatMoney(amountCents, currency: currency);

  String get statusLabel => BillingFormatters.formatInvoiceStatusLabel(status);

  String get displayNumber => invoiceNumber ?? id.substring(0, 8);

  factory ParentInvoice.fromJson(Map<String, dynamic> json) {
    return ParentInvoice(
      id: _string(json['id']) ?? '',
      invoiceNumber: _string(json['invoice_number'] ?? json['invoiceNumber']),
      amountCents: _int(json['amount_cents'] ?? json['amountCents']) ?? 0,
      currency: _string(json['currency']) ?? BillingFormatters.defaultCurrency,
      status: (_string(json['status']) ?? 'UNKNOWN').toUpperCase(),
      description: _string(json['description']),
      schoolName: _string(json['school_name'] ?? json['schoolName']),
      dueDate: _parseDate(json['due_date'] ?? json['dueDate']),
      paidAt: _parseTime(json['paid_at'] ?? json['paidAt']),
      createdAt: _parseTime(json['created_at'] ?? json['createdAt']),
    );
  }

  static List<ParentInvoice> listFromJson(dynamic raw) {
    if (raw is! List) return [];
    return raw
        .whereType<Map>()
        .map((e) => ParentInvoice.fromJson(Map<String, dynamic>.from(e)))
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

  static DateTime? _parseDate(dynamic value) {
    if (value is String && value.isNotEmpty) {
      return DateTime.tryParse(value) ?? DateTime.tryParse('${value}T00:00:00Z');
    }
    return null;
  }

  @override
  String toString() => 'ParentInvoice(id: $id, status: $status)';
}
