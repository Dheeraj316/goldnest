import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Tokens live only in the platform keystore/keychain (Android Keystore,
/// iOS Keychain) via flutter_secure_storage — never in SharedPreferences or
/// plain files, since those are readable by anything with filesystem access
/// on a rooted/jailbroken device (spec #58).
class SecureSessionStorage {
  SecureSessionStorage({FlutterSecureStorage? storage}) : _storage = storage ?? const FlutterSecureStorage();

  final FlutterSecureStorage _storage;

  static const _accessTokenKey = 'goldnest_access_token';
  static const _refreshTokenKey = 'goldnest_refresh_token';
  static const _deviceIdKey = 'goldnest_device_id';

  Future<void> saveTokens({required String accessToken, required String refreshToken}) async {
    await _storage.write(key: _accessTokenKey, value: accessToken);
    await _storage.write(key: _refreshTokenKey, value: refreshToken);
  }

  Future<String?> get accessToken => _storage.read(key: _accessTokenKey);
  Future<String?> get refreshToken => _storage.read(key: _refreshTokenKey);

  Future<void> clearTokens() async {
    await _storage.delete(key: _accessTokenKey);
    await _storage.delete(key: _refreshTokenKey);
  }

  /// A stable per-install identifier used for device binding (spec #14, #58)
  /// — generated once and persisted, not derived from hardware identifiers
  /// that raise their own privacy concerns.
  Future<String> getOrCreateDeviceId() async {
    final existing = await _storage.read(key: _deviceIdKey);
    if (existing != null) return existing;
    final generated = DateTime.now().microsecondsSinceEpoch.toRadixString(36) + _randomSuffix();
    await _storage.write(key: _deviceIdKey, value: generated);
    return generated;
  }

  String _randomSuffix() {
    final now = DateTime.now();
    return (now.microsecond * now.millisecond + now.second).toRadixString(36);
  }
}
