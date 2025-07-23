class ApiConfig {
  // Production/Live Environment
  static const String baseUrl = 'https://cac4d192-233a-437c-a07f-06383a374679-00-zga42ouzvz8z.riker.replit.dev';
  
  // Alternative: Use your custom domain if available
  // static const String baseUrl = 'https://your-custom-domain.com';
  
  // Development Environment (if testing locally)
  // static const String baseUrl = 'http://localhost:5000';
  
  static const String apiVersion = 'api';
  static String get apiUrl => '$baseUrl/$apiVersion';
  
  // API Endpoints for Patient App
  static const Map<String, String> endpoints = {
    // Authentication
    'login': '/auth/login',
    'validateToken': '/auth/validate',
    'logout': '/auth/logout',
    
    // Patient Dashboard
    'patientDashboard': '/mobile/patient/dashboard',
    
    // Appointments
    'patientAppointments': '/mobile/patient/appointments',
    'bookAppointment': '/mobile/patient/appointments',
    'cancelAppointment': '/mobile/patient/appointments', // + /{id}
    'availableDoctors': '/mobile/patient/doctors',
    'availableTimeSlots': '/mobile/patient/available-slots',
    
    // Medical Records
    'patientMedicalRecords': '/mobile/patient/medical-records',
    'medicalRecord': '/medical-records', // + /{id}
    
    // Prescriptions
    'patientPrescriptions': '/mobile/patient/prescriptions',
    
    // Video Consultation
    'joinVideoConsultation': '/mobile/video/join-consultation',
    
    // Notifications
    'notifications': '/notifications',
    'markNotificationRead': '/notifications', // + /{id}/read
    
    // Profile
    'patientProfile': '/mobile/patient/profile',
    'updatePatientProfile': '/mobile/patient/profile',
    
    // Lab Results
    'patientLabResults': '/mobile/patient/lab-results',
    
    // Messaging
    'conversations': '/conversations',
    'messages': '/messages',
    'sendMessage': '/messages',
    
    // Billing
    'patientBilling': '/mobile/patient/billing',
    'invoices': '/invoices',
    
    // Telemedicine
    'telemedicineSession': '/telemedicine/session',
    'joinTelemedicine': '/telemedicine/join',
  };
  
  // Required headers for all API requests
  static Map<String, String> getHeaders({String? token}) {
    final headers = <String, String>{
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Tenant-Subdomain': 'demo', // Multi-tenant support
    };
    
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }
    
    return headers;
  }
  
  // Timeout configurations
  static const int connectTimeout = 30000; // 30 seconds
  static const int receiveTimeout = 30000; // 30 seconds
  
  // API Response status codes
  static const int successCode = 200;
  static const int createdCode = 201;
  static const int unauthorizedCode = 401;
  static const int forbiddenCode = 403;
  static const int notFoundCode = 404;
  static const int serverErrorCode = 500;
}