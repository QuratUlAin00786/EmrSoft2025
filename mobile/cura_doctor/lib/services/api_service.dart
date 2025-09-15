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

  // ===============================
  // MISSING DOCTOR API ENDPOINTS
  // ===============================

  /// Doctor OTP verification
  /// Method: POST /api/auth/verify-otp
  /// Headers: Content-Type: application/json, Accept: application/json, X-Tenant-Subdomain: demo
  /// Request: {"emailOrPhone": "doctor@example.com", "otp": "123456"}
  /// Response: {"success": true, "verified": true}
  static Future<Map<String, dynamic>> verifyOtp(String emailOrPhone, String otp) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/auth/verify-otp'),
        headers: await _getHeaders(),
        body: jsonEncode({'emailOrPhone': emailOrPhone, 'otp': otp}),
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        throw Exception('Failed to verify OTP');
      }
    } catch (e) {
      throw Exception('Network error: $e');
    }
  }

  /// Update doctor profile
  /// Method: PUT /api/doctor/profile
  /// Headers: Content-Type: application/json, Accept: application/json, Authorization: Bearer <token>, X-Tenant-Subdomain: demo
  /// Request: {"firstName": "Dr. John", "lastName": "Smith", "specialty": "Cardiology", "phone": "+1234567890"}
  /// Response: {"success": true, "profile": {"id": 1, "firstName": "Dr. John", "lastName": "Smith"}}
  static Future<Map<String, dynamic>> updateDoctorProfile(Map<String, dynamic> body) async {
    try {
      final response = await http.put(
        Uri.parse('$baseUrl/doctor/profile'),
        headers: await _getHeaders(),
        body: jsonEncode(body),
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        throw Exception('Failed to update doctor profile');
      }
    } catch (e) {
      throw Exception('Network error: $e');
    }
  }

  /// Change password
  /// Method: POST /api/auth/change-password
  /// Headers: Content-Type: application/json, Accept: application/json, Authorization: Bearer <token>, X-Tenant-Subdomain: demo
  /// Request: {"oldPassword": "oldpass123", "newPassword": "newpass123"}
  /// Response: {"success": true, "message": "Password changed successfully"}
  static Future<Map<String, dynamic>> changePassword(String oldPwd, String newPwd) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/auth/change-password'),
        headers: await _getHeaders(),
        body: jsonEncode({'oldPassword': oldPwd, 'newPassword': newPwd}),
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        throw Exception('Failed to change password');
      }
    } catch (e) {
      throw Exception('Network error: $e');
    }
  }

  /// Get doctor availability
  /// Method: GET /api/doctor/availability
  /// Headers: Content-Type: application/json, Accept: application/json, Authorization: Bearer <token>, X-Tenant-Subdomain: demo
  /// Response: {"timezone": "Asia/Karachi", "workingDays": ["Mon", "Tue", "Wed"], "slots": [{"start": "09:00", "end": "12:00"}]}
  static Future<Map<String, dynamic>> getAvailability() async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/doctor/availability'),
        headers: await _getHeaders(),
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        throw Exception('Failed to load availability');
      }
    } catch (e) {
      throw Exception('Network error: $e');
    }
  }

  /// Update doctor availability
  /// Method: PUT /api/doctor/availability
  /// Headers: Content-Type: application/json, Accept: application/json, Authorization: Bearer <token>, X-Tenant-Subdomain: demo
  /// Request: {"timezone":"Asia/Karachi","workingDays":["Mon","Tue","Wed","Thu","Fri"],"slots":[{"start":"09:00","end":"12:00"},{"start":"14:00","end":"17:00"}]}
  /// Response: {"success": true, "message": "Availability updated"}
  static Future<Map<String, dynamic>> updateAvailability(Map<String, dynamic> body) async {
    try {
      final response = await http.put(
        Uri.parse('$baseUrl/doctor/availability'),
        headers: await _getHeaders(),
        body: jsonEncode(body),
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        throw Exception('Failed to update availability');
      }
    } catch (e) {
      throw Exception('Network error: $e');
    }
  }

  /// Create new patient encounter
  /// Method: POST /api/doctor/encounters
  /// Headers: Content-Type: application/json, Accept: application/json, Authorization: Bearer <token>, X-Tenant-Subdomain: demo
  /// Request: {"patientId":"p_1","appointmentId":"apt_1","chiefComplaint":"...","soap":{"s":"...","o":"...","a":"...","p":"..."}}
  /// Response: {"success": true, "encounter": {"id": "enc_123", "patientId": "p_1", "date": "2025-09-15"}}
  static Future<Map<String, dynamic>> createEncounter(Map<String, dynamic> body) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/doctor/encounters'),
        headers: await _getHeaders(),
        body: jsonEncode(body),
      );

      if (response.statusCode == 201) {
        return jsonDecode(response.body);
      } else {
        throw Exception('Failed to create encounter');
      }
    } catch (e) {
      throw Exception('Network error: $e');
    }
  }

  /// Add diagnosis to encounter
  /// Method: POST /api/doctor/encounters/{id}/diagnoses
  /// Headers: Content-Type: application/json, Accept: application/json, Authorization: Bearer <token>, X-Tenant-Subdomain: demo
  /// Request: {"codes":[{"system":"ICD-10","code":"I10","desc":"Essential hypertension"}]}
  /// Response: {"success": true, "diagnosis": {"id": "diag_123", "codes": [{"system": "ICD-10", "code": "I10"}]}}
  static Future<Map<String, dynamic>> addDiagnosis(String id, Map<String, dynamic> body) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/doctor/encounters/$id/diagnoses'),
        headers: await _getHeaders(),
        body: jsonEncode(body),
      );

      if (response.statusCode == 201) {
        return jsonDecode(response.body);
      } else {
        throw Exception('Failed to add diagnosis');
      }
    } catch (e) {
      throw Exception('Network error: $e');
    }
  }

  /// Add vitals to encounter
  /// Method: POST /api/doctor/encounters/{id}/vitals
  /// Headers: Content-Type: application/json, Accept: application/json, Authorization: Bearer <token>, X-Tenant-Subdomain: demo
  /// Request: {"bp":"120/78","hr":72,"temp":36.9,"spo2":98,"resp":16}
  /// Response: {"success": true, "vitals": {"id": "vitals_123", "bp": "120/78", "hr": 72, "recordedAt": "2025-09-15T10:30:00Z"}}
  static Future<Map<String, dynamic>> addVitals(String id, Map<String, dynamic> body) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/doctor/encounters/$id/vitals'),
        headers: await _getHeaders(),
        body: jsonEncode(body),
      );

      if (response.statusCode == 201) {
        return jsonDecode(response.body);
      } else {
        throw Exception('Failed to add vitals');
      }
    } catch (e) {
      throw Exception('Network error: $e');
    }
  }
}