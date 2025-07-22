import 'package:flutter/foundation.dart';
import '../services/api_service.dart';

class PatientProvider extends ChangeNotifier {
  List<Map<String, dynamic>> _patients = [];
  Map<String, dynamic>? _selectedPatient;
  bool _isLoading = false;
  String? _errorMessage;
  
  List<Map<String, dynamic>> get patients => _patients;
  Map<String, dynamic>? get selectedPatient => _selectedPatient;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  
  Future<void> fetchPatients() async {
    try {
      _isLoading = true;
      _errorMessage = null;
      notifyListeners();
      
      _patients = await ApiService.getPatients();
    } catch (e) {
      _errorMessage = 'Failed to load patients: ${e.toString()}';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
  
  Future<void> fetchPatientDetails(int patientId) async {
    try {
      _isLoading = true;
      _errorMessage = null;
      notifyListeners();
      
      _selectedPatient = await ApiService.getPatient(patientId);
    } catch (e) {
      _errorMessage = 'Failed to load patient details: ${e.toString()}';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
  
  List<Map<String, dynamic>> searchPatients(String query) {
    if (query.isEmpty) return _patients;
    
    return _patients.where((patient) {
      final name = patient['name']?.toString().toLowerCase() ?? '';
      final patientId = patient['patientId']?.toString().toLowerCase() ?? '';
      final email = patient['email']?.toString().toLowerCase() ?? '';
      final phone = patient['phone']?.toString().toLowerCase() ?? '';
      
      return name.contains(query.toLowerCase()) ||
             patientId.contains(query.toLowerCase()) ||
             email.contains(query.toLowerCase()) ||
             phone.contains(query.toLowerCase());
    }).toList();
  }
  
  List<Map<String, dynamic>> filterPatientsByRisk(String riskLevel) {
    return _patients.where((patient) {
      return patient['riskLevel'] == riskLevel;
    }).toList();
  }
  
  Map<String, dynamic>? getPatientById(int patientId) {
    try {
      return _patients.firstWhere((patient) => patient['id'] == patientId);
    } catch (e) {
      return null;
    }
  }
  
  void clearSelectedPatient() {
    _selectedPatient = null;
    notifyListeners();
  }
  
  void clearError() {
    _errorMessage = null;
    notifyListeners();
  }
  
  // Get patient statistics
  Map<String, int> getPatientStatistics() {
    final stats = {
      'total': _patients.length,
      'high_risk': 0,
      'medium_risk': 0,
      'low_risk': 0,
    };
    
    for (final patient in _patients) {
      final riskLevel = patient['riskLevel'] ?? 'low';
      switch (riskLevel) {
        case 'high':
          stats['high_risk'] = stats['high_risk']! + 1;
          break;
        case 'medium':
          stats['medium_risk'] = stats['medium_risk']! + 1;
          break;
        default:
          stats['low_risk'] = stats['low_risk']! + 1;
          break;
      }
    }
    
    return stats;
  }
  
  // Get recent patients (added in last 30 days)
  List<Map<String, dynamic>> getRecentPatients() {
    final thirtyDaysAgo = DateTime.now().subtract(const Duration(days: 30));
    
    return _patients.where((patient) {
      final lastVisit = patient['lastVisit'];
      if (lastVisit != null) {
        final visitDate = DateTime.parse(lastVisit);
        return visitDate.isAfter(thirtyDaysAgo);
      }
      return false;
    }).toList();
  }
}