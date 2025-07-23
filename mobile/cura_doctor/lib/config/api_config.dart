class ApiConfig {
  // Production/Live Environment
  static const String baseUrl = 'https://cac4d192-233a-437c-a07f-06383a374679-00-zga42ouzvz8z.riker.replit.dev';
  
  // Alternative: Use your custom domain if available
  // static const String baseUrl = 'https://your-custom-domain.com';
  
  // Development Environment (if testing locally)
  // static const String baseUrl = 'http://localhost:5000';
  
  static const String apiVersion = 'api';
  static String get apiUrl => '$baseUrl/$apiVersion';
  
  // API Endpoints for Doctor App
  static const Map<String, String> endpoints = {
    // Authentication
    'login': '/auth/login',
    'validateToken': '/auth/validate',
    'logout': '/auth/logout',
    
    // Doctor Dashboard
    'doctorDashboard': '/mobile/doctor/dashboard',
    
    // Patient Management
    'doctorPatients': '/mobile/doctor/patients',
    'patientDetails': '/patients', // + /{id}
    'patientMedicalRecords': '/medical-records/patient', // + /{patientId}
    'createMedicalRecord': '/medical-records',
    
    // Appointment Management
    'doctorAppointments': '/mobile/doctor/appointments',
    'acceptAppointment': '/mobile/doctor/appointments', // + /{id}/accept
    'rejectAppointment': '/mobile/doctor/appointments', // + /{id}/reject
    'rescheduleAppointment': '/mobile/doctor/appointments', // + /{id}/reschedule
    
    // Prescription Management
    'doctorPrescriptions': '/mobile/doctor/prescriptions',
    'createPrescription': '/mobile/doctor/prescriptions',
    'updatePrescription': '/prescriptions', // + /{id}
    'deletePrescription': '/prescriptions', // + /{id}
    
    // Video Consultation
    'startVideoConsultation': '/mobile/video/start-consultation',
    'endVideoConsultation': '/mobile/video/end-consultation',
    
    // Analytics
    'doctorAnalytics': '/mobile/doctor/analytics',
    'patientStatistics': '/mobile/doctor/statistics',
    
    // Medication Alerts
    'medicationAlerts': '/mobile/doctor/medication-alerts',
    'dismissAlert': '/mobile/doctor/medication-alerts', // + /{id}/dismiss
    
    // Lab Results
    'doctorLabResults': '/mobile/doctor/lab-results',
    'orderLabTest': '/mobile/doctor/lab-results/order',
    
    // Imaging
    'doctorImaging': '/mobile/doctor/imaging',
    'orderImaging': '/mobile/doctor/imaging/order',
    
    // Notifications
    'notifications': '/notifications',
    'markNotificationRead': '/notifications', // + /{id}/read
    
    // Profile
    'doctorProfile': '/mobile/doctor/profile',
    'updateDoctorProfile': '/mobile/doctor/profile',
    
    // Telemedicine
    'telemedicineSession': '/telemedicine/session',
    'createTelemedicineSession': '/telemedicine/create',
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