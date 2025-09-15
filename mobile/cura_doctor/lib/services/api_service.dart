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

  /// Get doctor profile (typed return)
  /// Method: GET /api/doctor/profile
  /// Headers: Content-Type: application/json, Accept: application/json, Authorization: Bearer <token>, X-Tenant-Subdomain: demo
  /// Response: User object with doctor profile data
  static Future<User> getDoctorProfile() async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/doctor/profile'),
        headers: await _getHeaders(),
      );

      if (response.statusCode == 200) {
        return User.fromJson(jsonDecode(response.body));
      } else {
        throw Exception('Failed to load doctor profile');
      }
    } catch (e) {
      throw Exception('Network error: $e');
    }
  }

  /// Get encounter details
  /// Method: GET /api/doctor/encounters/{id}
  /// Headers: Content-Type: application/json, Accept: application/json, Authorization: Bearer <token>, X-Tenant-Subdomain: demo
  /// Response: Encounter details with SOAP notes, diagnoses, vitals
  static Future<Map<String, dynamic>> getEncounter(String id) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/doctor/encounters/$id'),
        headers: await _getHeaders(),
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        throw Exception('Failed to load encounter');
      }
    } catch (e) {
      throw Exception('Network error: $e');
    }
  }

  /// Update existing encounter
  /// Method: PUT /api/doctor/encounters/{id}
  /// Headers: Content-Type: application/json, Accept: application/json, Authorization: Bearer <token>, X-Tenant-Subdomain: demo
  /// Request: {"soap":{"s":"Updated subjective","o":"Updated objective","a":"Updated assessment","p":"Updated plan"}}
  /// Response: {"success": true, "encounter": {"id": "enc_123", "updatedAt": "2025-09-15T10:30:00Z"}}
  static Future<Map<String, dynamic>> updateEncounter(String id, Map<String, dynamic> body) async {
    try {
      final response = await http.put(
        Uri.parse('$baseUrl/doctor/encounters/$id'),
        headers: await _getHeaders(),
        body: jsonEncode(body),
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        throw Exception('Failed to update encounter');
      }
    } catch (e) {
      throw Exception('Network error: $e');
    }
  }

  /// List doctor appointments (consistent naming)
  /// Method: GET /api/doctor/appointments
  /// Headers: Content-Type: application/json, Accept: application/json, Authorization: Bearer <token>, X-Tenant-Subdomain: demo
  /// Query: Optional filters like date range, status
  /// Response: List of Appointment objects
  static Future<List<Appointment>> listDoctorAppointments({Map<String, String>? queryParams}) async {
    try {
      Uri uri = Uri.parse('$baseUrl/doctor/appointments');
      if (queryParams != null) {
        uri = uri.replace(queryParameters: queryParams);
      }
      
      final response = await http.get(uri, headers: await _getHeaders());

      if (response.statusCode == 200) {
        final List<dynamic> data = jsonDecode(response.body);
        return data.map((json) => Appointment.fromJson(json)).toList();
      } else {
        throw Exception('Failed to load doctor appointments');
      }
    } catch (e) {
      throw Exception('Network error: $e');
    }
  }

  /// List doctor notifications
  /// Method: GET /api/doctor/notifications
  /// Headers: Content-Type: application/json, Accept: application/json, Authorization: Bearer <token>, X-Tenant-Subdomain: demo
  /// Response: List of notifications
  static Future<List<Map<String, dynamic>>> listNotifications() async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/doctor/notifications'),
        headers: await _getHeaders(),
      );

      if (response.statusCode == 200) {
        final List<dynamic> data = jsonDecode(response.body);
        return data.cast<Map<String, dynamic>>();
      } else {
        throw Exception('Failed to load notifications');
      }
    } catch (e) {
      throw Exception('Network error: $e');
    }
  }

  /// Mark notification as read
  /// Method: POST /api/doctor/notifications/{id}/read
  /// Headers: Content-Type: application/json, Accept: application/json, Authorization: Bearer <token>, X-Tenant-Subdomain: demo
  /// Response: {"success": true, "message": "Notification marked as read"}
  static Future<Map<String, dynamic>> markNotificationRead(String id) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/doctor/notifications/$id/read'),
        headers: await _getHeaders(),
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        throw Exception('Failed to mark notification as read');
      }
    } catch (e) {
      throw Exception('Network error: $e');
    }
  }

  /// Send message to patient
  /// Method: POST /api/doctor/messaging/send
  /// Headers: Content-Type: application/json, Accept: application/json, Authorization: Bearer <token>, X-Tenant-Subdomain: demo
  /// Request: {"toPatientId":"p_1","text":"Hello..."}
  /// Response: {"success": true, "message": {"id": "msg_123", "text": "Hello...", "sentAt": "2025-09-15T10:30:00Z"}}
  static Future<Map<String, dynamic>> sendMessage(String toPatientId, String text) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/doctor/messaging/send'),
        headers: await _getHeaders(),
        body: jsonEncode({'toPatientId': toPatientId, 'text': text}),
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        return jsonDecode(response.body);
      } else {
        throw Exception('Failed to send message');
      }
    } catch (e) {
      throw Exception('Network error: $e');
    }
  }

  /// Join video session
  /// Method: POST /api/doctor/video/join
  /// Headers: Content-Type: application/json, Accept: application/json, Authorization: Bearer <token>, X-Tenant-Subdomain: demo
  /// Request: {"appointmentId": appointmentId}
  /// Response: {"success": true, "videoUrl": "https://...", "sessionId": "session_123"}
  static Future<Map<String, dynamic>> joinVideoSession(int appointmentId) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/doctor/video/join'),
        headers: await _getHeaders(),
        body: jsonEncode({'appointmentId': appointmentId}),
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        throw Exception('Failed to join video session');
      }
    } catch (e) {
      throw Exception('Network error: $e');
    }
  }
}