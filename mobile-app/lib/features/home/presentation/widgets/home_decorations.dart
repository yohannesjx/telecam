import 'package:flutter/material.dart';
import 'package:school_camera/app/theme.dart';

/// Design tokens for the parent home experience.
class HomeDecorations {
  HomeDecorations._();

  static const Color pageBackground = Color(0xFFF1F5F9);
  static const Color cardSurface = Colors.white;
  static const Color divider = Color(0xFFE2E8F0);
  static const Color liveGreen = Color(0xFF10B981);

  static const double cardRadius = 16;
  static const double previewRadius = 12;

  static BoxDecoration surfaceCard({Color? color}) => BoxDecoration(
        color: color ?? cardSurface,
        borderRadius: BorderRadius.circular(cardRadius),
        border: Border.all(color: divider),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF0F172A).withValues(alpha: 0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      );

  static BoxDecoration subscriptionCard = BoxDecoration(
    borderRadius: BorderRadius.circular(cardRadius),
    gradient: LinearGradient(
      colors: [
        AppColors.primary,
        AppColors.primary.withValues(alpha: 0.85),
      ],
      begin: Alignment.topLeft,
      end: Alignment.bottomRight,
    ),
    boxShadow: [
      BoxShadow(
        color: AppColors.primary.withValues(alpha: 0.25),
        blurRadius: 12,
        offset: const Offset(0, 4),
      ),
    ],
  );

  static TextStyle pageTitle(BuildContext context) =>
      Theme.of(context).textTheme.headlineSmall!.copyWith(
            fontWeight: FontWeight.w700,
            color: AppColors.textPrimary,
            letterSpacing: -0.3,
          );

  static TextStyle sectionTitle(BuildContext context) =>
      Theme.of(context).textTheme.titleMedium!.copyWith(
            fontWeight: FontWeight.w600,
            color: AppColors.textPrimary,
          );

  static TextStyle subtitle(BuildContext context) =>
      Theme.of(context).textTheme.bodyMedium!.copyWith(
            color: AppColors.textSecondary,
            height: 1.45,
          );
}

/// Compact status pill (no animation).
class HomeStatusChip extends StatelessWidget {
  const HomeStatusChip({
    super.key,
    required this.label,
    this.active = true,
  });

  final String label;
  final bool active;

  @override
  Widget build(BuildContext context) {
    final color = active ? HomeDecorations.liveGreen : AppColors.textSecondary;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (active) ...[
            Container(
              width: 6,
              height: 6,
              decoration: BoxDecoration(
                color: color,
                shape: BoxShape.circle,
              ),
            ),
            const SizedBox(width: 6),
          ],
          Text(
            label.toUpperCase(),
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: color,
              letterSpacing: 0.3,
            ),
          ),
        ],
      ),
    );
  }
}
