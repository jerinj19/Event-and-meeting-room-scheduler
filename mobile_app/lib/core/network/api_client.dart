import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../config/api_config.dart';
import 'api_exceptions.dart';

class ApiClient {
  static const String keyAccessToken = 'access_token';
  static const String keyRefreshToken = 'refresh_token';
  static const String keyUserData = 'user_data';

  final http.Client _client;

  ApiClient({http.Client? client}) : _client = client ?? http.Client();

  Future<String?> getAccessToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(keyAccessToken);
  }

  Future<String?> getRefreshToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(keyRefreshToken);
  }

  Future<void> saveTokens({required String access, String? refresh}) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(keyAccessToken, access);
    if (refresh != null && refresh.isNotEmpty) {
      await prefs.setString(keyRefreshToken, refresh);
    }
  }

  Future<void> clearAuthData() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(keyAccessToken);
    await prefs.remove(keyRefreshToken);
    await prefs.remove(keyUserData);
  }

  Future<Map<String, String>> _buildHeaders({bool requiresAuth = true}) async {
    final headers = <String, String>{
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Timezone': DateTime.now().timeZoneName,
    };

    if (requiresAuth) {
      final token = await getAccessToken();
      if (token != null && token.isNotEmpty) {
        headers['Authorization'] = 'Bearer $token';
      }
    }

    return headers;
  }

  Uri _resolveUri(String endpoint, [Map<String, dynamic>? queryParams]) {
    String base = ApiConfig.baseUrl;
    if (base.endsWith('/')) {
      base = base.substring(0, base.length - 1);
    }
    String cleanEndpoint = endpoint;
    if (!cleanEndpoint.startsWith('/')) {
      cleanEndpoint = '/$cleanEndpoint';
    }

    final fullUrl = '$base$cleanEndpoint';
    final uri = Uri.parse(fullUrl);

    if (queryParams != null && queryParams.isNotEmpty) {
      final cleanParams = <String, String>{};
      queryParams.forEach((key, val) {
        if (val != null && val.toString().isNotEmpty && val.toString() != 'all') {
          cleanParams[key] = val.toString();
        }
      });
      return uri.replace(queryParameters: cleanParams);
    }

    return uri;
  }

  Future<dynamic> get(
    String endpoint, {
    Map<String, dynamic>? queryParams,
    bool requiresAuth = true,
  }) async {
    return _sendWithRefresh(
      () async {
        final uri = _resolveUri(endpoint, queryParams);
        final headers = await _buildHeaders(requiresAuth: requiresAuth);
        return await _client.get(uri, headers: headers);
      },
      requiresAuth: requiresAuth,
    );
  }

  Future<dynamic> post(
    String endpoint, {
    dynamic body,
    bool requiresAuth = true,
  }) async {
    return _sendWithRefresh(
      () async {
        final uri = _resolveUri(endpoint);
        final headers = await _buildHeaders(requiresAuth: requiresAuth);
        final encodedBody = body != null ? jsonEncode(body) : null;
        return await _client.post(uri, headers: headers, body: encodedBody);
      },
      requiresAuth: requiresAuth,
    );
  }

  Future<dynamic> patch(
    String endpoint, {
    dynamic body,
    bool requiresAuth = true,
  }) async {
    return _sendWithRefresh(
      () async {
        final uri = _resolveUri(endpoint);
        final headers = await _buildHeaders(requiresAuth: requiresAuth);
        final encodedBody = body != null ? jsonEncode(body) : null;
        return await _client.patch(uri, headers: headers, body: encodedBody);
      },
      requiresAuth: requiresAuth,
    );
  }

  Future<dynamic> put(
    String endpoint, {
    dynamic body,
    bool requiresAuth = true,
  }) async {
    return _sendWithRefresh(
      () async {
        final uri = _resolveUri(endpoint);
        final headers = await _buildHeaders(requiresAuth: requiresAuth);
        final encodedBody = body != null ? jsonEncode(body) : null;
        return await _client.put(uri, headers: headers, body: encodedBody);
      },
      requiresAuth: requiresAuth,
    );
  }

  Future<dynamic> delete(
    String endpoint, {
    bool requiresAuth = true,
  }) async {
    return _sendWithRefresh(
      () async {
        final uri = _resolveUri(endpoint);
        final headers = await _buildHeaders(requiresAuth: requiresAuth);
        return await _client.delete(uri, headers: headers);
      },
      requiresAuth: requiresAuth,
    );
  }

  Future<dynamic> _sendWithRefresh(
    Future<http.Response> Function() requestSender, {
    required bool requiresAuth,
  }) async {
    http.Response response;
    try {
      response = await requestSender();
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException(
        statusCode: 0,
        message: 'Network connection error. Please ensure the server is reachable at ${ApiConfig.baseUrl}.',
      );
    }

    // Transparent JWT refresh on 401
    if (response.statusCode == 401 && requiresAuth) {
      final refreshed = await _attemptTokenRefresh();
      if (refreshed) {
        try {
          response = await requestSender();
        } catch (e) {
          if (e is ApiException) rethrow;
          throw ApiException(
            statusCode: 0,
            message: 'Network error after token refresh.',
          );
        }
      } else {
        await clearAuthData();
      }
    }

    return _processResponse(response);
  }

  Future<bool> _attemptTokenRefresh() async {
    final refreshToken = await getRefreshToken();
    if (refreshToken == null || refreshToken.isEmpty) return false;

    try {
      final uri = _resolveUri('/auth/token/refresh/');
      final res = await _client.post(
        uri,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'refresh': refreshToken}),
      );

      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        final newAccess = data['access']?.toString();
        if (newAccess != null && newAccess.isNotEmpty) {
          await saveTokens(access: newAccess);
          return true;
        }
      }
    } catch (_) {}
    return false;
  }

  dynamic _processResponse(http.Response response) {
    if (response.statusCode == 204) {
      return {'success': true};
    }

    dynamic bodyData;
    if (response.body.isNotEmpty) {
      try {
        bodyData = jsonDecode(response.body);
      } catch (_) {
        bodyData = response.body;
      }
    }

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return bodyData;
    }

    throw ApiException.fromResponse(response.statusCode, bodyData);
  }
}
