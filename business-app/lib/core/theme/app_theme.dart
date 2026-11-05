import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'app_colors.dart';

/// Single source of truth for the app's visual language. `displayTextTheme`
/// (Fraunces) is for headings only — body/UI text uses the default Manrope
/// text theme, matching the web apps' font pairing.
class AppTheme {
  AppTheme._();

  static ThemeData get light {
    final base = ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      scaffoldBackgroundColor: AppColors.cream100,
      colorScheme: ColorScheme.fromSeed(
        seedColor: AppColors.gold500,
        brightness: Brightness.light,
        primary: AppColors.gold500,
        onPrimary: Colors.white,
        secondary: AppColors.navy900,
        surface: Colors.white,
        error: AppColors.rose500,
      ),
    );

    final manrope = GoogleFonts.manropeTextTheme(base.textTheme).apply(
      bodyColor: AppColors.ink,
      displayColor: AppColors.ink,
    );

    return base.copyWith(
      textTheme: manrope,
      appBarTheme: AppBarTheme(
        backgroundColor: AppColors.cream100,
        foregroundColor: AppColors.ink,
        elevation: 0,
        scrolledUnderElevation: 1,
        titleTextStyle: GoogleFonts.fraunces(
          fontSize: 20,
          fontWeight: FontWeight.w600,
          color: AppColors.ink,
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.gold500,
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(vertical: 17, horizontal: 24),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
          textStyle: manrope.labelLarge?.copyWith(fontWeight: FontWeight.w600, letterSpacing: 0.1),
          elevation: 0,
          shadowColor: AppColors.gold500.withValues(alpha: 0.35),
        ).copyWith(
          elevation: WidgetStateProperty.resolveWith((states) => states.contains(WidgetState.pressed) ? 1 : 6),
          overlayColor: WidgetStateProperty.all(Colors.white.withValues(alpha: 0.08)),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: AppColors.navy900,
          side: const BorderSide(color: AppColors.gold300, width: 1.4),
          padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 24),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: Colors.white,
        contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
        labelStyle: manrope.bodyMedium?.copyWith(color: AppColors.inkLight.withValues(alpha: 0.7)),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: AppColors.gold100, width: 1.3),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: AppColors.gold100, width: 1.3),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: AppColors.gold400, width: 2),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: AppColors.rose500, width: 1.3),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: AppColors.rose500, width: 2),
        ),
      ),
      cardTheme: CardThemeData(
        color: Colors.white,
        elevation: 3,
        shadowColor: AppColors.navy950.withValues(alpha: 0.12),
        surfaceTintColor: Colors.transparent,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(22),
          side: BorderSide(color: AppColors.gold100.withValues(alpha: 0.8)),
        ),
      ),
      splashFactory: InkSparkle.splashFactory,
    );
  }

  /// Soft, colored elevation for hand-built containers (list tiles, summary
  /// panels) that don't go through CardTheme — mirrors the web's shadow-soft
  /// token so both surfaces read as the same design language.
  static List<BoxShadow> get softShadow => [
        BoxShadow(color: AppColors.ink.withValues(alpha: 0.05), blurRadius: 8, offset: const Offset(0, 2), spreadRadius: -2),
        BoxShadow(color: AppColors.ink.withValues(alpha: 0.08), blurRadius: 24, offset: const Offset(0, 8), spreadRadius: -12),
      ];

  /// Display/heading style — use for screen titles, hero numbers, etc.
  static TextStyle display({double size = 24, FontWeight weight = FontWeight.w600, Color color = AppColors.ink}) {
    return GoogleFonts.fraunces(fontSize: size, fontWeight: weight, color: color);
  }
}
