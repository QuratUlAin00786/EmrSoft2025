import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'auth_service.dart';

class ApiService {
  // Production URL - change this to your deployed Replit app URL
  static const String baseUrl = 'https://cac4d192-233a-437c-a07f-06383a374679-00-zga42ouzvz8z.riker.replit.dev';
  static const String apiVersion = 'api';
  
  static String get apiUrl => '$baseUrl/$apiVersion';
  
  static Future<Map<String, String>> _getHeaders() async {
    final token = await AuthService.getToken();
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': 'Bearer $token',
      'X-Tenant-Subdomain': 'demo',
    };
  }
  
  // Generic API request method
  static Future<http.Response> _makeRequest(
    String method,
    String endpoint, {
    Map<String, dynamic>? body,
    Map<String, String>? queryParams,
  }) async {
    final headers = await _getHeaders();
    final uri = Uri.parse('$apiUrl$endpoint');
    final finalUri = queryParams != null 
        ? uri.replace(queryParameters: queryParams)
        : uri;
    
    http.Response response;
    
    switch (method.toUpperCase()) {
      case 'GET':
        response = await http.get(finalUri, headers: headers);
        break;
      case 'POST':
        response = await http.post(
          finalUri,
          headers: headers,
          body: body != null ? jsonEncode(body) : null,
        );
        break;
      case 'PUT':
        response = await http.put(
          finalUri,
          headers: headers,
          body: body != null ? jsonEncode(body) : null,
        );
        break;
      case 'DELETE':
        response = await http.delete(finalUri, headers: headers);
        break;
      default:
        throw Exception('Unsupported HTTP method: $method');
    }
    
    if (response.statusCode == 401) {
      await AuthService.logout();
      throw Exception('Authentication failed');
    }
    
    return response;
  }
  
  // Patient Dashboard
  static Future<Map<String, dynamic>> getPatientDashboard() async {
    final response = await _makeRequest('GET', '/mobile/patient/dashboard');
    
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed to load dashboard data');
    }
  }
  
  // Appointment Management
  static Future<List<Map<String, dynamic>>> getPatientAppointments({String? date}) async {
    final queryParams = date != null ? {'date': date} : null;
    final response = await _makeRequest(
      'GET', 
      '/mobile/patient/appointments',
      queryParams: queryParams,
    );
    
    if (response.statusCode == 200) {
      final List<dynamic> data = jsonDecode(response.body);
      return data.cast<Map<String, dynamic>>();
    } else {
      throw Exception('Failed to load appointments');
    }
  }
  
  static Future<Map<String, dynamic>> bookAppointment(Map<String, dynamic> appointmentData) async {
    final response = await _makeRequest(
      'POST', 
      '/mobile/patient/appointments',
      body: appointmentData,
    );
    
    if (response.statusCode == 201) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed to book appointment');
    }
  }
  
  static Future<Map<String, dynamic>> cancelAppointment(int appointmentId) async {
    final response = await _makeRequest(
      'DELETE', 
      '/mobile/patient/appointments/$appointmentId',
    );
    
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed to cancel appointment');
    }
  }
  
  // Medical Records
  static Future<List<Map<String, dynamic>>> getPatientMedicalRecords() async {
    final response = await _makeRequest('GET', '/mobile/patient/medical-records');
    
    if (response.statusCode == 200) {
      final List<dynamic> data = jsonDecode(response.body);
      return data.cast<Map<String, dynamic>>();
    } else {
      throw Exception('Failed to load medical records');
    }
  }
  
  static Future<Map<String, dynamic>> getMedicalRecord(int recordId) async {
    final response = await _makeRequest('GET', '/medical-records/$recordId');
    
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed to load medical record');
    }
  }
  
  // Prescriptions
  static Future<List<Map<String, dynamic>>> getPatientPrescriptions() async {
    final response = await _makeRequest('GET', '/mobile/patient/prescriptions');
    
    if (response.statusCode == 200) {
      final List<dynamic> data = jsonDecode(response.body);
      return data.cast<Map<String, dynamic>>();
    } else {
      throw Exception('Failed to load prescriptions');
    }
  }
  
  // Available Doctors
  static Future<List<Map<String, dynamic>>> getAvailableDoctors() async {
    final response = await _makeRequest('GET', '/mobile/patient/doctors');
    
    if (response.statusCode == 200) {
      final List<dynamic> data = jsonDecode(response.body);
      return data.cast<Map<String, dynamic>>();
    } else {
      throw Exception('Failed to load doctors');
    }
  }
  
  // Get specific doctor details
  static Future<Map<String, dynamic>> getDoctor(int doctorId) async {
    final response = await _makeRequest('GET', '/mobile/patient/doctors/$doctorId');
    
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed to load doctor details');
    }
  }
  
  // Available Time Slots
  static Future<List<Map<String, dynamic>>> getAvailableTimeSlots(int doctorId, String date) async {
    final queryParams = {'doctorId': doctorId.toString(), 'date': date};
    final response = await _makeRequest(
      'GET', 
      '/mobile/patient/available-slots',
      queryParams: queryParams,
    );
    
    if (response.statusCode == 200) {
      final List<dynamic> data = jsonDecode(response.body);
      return data.cast<Map<String, dynamic>>();
    } else {
      throw Exception('Failed to load available time slots');
    }
  }
  
  // Video Consultation
  static Future<Map<String, dynamic>> joinVideoConsultation(int appointmentId) async {
    final response = await _makeRequest(
      'POST', 
      '/mobile/video/join-consultation',
      body: {'appointmentId': appointmentId},
    );
    
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed to join video consultation');
    }
  }
  
  // Authentication
  static Future<Map<String, dynamic>> login(String email, String password) async {
    final response = await http.post(
      Uri.parse('$apiUrl/auth/login'),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Tenant-Subdomain': 'demo',
      },
      body: jsonEncode({
        'email': email,
        'password': password,
      }),
    );
    
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Login failed');
    }
  }
  
  static Future<Map<String, dynamic>> validateToken() async {
    final response = await _makeRequest('GET', '/auth/validate');
    
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Token validation failed');
    }
  }
  
  // Notifications
  static Future<List<Map<String, dynamic>>> getNotifications() async {
    final response = await _makeRequest('GET', '/notifications');
    
    if (response.statusCode == 200) {
      final List<dynamic> data = jsonDecode(response.body);
      return data.cast<Map<String, dynamic>>();
    } else {
      throw Exception('Failed to load notifications');
    }
  }
  
  static Future<Map<String, dynamic>> markNotificationAsRead(int notificationId) async {
    final response = await _makeRequest(
      'PUT', 
      '/notifications/$notificationId/read',
    );
    
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed to mark notification as read');
    }
  }
  
  // Patient Profile
  static Future<Map<String, dynamic>> getPatientProfile() async {
    final response = await _makeRequest('GET', '/mobile/patient/profile');
    
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed to load patient profile');
    }
  }
  
  static Future<Map<String, dynamic>> updatePatientProfile(Map<String, dynamic> profileData) async {
    final response = await _makeRequest(
      'PUT', 
      '/mobile/patient/profile',
      body: profileData,
    );
    
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed to update patient profile');
    }
  }
  
  // Lab Results
  static Future<List<Map<String, dynamic>>> getLabResults() async {
    final response = await _makeRequest('GET', '/mobile/patient/lab-results');
    
    if (response.statusCode == 200) {
      final List<dynamic> data = jsonDecode(response.body);
      return data.cast<Map<String, dynamic>>();
    } else {
      throw Exception('Failed to load lab results');
    }
  }
}