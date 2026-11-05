import 'dart:io' show Platform;
import 'package:flutter/foundation.dart' show kIsWeb;

/// Points at the local backend by default. Override at build time with
/// `--dart-define=API_BASE_URL=https://api.goldnest.in/api/v1` for
/// staging/production builds — never hard-code a production URL here.
class ApiConfig {
  ApiConfig._();

  static const _override = String.fromEnvironment('API_BASE_URL');

  static String get baseUrl {
    if (_override.isNotEmpty) return _override;
    if (kIsWeb) return 'http://localhost:3000/api/v1';
    // The Android emulator can't reach the host machine via `localhost` —
    // 10.0.2.2 is the emulator's alias for the host loopback interface.
    if (!kIsWeb && Platform.isAndroid) return 'http://10.0.2.2:3000/api/v1';
    return 'http://localhost:3000/api/v1';
  }

  static const connectTimeoutMs = 15000;
  static const receiveTimeoutMs = 15000;
}
