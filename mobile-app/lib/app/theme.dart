import 'package:flutter/material.dart';

/// Spacing scale for consistent layout.
class AppSpacing {
  AppSpacing._();

  static const double xs = 4;
  static const double sm = 8;
  static const double md = 16;
  static const double lg = 24;
  static const double xl = 32;
  static const double xxl = 48;
}

/// Border radius tokens.
class AppRadius {
  AppRadius._();

  static const double sm = 12;
  static const double md = 16;
  static const double lg = 20;
  static const double xl = 24;
}

/// Animation durations.
class AppDurations {
  AppDurations._();

  static const Duration fast = Duration(milliseconds: 150);
  static const Duration normal = Duration(milliseconds: 300);
  static const Duration slow = Duration(milliseconds: 500);
}

class AppColors {
  AppColors._();

  static const Color background = Color(0xFFF1F5F9);
  static const Color surface = Color(0xFFFFFFFF);
  static const Color border = Color(0xFFE2E8F0);
  static const Color primary = Color(0xFF4F46E5);
  static const Color primaryLight = Color(0xFFEEF2FF);
  static const Color textPrimary = Color(0xFF0F172A);
  static const Color textSecondary = Color(0xFF64748B);
  static const Color success = Color(0xFF059669);
  static const Color warning = Color(0xFFD97706);
  static const Color error = Color(0xFFDC2626);
}

/// Parent-friendly light theme (default).
ThemeData buildAppTheme({bool isDark = false}) {
  if (isDark) {
    return _buildDarkTheme();
  }
  return _buildLightTheme();
}

ThemeData _buildLightTheme() {
  const primary = AppColors.primary;
  final colorScheme = ColorScheme.fromSeed(
    seedColor: primary,
    brightness: Brightness.light,
    surface: AppColors.surface,
    error: AppColors.error,
  );

  return ThemeData(
    useMaterial3: true,
    brightness: Brightness.light,
    scaffoldBackgroundColor: AppColors.background,
    colorScheme: colorScheme,
    textTheme: _textTheme(AppColors.textPrimary, AppColors.textSecondary),
    cardTheme: CardThemeData(
      color: AppColors.surface,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppRadius.lg),
        side: const BorderSide(color: AppColors.border),
      ),
      margin: EdgeInsets.zero,
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: AppColors.surface,
      contentPadding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.md,
        vertical: AppSpacing.md,
      ),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppRadius.md),
        borderSide: const BorderSide(color: AppColors.border),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppRadius.md),
        borderSide: const BorderSide(color: AppColors.border),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppRadius.md),
        borderSide: const BorderSide(color: primary, width: 2),
      ),
      hintStyle: const TextStyle(color: AppColors.textSecondary),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: primary,
        foregroundColor: Colors.white,
        elevation: 0,
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.lg,
          vertical: AppSpacing.md,
        ),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadius.md),
        ),
        textStyle: const TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.w600,
        ),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: primary,
        side: const BorderSide(color: AppColors.border),
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.lg,
          vertical: AppSpacing.md,
        ),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadius.md),
        ),
      ),
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: AppColors.background,
      foregroundColor: AppColors.textPrimary,
      elevation: 0,
      centerTitle: false,
    ),
  );
}

ThemeData _buildDarkTheme() {
  final colorScheme = ColorScheme.fromSeed(
    seedColor: AppColors.primary,
    brightness: Brightness.dark,
  );

  return ThemeData(
    useMaterial3: true,
    brightness: Brightness.dark,
    colorScheme: colorScheme,
    textTheme: _textTheme(Colors.white, Colors.white70),
  );
}

TextTheme _textTheme(Color primary, Color secondary) {
  return TextTheme(
    headlineLarge: TextStyle(
      fontSize: 28,
      fontWeight: FontWeight.w700,
      color: primary,
      letterSpacing: -0.5,
    ),
    headlineMedium: TextStyle(
      fontSize: 22,
      fontWeight: FontWeight.w600,
      color: primary,
    ),
    titleLarge: TextStyle(
      fontSize: 18,
      fontWeight: FontWeight.w600,
      color: primary,
    ),
    bodyLarge: TextStyle(fontSize: 16, color: primary, height: 1.5),
    bodyMedium: TextStyle(fontSize: 14, color: secondary, height: 1.5),
    labelLarge: TextStyle(
      fontSize: 14,
      fontWeight: FontWeight.w600,
      color: primary,
    ),
  );
}
