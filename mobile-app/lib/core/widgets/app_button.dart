import 'package:flutter/material.dart';
import 'package:school_camera/app/theme.dart';

enum AppButtonVariant { primary, secondary, danger }

class AppButton extends StatelessWidget {
  const AppButton({
    super.key,
    required this.label,
    this.onPressed,
    this.variant = AppButtonVariant.primary,
    this.loading = false,
    this.fullWidth = true,
    this.icon,
  });

  final String label;
  final VoidCallback? onPressed;
  final AppButtonVariant variant;
  final bool loading;
  final bool fullWidth;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    final disabled = onPressed == null || loading;
    final child = loading
        ? const SizedBox(
            height: 22,
            width: 22,
            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
          )
        : Row(
            mainAxisSize: MainAxisSize.min,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (icon != null) ...[
                Icon(icon, size: 20),
                const SizedBox(width: AppSpacing.sm),
              ],
              Text(label),
            ],
          );

    final button = switch (variant) {
      AppButtonVariant.primary => ElevatedButton(
          onPressed: disabled ? null : onPressed,
          child: child,
        ),
      AppButtonVariant.secondary => OutlinedButton(
          onPressed: disabled ? null : onPressed,
          child: child,
        ),
      AppButtonVariant.danger => ElevatedButton(
          onPressed: disabled ? null : onPressed,
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.error,
            foregroundColor: Colors.white,
          ),
          child: child,
        ),
    };

    if (fullWidth) {
      return SizedBox(width: double.infinity, child: button);
    }
    return button;
  }
}
