import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'auth_service.dart';

class ApiService {
  // Working Production URL
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
  
  /// Helper: calls _makeRequest and returns decoded JSON map.
  /// path: must start with "/"
  static Future<Map<String, dynamic>> _json(String path, String method, [Map<String, dynamic>? body]) async {
    final res = await _makeRequest(method, path, body: body);
    return jsonDecode(res.body) as Map<String, dynamic>;
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

  // ===============================
  // MISSING API METHODS - STEP 3
  // ===============================

  // AUTH METHODS

  /// Register new patient account
  /// Method: POST /api/auth/register
  /// Headers: Content-Type: application/json, Accept: application/json, X-Tenant-Subdomain: demo
  /// Request: {"email": "user@example.com", "password": "password123", "firstName": "John", "lastName": "Doe", "phone": "+1234567890"}
  /// Response: {"success": true, "message": "Registration successful", "user": {"id": 1, "email": "user@example.com"}}
  static Future<Map<String, dynamic>> register(Map<String, dynamic> body) async {
    return await _json('/api/auth/register', 'POST', body);
  }

  /// Send OTP for verification
  /// Method: POST /api/auth/send-otp
  /// Headers: Content-Type: application/json, Accept: application/json, X-Tenant-Subdomain: demo
  /// Request: {"emailOrPhone": "user@example.com"}
  /// Response: {"success": true, "message": "OTP sent successfully"}
  static Future<Map<String, dynamic>> sendOtp(String emailOrPhone) async {
    return await _json('/api/auth/send-otp', 'POST', {'emailOrPhone': emailOrPhone});
  }

  /// Verify OTP code
  /// Method: POST /api/auth/verify-otp
  /// Headers: Content-Type: application/json, Accept: application/json, X-Tenant-Subdomain: demo
  /// Request: {"emailOrPhone": "user@example.com", "otp": "123456"}
  /// Response: {"success": true, "verified": true}
  static Future<Map<String, dynamic>> verifyOtp(String emailOrPhone, String otp) async {
    return await _json('/api/auth/verify-otp', 'POST', {'emailOrPhone': emailOrPhone, 'otp': otp});
  }

  /// Request password reset
  /// Method: POST /api/auth/forgot-password
  /// Headers: Content-Type: application/json, Accept: application/json, X-Tenant-Subdomain: demo
  /// Request: {"emailOrPhone": "user@example.com"}
  /// Response: {"success": true, "message": "Reset code sent"}
  static Future<Map<String, dynamic>> forgotPassword(String emailOrPhone) async {
    return await _json('/api/auth/forgot-password', 'POST', {'emailOrPhone': emailOrPhone});
  }

  /// Reset password with OTP
  /// Method: POST /api/auth/reset-password
  /// Headers: Content-Type: application/json, Accept: application/json, X-Tenant-Subdomain: demo
  /// Request: {"emailOrPhone": "user@example.com", "otp": "123456", "newPassword": "newpass123"}
  /// Response: {"success": true, "message": "Password reset successful"}
  static Future<Map<String, dynamic>> resetPassword(String emailOrPhone, String otp, String newPassword) async {
    return await _json('/api/auth/reset-password', 'POST', {
      'emailOrPhone': emailOrPhone,
      'otp': otp,
      'newPassword': newPassword
    });
  }

  /// Change user password
  /// Method: POST /api/auth/change-password
  /// Headers: Content-Type: application/json, Accept: application/json, Authorization: Bearer <token>, X-Tenant-Subdomain: demo
  /// Request: {"oldPassword": "oldpass123", "newPassword": "newpass123"}
  /// Response: {"success": true, "message": "Password changed successfully"}
  static Future<Map<String, dynamic>> changePassword(String oldPwd, String newPwd) async {
    return await _json('/api/auth/change-password', 'POST', {
      'oldPassword': oldPwd,
      'newPassword': newPwd
    });
  }

  // APPOINTMENT METHODS

  /// Get appointment details by ID
  /// Method: GET /api/appointments/{id}
  /// Headers: Content-Type: application/json, Accept: application/json, Authorization: Bearer <token>, X-Tenant-Subdomain: demo
  /// Response: {"id": 1, "patientId": 123, "providerId": 456, "scheduledAt": "2024-01-15T10:00:00Z", "status": "scheduled"}
  static Future<Map<String, dynamic>> getAppointment(String id) async {
    return await _json('/api/appointments/$id', 'GET');
  }

  /// Cancel appointment with reason
  /// Method: POST /api/appointments/{id}/cancel
  /// Headers: Content-Type: application/json, Accept: application/json, Authorization: Bearer <token>, X-Tenant-Subdomain: demo
  /// Request: {"reason": "Personal emergency"}
  /// Response: {"success": true, "message": "Appointment cancelled"}
  static Future<Map<String, dynamic>> cancelAppointment(String id, String reason) async {
    return await _json('/api/appointments/$id/cancel', 'POST', {'reason': reason});
  }

  /// Reschedule appointment to new slot
  /// Method: POST /api/appointments/{id}/reschedule
  /// Headers: Content-Type: application/json, Accept: application/json, Authorization: Bearer <token>, X-Tenant-Subdomain: demo
  /// Request: {"newSlotId": "slot_123"}
  /// Response: {"success": true, "newScheduledAt": "2024-01-20T14:00:00Z"}
  static Future<Map<String, dynamic>> rescheduleAppointment(String id, String newSlotId) async {
    return await _json('/api/appointments/$id/reschedule', 'POST', {'newSlotId': newSlotId});
  }

  // BILLING METHODS

  /// Get list of patient invoices
  /// Method: GET /api/billing/invoices
  /// Headers: Content-Type: application/json, Accept: application/json, Authorization: Bearer <token>, X-Tenant-Subdomain: demo
  /// Response: [{"id": "inv_123", "amount": 150.00, "status": "pending", "dueDate": "2024-01-30"}]
  static Future<Map<String, dynamic>> listInvoices() async {
    return await _json('/api/billing/invoices', 'GET');
  }

  /// Get specific invoice details
  /// Method: GET /api/billing/invoices/{id}
  /// Headers: Content-Type: application/json, Accept: application/json, Authorization: Bearer <token>, X-Tenant-Subdomain: demo
  /// Response: {"id": "inv_123", "amount": 150.00, "items": [{"description": "Consultation", "amount": 150.00}]}
  static Future<Map<String, dynamic>> getInvoice(String id) async {
    return await _json('/api/billing/invoices/$id', 'GET');
  }

  /// Pay invoice using payment method
  /// Method: POST /api/billing/invoices/{id}/pay
  /// Headers: Content-Type: application/json, Accept: application/json, Authorization: Bearer <token>, X-Tenant-Subdomain: demo
  /// Request: {"method": "card", "token": "<gateway_token>", "saveMethod": false}
  /// Response: {"success": true, "transactionId": "txn_456", "status": "completed"}
  static Future<Map<String, dynamic>> payInvoice(String id, Map<String, dynamic> payment) async {
    return await _json('/api/billing/invoices/$id/pay', 'POST', payment);
  }

  // PROFILE METHODS

  /// Update patient profile
  /// Method: PUT /mobile/patient/profile
  /// Headers: Content-Type: application/json, Accept: application/json, Authorization: Bearer <token>, X-Tenant-Subdomain: demo
  /// Request: {"firstName": "John", "lastName": "Doe", "phone": "+1234567890", "address": "123 Main St"}
  /// Response: {"success": true, "profile": {"id": 123, "firstName": "John", "lastName": "Doe"}}
  static Future<Map<String, dynamic>> updateProfile(Map<String, dynamic> body) async {
    return await _json('/mobile/patient/profile', 'PUT', body);
  }

  // INSURANCE METHODS

  /// Get list of insurance policies
  /// Method: GET /api/insurance/policies
  /// Headers: Content-Type: application/json, Accept: application/json, Authorization: Bearer <token>, X-Tenant-Subdomain: demo
  /// Response: [{"id": "pol_123", "provider": "BlueCross", "policyNumber": "BC123456", "isActive": true}]
  static Future<Map<String, dynamic>> listPolicies() async {
    return await _json('/api/insurance/policies', 'GET');
  }

  /// Create new insurance policy
  /// Method: POST /api/insurance/policies
  /// Headers: Content-Type: application/json, Accept: application/json, Authorization: Bearer <token>, X-Tenant-Subdomain: demo
  /// Request: {"provider": "BlueCross", "policyNumber": "BC123456", "groupNumber": "GRP789"}
  /// Response: {"success": true, "policy": {"id": "pol_123", "provider": "BlueCross"}}
  static Future<Map<String, dynamic>> createPolicy(Map<String, dynamic> body) async {
    return await _json('/api/insurance/policies', 'POST', body);
  }

  /// Update insurance policy
  /// Method: PUT /api/insurance/policies/{id}
  /// Headers: Content-Type: application/json, Accept: application/json, Authorization: Bearer <token>, X-Tenant-Subdomain: demo
  /// Request: {"provider": "Aetna", "policyNumber": "AET456789"}
  /// Response: {"success": true, "policy": {"id": "pol_123", "provider": "Aetna"}}
  static Future<Map<String, dynamic>> updatePolicy(String id, Map<String, dynamic> body) async {
    return await _json('/api/insurance/policies/$id', 'PUT', body);
  }

  /// Delete insurance policy
  /// Method: DELETE /api/insurance/policies/{id}
  /// Headers: Content-Type: application/json, Accept: application/json, Authorization: Bearer <token>, X-Tenant-Subdomain: demo
  /// Response: {"success": true, "message": "Policy deleted"}
  static Future<Map<String, dynamic>> deletePolicy(String id) async {
    return await _json('/api/insurance/policies/$id', 'DELETE');
  }

  // DEPENDENTS METHODS

  /// Get list of patient dependents
  /// Method: GET /api/patient/dependents
  /// Headers: Content-Type: application/json, Accept: application/json, Authorization: Bearer <token>, X-Tenant-Subdomain: demo
  /// Response: [{"id": "dep_123", "firstName": "Jane", "lastName": "Doe", "relationship": "daughter", "dateOfBirth": "2010-05-15"}]
  static Future<Map<String, dynamic>> listDependents() async {
    return await _json('/api/patient/dependents', 'GET');
  }

  /// Create new dependent
  /// Method: POST /api/patient/dependents
  /// Headers: Content-Type: application/json, Accept: application/json, Authorization: Bearer <token>, X-Tenant-Subdomain: demo
  /// Request: {"firstName": "Jane", "lastName": "Doe", "relationship": "daughter", "dateOfBirth": "2010-05-15"}
  /// Response: {"success": true, "dependent": {"id": "dep_123", "firstName": "Jane"}}
  static Future<Map<String, dynamic>> createDependent(Map<String, dynamic> body) async {
    return await _json('/api/patient/dependents', 'POST', body);
  }

  /// Update dependent information
  /// Method: PUT /api/patient/dependents/{id}
  /// Headers: Content-Type: application/json, Accept: application/json, Authorization: Bearer <token>, X-Tenant-Subdomain: demo
  /// Request: {"firstName": "Janet", "lastName": "Doe"}
  /// Response: {"success": true, "dependent": {"id": "dep_123", "firstName": "Janet"}}
  static Future<Map<String, dynamic>> updateDependent(String id, Map<String, dynamic> body) async {
    return await _json('/api/patient/dependents/$id', 'PUT', body);
  }

  /// Delete dependent
  /// Method: DELETE /api/patient/dependents/{id}
  /// Headers: Content-Type: application/json, Accept: application/json, Authorization: Bearer <token>, X-Tenant-Subdomain: demo
  /// Response: {"success": true, "message": "Dependent removed"}
  static Future<Map<String, dynamic>> deleteDependent(String id) async {
    return await _json('/api/patient/dependents/$id', 'DELETE');
  }

  // LAB ORDER METHODS

  /// Get lab test catalog
  /// Method: GET /api/labs/catalog
  /// Headers: Content-Type: application/json, Accept: application/json, Authorization: Bearer <token>, X-Tenant-Subdomain: demo
  /// Response: [{"id": "lab_001", "name": "Complete Blood Count", "price": 45.00, "description": "CBC with differential"}]
  static Future<Map<String, dynamic>> listLabCatalog() async {
    return await _json('/api/labs/catalog', 'GET');
  }

  /// Create lab order
  /// Method: POST /api/labs/orders
  /// Headers: Content-Type: application/json, Accept: application/json, Authorization: Bearer <token>, X-Tenant-Subdomain: demo
  /// Request: {"testIds": ["lab_001", "lab_002"], "preferredDate": "2024-01-20", "notes": "Fasting required"}
  /// Response: {"success": true, "order": {"id": "order_123", "status": "pending", "tests": ["CBC", "Lipid Panel"]}}
  static Future<Map<String, dynamic>> createLabOrder(Map<String, dynamic> body) async {
    return await _json('/api/labs/orders', 'POST', body);
  }

  /// Get lab order details
  /// Method: GET /api/labs/orders/{id}
  /// Headers: Content-Type: application/json, Accept: application/json, Authorization: Bearer <token>, X-Tenant-Subdomain: demo
  /// Response: {"id": "order_123", "status": "completed", "results": [{"test": "CBC", "value": "Normal"}]}
  static Future<Map<String, dynamic>> getLabOrder(String id) async {
    return await _json('/api/labs/orders/$id', 'GET');
  }

  /// Cancel lab order
  /// Method: POST /api/labs/orders/{id}/cancel
  /// Headers: Content-Type: application/json, Accept: application/json, Authorization: Bearer <token>, X-Tenant-Subdomain: demo
  /// Response: {"success": true, "message": "Lab order cancelled"}
  static Future<Map<String, dynamic>> cancelLabOrder(String id) async {
    return await _json('/api/labs/orders/$id/cancel', 'POST');
  }

  // IMAGING ORDER METHODS

  /// Get imaging test catalog
  /// Method: GET /api/imaging/catalog
  /// Headers: Content-Type: application/json, Accept: application/json, Authorization: Bearer <token>, X-Tenant-Subdomain: demo
  /// Response: [{"id": "img_001", "name": "Chest X-Ray", "price": 120.00, "description": "Standard chest radiograph"}]
  static Future<Map<String, dynamic>> listImagingCatalog() async {
    return await _json('/api/imaging/catalog', 'GET');
  }

  /// Create imaging order
  /// Method: POST /api/imaging/orders
  /// Headers: Content-Type: application/json, Accept: application/json, Authorization: Bearer <token>, X-Tenant-Subdomain: demo
  /// Request: {"testIds": ["img_001"], "preferredDate": "2024-01-25", "reason": "Chest pain evaluation"}
  /// Response: {"success": true, "order": {"id": "img_order_123", "status": "scheduled", "tests": ["Chest X-Ray"]}}
  static Future<Map<String, dynamic>> createImagingOrder(Map<String, dynamic> body) async {
    return await _json('/api/imaging/orders', 'POST', body);
  }

  /// Get imaging order details
  /// Method: GET /api/imaging/orders/{id}
  /// Headers: Content-Type: application/json, Accept: application/json, Authorization: Bearer <token>, X-Tenant-Subdomain: demo
  /// Response: {"id": "img_order_123", "status": "completed", "images": [{"url": "https://...", "findings": "Normal"}]}
  static Future<Map<String, dynamic>> getImagingOrder(String id) async {
    return await _json('/api/imaging/orders/$id', 'GET');
  }

  /// Cancel imaging order
  /// Method: POST /api/imaging/orders/{id}/cancel
  /// Headers: Content-Type: application/json, Accept: application/json, Authorization: Bearer <token>, X-Tenant-Subdomain: demo
  /// Response: {"success": true, "message": "Imaging order cancelled"}
  static Future<Map<String, dynamic>> cancelImagingOrder(String id) async {
    return await _json('/api/imaging/orders/$id/cancel', 'POST');
  }

  // DOCUMENT UPLOAD METHOD

  /// Upload patient document (multipart)
  /// Method: POST /api/patient/documents
  /// Headers: Authorization: Bearer <token>, Accept: application/json, X-Tenant-Subdomain: demo (DO NOT set Content-Type manually)
  /// Fields: "file" (binary), "type" (optional string), "notes" (optional string)
  /// Response: {"success": true, "document": {"id": "doc_123", "filename": "report.pdf", "url": "https://..."}}
  static Future<Map<String, dynamic>> uploadDocument(File file, {String? type, String? notes}) async {
    final headers = await _getHeaders();
    headers.remove('Content-Type'); // Remove for multipart
    
    var request = http.MultipartRequest('POST', Uri.parse('$apiUrl/api/patient/documents'));
    request.headers.addAll(headers);
    
    request.files.add(await http.MultipartFile.fromPath('file', file.path));
    if (type != null) request.fields['type'] = type;
    if (notes != null) request.fields['notes'] = notes;
    
    final streamedResponse = await request.send();
    final response = await http.Response.fromStream(streamedResponse);
    
    if (response.statusCode == 200 || response.statusCode == 201) {
      return jsonDecode(response.body) as Map<String, dynamic>;
    } else {
      throw Exception('Failed to upload document: ${response.statusCode}');
    }
  }

