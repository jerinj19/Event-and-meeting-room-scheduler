import 'package:flutter/material.dart';

/// Google Stitch "Modern Enterprise Workspace" Design System Tokens & Theme
class AppTheme {
  // Brand Color Palette (Google Stitch Royal Blue & Precision Slate)
  static const Color primary = Color(0xFF0051D5); // Google Stitch Royal Blue
  static const Color primaryDark = Color(0xFF003EA7); // Deep Royal Blue
  static const Color primaryLight = Color(0xFFEFF6FF); // Blue 50
  static const Color primaryContainer = Color(0xFFDBEAFE); // Blue 100

  static const Color accent = Color(0xFF0284C7); // Precision Cyan / Sky 600
  static const Color accentLight = Color(0xFFE0F2FE); // Sky 100

  // Canvas & Surface Tonal Architecture
  static const Color background = Color(0xFFF8FAFC); // Slate 50 Canvas
  static const Color surface = Colors.white; // Surface Level 1
  static const Color surfaceElevated = Color(0xFFFFFFFF);
  static const Color surfaceContainer = Color(0xFFF1F5F9); // Slate 100
  static const Color surfaceContainerHigh = Color(0xFFE2E8F0); // Slate 200

  static const Color border = Color(0xFFE2E8F0); // Slate 200 hairline stroke
  static const Color borderSubtle = Color(0xFFF1F5F9); // Slate 100
  static const Color borderFocused = Color(0xFF0051D5); // Active Border

  // Typography Palette
  static const Color textPrimary = Color(0xFF0F172A); // Slate 900
  static const Color textSecondary = Color(0xFF475569); // Slate 600
  static const Color textMuted = Color(0xFF94A3B8); // Slate 400
  static const Color textOnDark = Color(0xFFF8FAFC);

  // Status & Telemetry Palette
  static const Color success = Color(0xFF10B981); // Emerald 500 (Available)
  static const Color successLight = Color(0xFFECFDF5); // Emerald 50
  static const Color successBorder = Color(0xFFA7F3D0); // Emerald 200

  static const Color warning = Color(0xFFF59E0B); // Amber 500
  static const Color warningLight = Color(0xFFFFFBEB); // Amber 50

  static const Color error = Color(0xFFEF4444); // Coral Red 500 (Conflict)
  static const Color errorLight = Color(0xFFFEF2F2); // Rose 50
  static const Color conflictContainer = Color(0xFF450A0A); // Dark Conflict Banner
  static const Color conflictText = Color(0xFFFFDAD6);

  static const Color occupied = Color(0xFF64748B); // Slate 500

  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      colorScheme: ColorScheme.fromSeed(
        seedColor: primary,
        primary: primary,
        secondary: success,
        surface: surface,
        error: error,
      ),
      scaffoldBackgroundColor: background,
      fontFamily: 'Inter',
      appBarTheme: const AppBarTheme(
        backgroundColor: surface,
        foregroundColor: textPrimary,
        elevation: 0,
        centerTitle: false,
        scrolledUnderElevation: 0.5,
        titleTextStyle: TextStyle(
          fontFamily: 'Inter',
          color: textPrimary,
          fontSize: 18,
          fontWeight: FontWeight.w700,
          letterSpacing: -0.3,
        ),
      ),
      cardTheme: CardThemeData(
        color: surface,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(14),
          side: const BorderSide(color: border, width: 1),
        ),
        margin: EdgeInsets.zero,
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: surface,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: border, width: 1),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: border, width: 1),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: primary, width: 1.8),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: error, width: 1.2),
        ),
        labelStyle: const TextStyle(color: textSecondary, fontSize: 14, fontFamily: 'Inter'),
        hintStyle: const TextStyle(color: textMuted, fontSize: 14, fontFamily: 'Inter'),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primary,
          foregroundColor: Colors.white,
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 13),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(10),
          ),
          textStyle: const TextStyle(
            fontFamily: 'Inter',
            fontSize: 14,
            fontWeight: FontWeight.w600,
            letterSpacing: -0.2,
          ),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: primary,
          side: const BorderSide(color: border, width: 1.2),
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(10),
          ),
          textStyle: const TextStyle(
            fontFamily: 'Inter',
            fontSize: 13,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: primary,
          textStyle: const TextStyle(
            fontFamily: 'Inter',
            fontSize: 13,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
      dividerTheme: const DividerThemeData(
        color: border,
        thickness: 1,
        space: 24,
      ),
    );
  }
}
