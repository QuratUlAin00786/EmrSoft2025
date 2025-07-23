class ApiConfig {
  // Production API Configuration
  static const String baseUrl = 'https://cac4d192-233a-437c-a07f-06383a374679-00-zga42ouzvz8z.riker.replit.dev/api';
  
  // API Endpoints
  static const String loginEndpoint = '/auth/login';
  static const String validateEndpoint = '/auth/validate';
  static const String logoutEndpoint = '/auth/logout';
  
  // Mobile Patient Endpoints
  static const String patientDashboard = '/mobile/patient/dashboard';
  static const String patientAppointments = '/mobile/patient/appointments';
  static const String patientMedicalRecords = '/mobile/patient/medical-records';
  static const String patientPrescriptions = '/mobile/patient/prescriptions';
  static const String availableDoctors = '/mobile/patient/doctors';
  static const String timeSlots = '/mobile/patient/time-slots';
  
  // API Configuration
  static const Duration connectTimeout = Duration(seconds: 30);
  static const Duration receiveTimeout = Duration(seconds: 30);
  
  // Headers
  static const Map<String, String> defaultHeaders = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
  
  // API Keys and Configuration
  static const String appVersion = '1.0.0';
  static const String userAgent = 'CuraPatient/1.0.0 (Flutter)';
  
  // Error Messages
  static const String networkErrorMessage = 'Network connection error. Please check your internet connection.';
  static const String serverErrorMessage = 'Server error. Please try again later.';
  static const String unauthorizedMessage = 'Session expired. Please login again.';
  static const String notFoundMessage = 'Resource not found.';
  static const String badRequestMessage = 'Invalid request. Please check your input.';
}