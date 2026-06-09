/// Offline payment method shown to parents (no gateway secrets).
class PaymentMethodInfo {
  const PaymentMethodInfo({
    required this.type,
    required this.label,
    this.instructions,
  });

  final String type;
  final String label;
  final String? instructions;

  static PaymentMethodInfo fromDynamic(dynamic raw) {
    if (raw is Map) {
      final map = Map<String, dynamic>.from(raw);
      final type = _string(map['type'] ?? map['method'] ?? map['id']) ?? 'UNKNOWN';
      return PaymentMethodInfo(
        type: type,
        label: _string(map['label'] ?? map['name']) ?? labelForType(type),
        instructions: _string(map['instructions'] ?? map['instruction']),
      );
    }
    final type = raw.toString();
    return PaymentMethodInfo(
      type: type,
      label: labelForType(type),
      instructions: defaultInstructions(type),
    );
  }

  static List<PaymentMethodInfo> listFromJson(dynamic raw) {
    if (raw is! List) return [];
    return raw.map(fromDynamic).toList();
  }

  static String labelForType(String type) {
    switch (type.toUpperCase().replaceAll(' ', '_')) {
      case 'BANK_TRANSFER':
        return 'Bank Transfer';
      case 'TELEBIRR':
        return 'Telebirr';
      case 'CASH':
      case 'CASH_AT_SCHOOL':
        return 'Cash at school';
      default:
        return type.replaceAll('_', ' ');
    }
  }

  static String? defaultInstructions(String type) {
    switch (type.toUpperCase()) {
      case 'BANK_TRANSFER':
        return 'Transfer to the school bank account and include your child\'s name as the reference.';
      case 'TELEBIRR':
        return 'Send payment via Telebirr using the reference provided by the school office.';
      case 'CASH':
      case 'CASH_AT_SCHOOL':
        return 'Pay in person at the school office during business hours.';
      default:
        return null;
    }
  }

  static String? _string(dynamic value) {
    if (value is String && value.trim().isNotEmpty) return value.trim();
    return null;
  }
}
