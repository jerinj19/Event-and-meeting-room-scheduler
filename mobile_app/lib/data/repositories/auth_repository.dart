import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../../core/network/api_client.dart';
import '../models/user_model.dart';

class AuthRepository {
  final ApiClient _client;

  AuthRepository({ApiClient? client}) : _client = client ?? ApiClient();

  Future<UserModel> login({
    required String email,
    required String password,
  }) async {
    final response = await _client.post(
      '/auth/token/',
      body: {
        'email': email.trim(),
        'password': password,
      },
      requiresAuth: false,
    );

    if (response is Map<String, dynamic>) {
      final access = response['access']?.toString() ?? '';
      final refresh = response['refresh']?.toString() ?? '';

      await _client.saveTokens(access: access, refresh: refresh);

      UserModel user;
      if (response['user'] is Map<String, dynamic>) {
        user = UserModel.fromJson(response['user']);
      } else {
        user = await getCurrentUser();
      }

      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(ApiClient.keyUserData, jsonEncode(user.toJson()));

      return user;
    }

    throw Exception('Unexpected response format during login.');
  }

  Future<UserModel> register({
    required String email,
    required String password,
    required String confirmPassword,
    required String firstName,
    required String lastName,
    String? department,
  }) async {
    final response = await _client.post(
      '/auth/register/',
      body: {
        'email': email.trim(),
        'password': password,
        'confirm_password': confirmPassword,
        'first_name': firstName.trim(),
        'last_name': lastName.trim(),
        if (department != null && department.trim().isNotEmpty)
          'department': department.trim(),
      },
      requiresAuth: false,
    );

    if (response is Map<String, dynamic>) {
      // Automatically log user in after successful registration
      return await login(email: email, password: password);
    }

    throw Exception('Registration succeeded, but unexpected response format.');
  }

  Future<UserModel> getCurrentUser() async {
    final response = await _client.get('/auth/me/');
    if (response is Map<String, dynamic>) {
      final user = UserModel.fromJson(response);
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(ApiClient.keyUserData, jsonEncode(user.toJson()));
      return user;
    }
    throw Exception('Unable to load user profile.');
  }

  Future<UserModel?> getCachedUser() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(ApiClient.keyUserData);
    if (raw != null && raw.isNotEmpty) {
      try {
        final decoded = jsonDecode(raw);
        return UserModel.fromJson(decoded);
      } catch (_) {}
    }
    return null;
  }

  Future<bool> hasValidToken() async {
    final token = await _client.getAccessToken();
    return token != null && token.isNotEmpty;
  }

  Future<void> logout() async {
    final refresh = await _client.getRefreshToken();
    if (refresh != null && refresh.isNotEmpty) {
      try {
        await _client.post(
          '/auth/logout/',
          body: {'refresh': refresh},
          requiresAuth: false,
        );
      } catch (_) {}
    }
    await _client.clearAuthData();
  }
}
