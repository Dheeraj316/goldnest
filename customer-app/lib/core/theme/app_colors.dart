import 'package:flutter/material.dart';

/// Goldnest brand palette — kept in sync by hand with the web apps'
/// tailwind.config.ts (public-website and admin-web). Same navy/gold system,
/// same reasoning: warm gold reads as premium and matches the product
/// (physical gold), deep navy reads as trustworthy/secure for a financial app.
class AppColors {
  AppColors._();

  static const cream50 = Color(0xFFFFFDF9);
  static const cream100 = Color(0xFFFBF6EC);
  static const cream200 = Color(0xFFF5ECD8);

  static const ink = Color(0xFF14110F);
  static const inkLight = Color(0xFF3A342C);

  static const navy950 = Color(0xFF0A0F1A);
  static const navy900 = Color(0xFF0F172A);
  static const navy800 = Color(0xFF1B2537);
  static const navy700 = Color(0xFF2A3650);

  static const gold50 = Color(0xFFFBF6EC);
  static const gold100 = Color(0xFFF5E9C9);
  static const gold200 = Color(0xFFEAD190);
  static const gold300 = Color(0xFFDFB95C);
  static const gold400 = Color(0xFFCFA23A);
  static const gold500 = Color(0xFFB8862A);
  static const gold600 = Color(0xFF96691F);
  static const gold700 = Color(0xFF744F18);

  static const emerald500 = Color(0xFF12805C);
  static const rose500 = Color(0xFFC23B4B);
}
