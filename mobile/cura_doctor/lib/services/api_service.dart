import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'auth_service.dart';

class ApiService {
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
  
  // Doctor Dashboard
  static Future<Map<String, dynamic>> getDoctorDashboard() async {
    final response = await _makeRequest('GET', '/mobile/doctor/dashboard');
    
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed to load dashboard data');
    }
  }
  
  // Patient Management
  static Future<List<Map<String, dynamic>>> getPatients() async {
    final response = await _makeRequest('GET', '/mobile/doctor/patients');
    
    if (response.statusCode == 200) {
      final List<dynamic> data = jsonDecode(response.body);
      return data.cast<Map<String, dynamic>>();
    } else {
      throw Exception('Failed to load patients');
    }
  }
  
  static Future<Map<String, dynamic>> getPatient(int patientId) async {
    final response = await _makeRequest('GET', '/patients/$patientId');
    
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed to load patient details');
    }
  }
  
  // Appointment Management
  static Future<List<Map<String, dynamic>>> getDoctorAppointments({String? date}) async {
    final queryParams = date != null ? {'date': date} : null;
    final response = await _makeRequest(
      'GET', 
      '/mobile/doctor/appointments',
      queryParams: queryParams,
    );
    
    if (response.statusCode == 200) {
      final List<dynamic> data = jsonDecode(response.body);
      return data.cast<Map<String, dynamic>>();
    } else {
      throw Exception('Failed to load appointments');
    }
  }
  
  static Future<Map<String, dynamic>> acceptAppointment(int appointmentId) async {
    final response = await _makeRequest(
      'POST', 
      '/mobile/doctor/appointments/$appointmentId/accept',
    );
    
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed to accept appointment');
    }
  }
  
  static Future<Map<String, dynamic>> rejectAppointment(int appointmentId, String reason) async {
    final response = await _makeRequest(
      'POST', 
      '/mobile/doctor/appointments/$appointmentId/reject',
      body: {'reason': reason},
    );
    
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed to reject appointment');
    }
  }
  
  // Prescription Management
  static Future<List<Map<String, dynamic>>> getDoctorPrescriptions() async {
    final response = await _makeRequest('GET', '/mobile/doctor/prescriptions');
    
    if (response.statusCode == 200) {
      final List<dynamic> data = jsonDecode(response.body);
      return data.cast<Map<String, dynamic>>();
    } else {
      throw Exception('Failed to load prescriptions');
    }
  }
  
  static Future<Map<String, dynamic>> createPrescription(Map<String, dynamic> prescriptionData) async {
    final response = await _makeRequest(
      'POST', 
      '/mobile/doctor/prescriptions',
      body: prescriptionData,
    );
    
    if (response.statusCode == 201) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed to create prescription');
    }
  }
  
  // Video Consultation
  static Future<Map<String, dynamic>> startVideoConsultation(int appointmentId) async {
    final response = await _makeRequest(
      'POST', 
      '/mobile/video/start-consultation',
      body: {'appointmentId': appointmentId},
    );
    
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed to start video consultation');
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
  
  // Medical Records
  static Future<List<Map<String, dynamic>>> getPatientMedicalRecords(int patientId) async {
    final response = await _makeRequest('GET', '/medical-records/patient/$patientId');
    
    if (response.statusCode == 200) {
      final List<dynamic> data = jsonDecode(response.body);
      return data.cast<Map<String, dynamic>>();
    } else {
      throw Exception('Failed to load medical records');
    }
  }
  
  static Future<Map<String, dynamic>> createMedicalRecord(Map<String, dynamic> recordData) async {
    final response = await _makeRequest(
      'POST', 
      '/medical-records',
      body: recordData,
    );
    
    if (response.statusCode == 201) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed to create medical record');
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
}