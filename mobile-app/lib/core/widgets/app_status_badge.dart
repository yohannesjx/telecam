import 'package:flutter/material.dart';
import 'package:school_camera/app/theme.dart';

enum AppStatusTone { success, warning, danger, info, neutral }

class AppStatusBadge extends StatelessWidget {
  const AppStatusBadge({
    super.key,
    required this.label,
    this.tone = AppStatusTone.neutral,
  });

  final String label;
  final AppStatusTone tone;

  @override
  Widget build(BuildContext context) {
    final (bg, fg) = _colorsForTone(tone);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(AppRadius.sm),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w600,
          color: fg,
        ),
      ),
    );
  }

  (Color, Color) _colorsForTone(AppStatusTone tone) {
    return switch (tone) {
      AppStatusTone.success => (const Color(0xFFD1FAE5), AppColors.success),
      AppStatusTone.warning => (const Color(0xFFFEF3C7), AppColors.warning),
      AppStatusTone.danger => (const Color(0xFFFEE2E2), AppColors.error),
      AppStatusTone.info => (AppColors.primaryLight, AppColors.primary),
      AppStatusTone.neutral => (const Color(0xFFF1F5F9), AppColors.textSecondary),
    };
  }
}
