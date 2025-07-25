import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../models/patient.dart';
import '../models/appointment.dart';
import '../models/prescription.dart';
import '../models/user.dart';

class ApiService {
  // Working Production URL  
  static const String baseUrl = 'https://cac4d192-233a-437c-a07f-06383a374679-00-zga42ouzvz8z.riker.replit.dev/api';
  static const _storage = FlutterSecureStorage();

  static Future<Map<String, String>> _getHeaders() async {
    final token = await _storage.read(key: 'auth_token');
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': 'Bearer ${token ?? ''}',
      'X-Tenant-Subdomain': 'demo',
    };
  }

  // Dashboard API
  static Future<Map<String, dynamic>> getDashboardStats() async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/dashboard/stats'),
        headers: await _getHeaders(),
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        throw Exception('Failed to load dashboard stats');
      }
    } catch (e) {
      throw Exception('Network error: $e');
    }
  }

  // Patients API
  static Future<List<Patient>> getPatients() async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/patients'),
        headers: await _getHeaders(),
      );

      if (response.statusCode == 200) {
        final List<dynamic> data = jsonDecode(response.body);
        return data.map((json) => Patient.fromJson(json)).toList();
      } else {
        throw Exception('Failed to load patients');
      }
    } catch (e) {
      throw Exception('Network error: $e');
    }
  }

  static Future<Patient> getPatient(int patientId) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/patients/$patientId'),
        headers: await _getHeaders(),
      );

      if (response.statusCode == 200) {
        return Patient.fromJson(jsonDecode(response.body));
      } else {
        throw Exception('Failed to load patient');
      }
    } catch (e) {
      throw Exception('Network error: $e');
    }
  }

  // Appointments API
  static Future<List<Appointment>> getAppointments() async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/appointments'),
        headers: await _getHeaders(),
      );

      if (response.statusCode == 200) {
        final List<dynamic> data = jsonDecode(response.body);
        return data.map((json) => Appointment.fromJson(json)).toList();
      } else {
        throw Exception('Failed to load appointments');
      }
    } catch (e) {
      throw Exception('Network error: $e');
    }
  }

  static Future<List<Appointment>> getTodayAppointments() async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/mobile/appointments/today'),
        headers: await _getHeaders(),
      );

      if (response.statusCode == 200) {
        final List<dynamic> data = jsonDecode(response.body);
        return data.map((json) => Appointment.fromJson(json)).toList();
      } else {
        throw Exception('Failed to load today appointments');
      }
    } catch (e) {
      throw Exception('Network error: $e');
    }
  }

  static Future<Appointment> updateAppointmentStatus(int appointmentId, String status) async {
    try {
      final response = await http.patch(
        Uri.parse('$baseUrl/appointments/$appointmentId'),
        headers: await _getHeaders(),
        body: jsonEncode({'status': status}),
      );

      if (response.statusCode == 200) {
        return Appointment.fromJson(jsonDecode(response.body));
      } else {
        throw Exception('Failed to update appointment');
      }
    } catch (e) {
      throw Exception('Network error: $e');
    }
  }

  // Prescriptions API
  static Future<List<Prescription>> getPrescriptions() async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/prescriptions'),
        headers: await _getHeaders(),
      );

      if (response.statusCode == 200) {
        final List<dynamic> data = jsonDecode(response.body);
        return data.map((json) => Prescription.fromJson(json)).toList();
      } else {
        throw Exception('Failed to load prescriptions');
      }
    } catch (e) {
      throw Exception('Network error: $e');
    }
  }

  static Future<Prescription> createPrescription(Map<String, dynamic> prescriptionData) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/prescriptions'),
        headers: await _getHeaders(),
        body: jsonEncode(prescriptionData),
      );

      if (response.statusCode == 201) {
        return Prescription.fromJson(jsonDecode(response.body));
      } else {
        throw Exception('Failed to create prescription');
      }
    } catch (e) {
      throw Exception('Network error: $e');
    }
  }

  // Medical Records API
  static Future<List<Map<String, dynamic>>> getMedicalRecords(int patientId) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/patients/$patientId/medical-records'),
        headers: await _getHeaders(),
      );

      if (response.statusCode == 200) {
        final List<dynamic> data = jsonDecode(response.body);
        return data.cast<Map<String, dynamic>>();
      } else {
        throw Exception('Failed to load medical records');
      }
    } catch (e) {
      throw Exception('Network error: $e');
    }
  }

  static Future<Map<String, dynamic>> createMedicalRecord(Map<String, dynamic> recordData) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/medical-records'),
        headers: await _getHeaders(),
        body: jsonEncode(recordData),
      );

      if (response.statusCode == 201) {
        return jsonDecode(response.body);
      } else {
        throw Exception('Failed to create medical record');
      }
    } catch (e) {
      throw Exception('Network error: $e');
    }
  }

  // User API
  static Future<User> getUser() async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/auth/user'),
        headers: await _getHeaders(),
      );

      if (response.statusCode == 200) {
        return User.fromJson(jsonDecode(response.body));
      } else {
        throw Exception('Failed to load user data');
      }
    } catch (e) {
      throw Exception('Network error: $e');
    }
  }

  // Video Consultation API
  static Future<Map<String, dynamic>> createVideoCall(int appointmentId) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/video/create-meeting'),
        headers: await _getHeaders(),
        body: jsonEncode({'appointmentId': appointmentId}),
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        throw Exception('Failed to create video call');
      }
    } catch (e) {
      throw Exception('Network error: $e');
    }
  }
}