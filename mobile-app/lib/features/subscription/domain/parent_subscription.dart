import 'package:school_camera/features/billing/domain/billing_formatters.dart';
import 'package:school_camera/features/subscription/domain/payment_method_info.dart';

class ParentSubscription {
  const ParentSubscription({
    required this.id,
    required this.schoolId,
    required this.schoolName,
    required this.status,
    this.playbackAllowed,
    this.daysRemaining,
    this.startsAt,
    this.endsAt,
    this.childName,
    this.paymentMethods = const [],
  });

  final String id;
  final String schoolId;
  final String schoolName;
  final String status;
  final bool? playbackAllowed;
  final int? daysRemaining;
  final DateTime? startsAt;
  final DateTime? endsAt;
  final String? childName;
  final List<PaymentMethodInfo> paymentMethods;

  /// Normalizes payment methods (handles legacy [List<String>] after hot reload).
  List<PaymentMethodInfo> get resolvedPaymentMethods {
    final raw = (this as dynamic).paymentMethods;
    if (raw is List<PaymentMethodInfo>) return raw;
    if (raw is List) {
      return raw
          .map(
            (e) => e is PaymentMethodInfo
                ? e
                : PaymentMethodInfo.fromDynamic(e),
          )
          .toList();
    }
    return const [];
  }

  bool get allowedPlayback => playbackAllowed ?? false;

  String get statusLabel => BillingFormatters.formatSubscriptionStatusLabel(status);

  String get statusMessage =>
      BillingFormatters.formatSubscriptionStatusMessage(status);

  String get playbackMessage =>
      BillingFormatters.formatPlaybackAllowedMessage(playbackAllowed);

  bool get isActiveStatus {
    final s = status.toUpperCase();
    return s == 'ACTIVE' || s == 'TRIAL';
  }

  factory ParentSubscription.fromJson(Map<String, dynamic> json) {
    final methodsRaw = json['payment_methods'];
    List<PaymentMethodInfo> methods;
    if (methodsRaw is List && methodsRaw.isNotEmpty && methodsRaw.first is Map) {
      methods = PaymentMethodInfo.listFromJson(methodsRaw);
    } else if (methodsRaw is List) {
      methods = methodsRaw.map(PaymentMethodInfo.fromDynamic).toList();
    } else {
      methods = const [];
    }

    return ParentSubscription(
      id: _string(json['id']) ?? '',
      schoolId: _string(json['school_id'] ?? json['schoolId']) ?? '',
      schoolName: _string(json['school_name'] ?? json['schoolName']) ?? '',
      status: (_string(json['status']) ?? 'UNKNOWN').toUpperCase(),
      playbackAllowed: json['allowed_playback'] as bool? ??
          json['playback_allowed'] as bool?,
      daysRemaining: _int(json['days_remaining'] ?? json['daysRemaining']),
      startsAt: _parseTime(json['starts_at'] ?? json['startsAt']),
      endsAt: _parseTime(json['ends_at'] ?? json['endsAt']),
      childName: _string(json['child_name'] ?? json['childName']),
      paymentMethods: methods,
    );
  }

  static List<ParentSubscription> listFromJson(dynamic raw) {
    if (raw is! List) return [];
    return raw
        .whereType<Map>()
        .map((e) => ParentSubscription.fromJson(Map<String, dynamic>.from(e)))
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
}

class ParentSubscriptionSummary {
  const ParentSubscriptionSummary({required this.subscriptions});

  final List<ParentSubscription> subscriptions;

  bool get playbackAllowed => subscriptions.any((s) => s.allowedPlayback);

  bool? get playbackAllowedNullable {
    if (subscriptions.isEmpty) return null;
    if (subscriptions.any((s) => s.playbackAllowed == true)) return true;
    if (subscriptions.every((s) => s.playbackAllowed == false)) return false;
    return null;
  }

  String get primaryStatusMessage {
    if (subscriptions.isEmpty) {
      return BillingFormatters.formatSubscriptionStatusMessage('UNKNOWN');
    }
    final primary = primarySubscription!;
    return primary.statusMessage;
  }

  ParentSubscription? get primarySubscription =>
      subscriptions.isNotEmpty ? subscriptions.first : null;

  int? get primaryDaysRemaining => primarySubscription?.daysRemaining;

  List<PaymentMethodInfo> get allPaymentMethods {
    final seen = <String>{};
    final out = <PaymentMethodInfo>[];
    for (final sub in subscriptions) {
      for (final m in sub.resolvedPaymentMethods) {
        if (seen.add(m.type)) out.add(m);
      }
    }
    return out;
  }
}
