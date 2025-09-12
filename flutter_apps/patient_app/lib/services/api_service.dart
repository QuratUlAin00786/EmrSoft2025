import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class ApiService {
  static const String _defaultBaseUrl = 'https://your-cura-backend.replit.app';
  static String _baseUrl = _defaultBaseUrl;
  static const _storage = FlutterSecureStorage();

  static void setBaseUrl(String url) {
    _baseUrl = url.endsWith('/') ? url.substring(0, url.length - 1) : url;
  }

  static String get baseUrl => _baseUrl;

  static Future<String?> getAuthToken() async {
    return await _storage.read(key: 'auth_token');
  }

  static Future<void> setAuthToken(String token) async {
    await _storage.write(key: 'auth_token', value: token);
  }

  static Future<void> clearAuthToken() async {
    await _storage.delete(key: 'auth_token');
  }

  static Map<String, String> get _headers => {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  static Future<Map<String, String>> get _authHeaders async {
    final token = await getAuthToken();
    return {
      ..._headers,
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  static Future<http.Response> _makeRequest(
    String method,
    String endpoint, {
    Map<String, dynamic>? body,
    bool requiresAuth = true,
  }) async {
    final url = Uri.parse('$_baseUrl$endpoint');
    final headers = requiresAuth ? await _authHeaders : _headers;

    http.Response response;
    
    switch (method.toUpperCase()) {
      case 'GET':
        response = await http.get(url, headers: headers);
        break;
      case 'POST':
        response = await http.post(
          url,
          headers: headers,
          body: body != null ? jsonEncode(body) : null,
        );
        break;
      case 'PUT':
        response = await http.put(
          url,
          headers: headers,
          body: body != null ? jsonEncode(body) : null,
        );
        break;
      case 'PATCH':
        response = await http.patch(
          url,
          headers: headers,
          body: body != null ? jsonEncode(body) : null,
        );
        break;
      case 'DELETE':
        response = await http.delete(url, headers: headers);
        break;
      default:
        throw ArgumentError('Unsupported HTTP method: $method');
    }

    if (response.statusCode == 401) {
      await clearAuthToken();
      throw ApiException('Authentication failed', 401);
    }

    return response;
  }

  static Future<Map<String, dynamic>> get(String endpoint, {bool requiresAuth = true}) async {
    try {
      final response = await _makeRequest('GET', endpoint, requiresAuth: requiresAuth);
      
      if (response.statusCode >= 200 && response.statusCode < 300) {
        return jsonDecode(response.body);
      } else {
        throw ApiException(_getErrorMessage(response), response.statusCode);
      }
    } on SocketException {
      throw ApiException('No internet connection', 0);
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('Network error: $e', 0);
    }
  }

  static Future<Map<String, dynamic>> post(String endpoint, Map<String, dynamic> body, {bool requiresAuth = true}) async {
    try {
      final response = await _makeRequest('POST', endpoint, body: body, requiresAuth: requiresAuth);
      
      if (response.statusCode >= 200 && response.statusCode < 300) {
        return jsonDecode(response.body);
      } else {
        throw ApiException(_getErrorMessage(response), response.statusCode);
      }
    } on SocketException {
      throw ApiException('No internet connection', 0);
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('Network error: $e', 0);
    }
  }

  static Future<Map<String, dynamic>> put(String endpoint, Map<String, dynamic> body, {bool requiresAuth = true}) async {
    try {
      final response = await _makeRequest('PUT', endpoint, body: body, requiresAuth: requiresAuth);
      
      if (response.statusCode >= 200 && response.statusCode < 300) {
        return jsonDecode(response.body);
      } else {
        throw ApiException(_getErrorMessage(response), response.statusCode);
      }
    } on SocketException {
      throw ApiException('No internet connection', 0);
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('Network error: $e', 0);
    }
  }

  static Future<Map<String, dynamic>> patch(String endpoint, Map<String, dynamic> body, {bool requiresAuth = true}) async {
    try {
      final response = await _makeRequest('PATCH', endpoint, body: body, requiresAuth: requiresAuth);
      
      if (response.statusCode >= 200 && response.statusCode < 300) {
        return jsonDecode(response.body);
      } else {
        throw ApiException(_getErrorMessage(response), response.statusCode);
      }
    } on SocketException {
      throw ApiException('No internet connection', 0);
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('Network error: $e', 0);
    }
  }

  static Future<void> delete(String endpoint, {bool requiresAuth = true}) async {
    try {
      final response = await _makeRequest('DELETE', endpoint, requiresAuth: requiresAuth);
      
      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw ApiException(_getErrorMessage(response), response.statusCode);
      }
    } on SocketException {
      throw ApiException('No internet connection', 0);
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('Network error: $e', 0);
    }
  }

  static String _getErrorMessage(http.Response response) {
    try {
      final body = jsonDecode(response.body);
      return body['message'] ?? body['error'] ?? 'Unknown error occurred';
    } catch (e) {
      return 'Server error (${response.statusCode})';
    }
  }

  // Authentication endpoints
  static Future<Map<String, dynamic>> login(String email, String password) async {
    return await post('/api/auth/login', {
      'email': email,
      'password': password,
    }, requiresAuth: false);
  }

  static Future<Map<String, dynamic>> validateToken() async {
    return await get('/api/auth/validate');
  }

  static Future<void> logout() async {
    try {
      await post('/api/auth/logout', {});
    } catch (e) {
      // Ignore logout errors
    } finally {
      await clearAuthToken();
    }
  }

  // Patient endpoints
  static Future<List<dynamic>> getPatients() async {
    final response = await get('/api/patients');
    return response is List ? response : [response];
  }

  static Future<Map<String, dynamic>> getPatient(int id) async {
    return await get('/api/patients/$id');
  }

  static Future<Map<String, dynamic>> updatePatient(int id, Map<String, dynamic> data) async {
    return await put('/api/patients/$id', data);
  }

  // Appointments endpoints
  static Future<List<dynamic>> getAppointments() async {
    final response = await get('/api/appointments');
    return response is List ? response : [response];
  }

  static Future<Map<String, dynamic>> createAppointment(Map<String, dynamic> data) async {
    return await post('/api/appointments', data);
  }

  static Future<Map<String, dynamic>> updateAppointment(int id, Map<String, dynamic> data) async {
    return await put('/api/appointments/$id', data);
  }

  static Future<void> deleteAppointment(int id) async {
    await delete('/api/appointments/$id');
  }

  // Medical Records endpoints
  static Future<List<dynamic>> getMedicalRecords(int patientId) async {
    final response = await get('/api/medical-records?patientId=$patientId');
    return response is List ? response : [response];
  }

  static Future<Map<String, dynamic>> createMedicalRecord(Map<String, dynamic> data) async {
    return await post('/api/medical-records', data);
  }

  // Lab Results endpoints
  static Future<List<dynamic>> getLabResults([int? patientId]) async {
    final endpoint = patientId != null ? '/api/lab-results?patientId=$patientId' : '/api/lab-results';
    final response = await get(endpoint);
    return response is List ? response : [response];
  }

  static Future<Map<String, dynamic>> createLabResult(Map<String, dynamic> data) async {
    return await post('/api/lab-results', data);
  }

  // Prescriptions endpoints
  static Future<List<dynamic>> getPrescriptions([int? patientId]) async {
    final endpoint = patientId != null ? '/api/prescriptions?patientId=$patientId' : '/api/prescriptions';
    final response = await get(endpoint);
    return response is List ? response : [response];
  }

  static Future<Map<String, dynamic>> createPrescription(Map<String, dynamic> data) async {
    return await post('/api/prescriptions', data);
  }

  // Notifications endpoints
  static Future<List<dynamic>> getNotifications() async {
    final response = await get('/api/notifications');
    return response is List ? response : [response];
  }

  static Future<void> markNotificationAsRead(int id) async {
    await patch('/api/notifications/$id', {'isRead': true});
  }

  // Medical staff endpoints
  static Future<Map<String, dynamic>> getMedicalStaff() async {
    return await get('/api/medical-staff');
  }

  // Users endpoints
  static Future<List<dynamic>> getUsers() async {
    final response = await get('/api/users');
    return response is List ? response : [response];
  }

  static Future<Map<String, dynamic>> getUserProfile() async {
    return await get('/api/users/profile');
  }

  static Future<Map<String, dynamic>> updateUserProfile(Map<String, dynamic> data) async {
    return await put('/api/users/profile', data);
  }
}

class ApiException implements Exception {
  final String message;
  final int statusCode;

  ApiException(this.message, this.statusCode);

  @override
  String toString() => 'ApiException: $message (Status: $statusCode)';
}