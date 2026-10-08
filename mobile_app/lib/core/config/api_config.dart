import 'dart:io' show Platform;
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:shared_preferences/shared_preferences.dart';

class ApiConfig {
  static const String _prefKeyBaseUrl = 'custom_api_base_url';

  static String _defaultBaseUrl() {
    if (kIsWeb) {
      return 'http://localhost:8000/api';
    }
    try {
      if (Platform.isAndroid) {
        // Android emulator maps 10.0.2.2 to host machine's localhost
        return 'http://10.0.2.2:8000/api';
      }
    } catch (_) {}
    return 'http://localhost:8000/api';
  }

  static String _currentBaseUrl = _defaultBaseUrl();

  static String get baseUrl => _currentBaseUrl;

  static String get hostUrl {
    final uri = Uri.parse(_currentBaseUrl);
    final portPart = (uri.hasPort && uri.port != 80 && uri.port != 443) ? ':${uri.port}' : '';
    return '${uri.scheme}://${uri.host}$portPart';
  }

  static const String fallbackRoomImageUrl =
      'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80';

  static Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();
    final saved = prefs.getString(_prefKeyBaseUrl);
    if (saved != null && saved.trim().isNotEmpty) {
      _currentBaseUrl = saved.trim();
    } else {
      _currentBaseUrl = _defaultBaseUrl();
    }
  }

  static Future<void> setBaseUrl(String newUrl) async {
    final trimmed = newUrl.trim();
    _currentBaseUrl = trimmed.endsWith('/')
        ? trimmed.substring(0, trimmed.length - 1)
        : trimmed;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_prefKeyBaseUrl, _currentBaseUrl);
  }

  static Future<void> resetToDefault() async {
    _currentBaseUrl = _defaultBaseUrl();
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_prefKeyBaseUrl);
  }

  /// Formats backend media paths and handles device host differences (10.0.2.2 vs localhost vs 127.0.0.1)
  static String formatImageUrl(String? path) {
    if (path == null || path.trim().isEmpty) return fallbackRoomImageUrl;
    final trimmed = path.trim();

    // 1. If it contains a /media/ path (standard Django MEDIA_URL)
    final mediaIdx = trimmed.indexOf('/media/');
    if (mediaIdx != -1) {
      final relativeMedia = trimmed.substring(mediaIdx);
      return '$hostUrl$relativeMedia';
    }

    // 2. If it's a relative path (e.g. 'room_images/1.jpg' or '/room_images/1.jpg')
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      final clean = trimmed.startsWith('/') ? trimmed : '/$trimmed';
      return '$hostUrl/media$clean';
    }

    // 3. If it's an absolute URL pointing to localhost / 127.0.0.1 / 10.0.2.2
    final isLocalBackend = trimmed.contains('localhost') ||
        trimmed.contains('127.0.0.1') ||
        trimmed.contains('10.0.2.2');
    if (isLocalBackend) {
      final uri = Uri.tryParse(trimmed);
      if (uri != null) {
        final pathAndQuery = uri.hasQuery ? '${uri.path}?${uri.query}' : uri.path;
        return '$hostUrl$pathAndQuery';
      }
    }

    // 4. External URL (e.g., Unsplash CDN, S3, etc.)
    return trimmed;
  }
}
