import 'package:flutter/material.dart';
import 'package:school_camera/app/theme.dart';

class AppCard extends StatelessWidget {
  const AppCard({
    super.key,
    required this.child,
    this.padding,
    this.onTap,
    this.margin,
  });

  final Widget child;
  final EdgeInsetsGeometry? padding;
  final VoidCallback? onTap;
  final EdgeInsetsGeometry? margin;

  @override
  Widget build(BuildContext context) {
    final card = Card(
      margin: margin ?? EdgeInsets.zero,
      child: Padding(
        padding: padding ?? const EdgeInsets.all(AppSpacing.lg),
        child: child,
      ),
    );

    if (onTap == null) return card;

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(AppRadius.lg),
      child: card,
    );
  }
}
