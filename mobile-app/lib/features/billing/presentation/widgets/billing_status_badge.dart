import 'package:flutter/material.dart';
import 'package:school_camera/app/theme.dart';

class BillingStatusBadge extends StatelessWidget {
  const BillingStatusBadge({
    required this.label,
    this.tone = BillingBadgeTone.neutral,
    super.key,
  });

  final String label;
  final BillingBadgeTone tone;

  @override
  Widget build(BuildContext context) {
    final (bg, fg) = switch (tone) {
      BillingBadgeTone.success => (AppColors.primaryLight, AppColors.success),
      BillingBadgeTone.warning => (const Color(0xFFFFF7ED), AppColors.warning),
      BillingBadgeTone.danger => (const Color(0xFFFEF2F2), AppColors.error),
      BillingBadgeTone.neutral => (AppColors.border.withValues(alpha: 0.4), AppColors.textSecondary),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm, vertical: AppSpacing.xs),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(AppRadius.sm),
      ),
      child: Text(
        label,
        style: TextStyle(color: fg, fontWeight: FontWeight.w600, fontSize: 12),
      ),
    );
  }
}

enum BillingBadgeTone { success, warning, danger, neutral }

BillingBadgeTone subscriptionTone(String status) {
  switch (status.toUpperCase()) {
    case 'ACTIVE':
    case 'TRIAL':
      return BillingBadgeTone.success;
    case 'PAST_DUE':
    case 'EXPIRED':
      return BillingBadgeTone.warning;
    case 'DISABLED':
    case 'CANCELLED':
      return BillingBadgeTone.danger;
    default:
      return BillingBadgeTone.neutral;
  }
}

BillingBadgeTone paymentTone(String status) {
  switch (status.toUpperCase()) {
    case 'APPROVED':
      return BillingBadgeTone.success;
    case 'PENDING':
      return BillingBadgeTone.warning;
    case 'REJECTED':
      return BillingBadgeTone.danger;
    default:
      return BillingBadgeTone.neutral;
  }
}

BillingBadgeTone invoiceTone(String status) {
  switch (status.toUpperCase()) {
    case 'PAID':
      return BillingBadgeTone.success;
    case 'OPEN':
      return BillingBadgeTone.neutral;
    case 'OVERDUE':
      return BillingBadgeTone.warning;
    case 'VOID':
    case 'VOIDED':
      return BillingBadgeTone.danger;
    default:
      return BillingBadgeTone.neutral;
  }
}
