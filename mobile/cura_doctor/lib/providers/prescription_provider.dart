import 'package:flutter/foundation.dart';
import '../services/api_service.dart';

class PrescriptionProvider extends ChangeNotifier {
  List<Map<String, dynamic>> _prescriptions = [];
  Map<String, dynamic>? _selectedPrescription;
  bool _isLoading = false;
  String? _errorMessage;
  
  List<Map<String, dynamic>> get prescriptions => _prescriptions;
  Map<String, dynamic>? get selectedPrescription => _selectedPrescription;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  
  Future<void> fetchPrescriptions() async {
    try {
      _isLoading = true;
      _errorMessage = null;
      notifyListeners();
      
      _prescriptions = await ApiService.getDoctorPrescriptions();
    } catch (e) {
      _errorMessage = 'Failed to load prescriptions: ${e.toString()}';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
  
  Future<bool> createPrescription(Map<String, dynamic> prescriptionData) async {
    try {
      _isLoading = true;
      _errorMessage = null;
      notifyListeners();
      
      final newPrescription = await ApiService.createPrescription(prescriptionData);
      _prescriptions.add(newPrescription);
      
      return true;
    } catch (e) {
      _errorMessage = 'Failed to create prescription: ${e.toString()}';
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
  
  void setSelectedPrescription(Map<String, dynamic> prescription) {
    _selectedPrescription = prescription;
    notifyListeners();
  }
  
  void clearSelectedPrescription() {
    _selectedPrescription = null;
    notifyListeners();
  }
  
  List<Map<String, dynamic>> getPrescriptionsByStatus(String status) {
    return _prescriptions.where((prescription) {
      return prescription['status'] == status;
    }).toList();
  }
  
  List<Map<String, dynamic>> getPrescriptionsByPatient(int patientId) {
    return _prescriptions.where((prescription) {
      return prescription['patientId'] == patientId;
    }).toList();
  }
  
  List<Map<String, dynamic>> searchPrescriptions(String query) {
    if (query.isEmpty) return _prescriptions;
    
    return _prescriptions.where((prescription) {
      final patientName = prescription['patientName']?.toString().toLowerCase() ?? '';
      final medication = prescription['medication']?.toString().toLowerCase() ?? '';
      final instructions = prescription['instructions']?.toString().toLowerCase() ?? '';
      
      return patientName.contains(query.toLowerCase()) ||
             medication.contains(query.toLowerCase()) ||
             instructions.contains(query.toLowerCase());
    }).toList();
  }
  
  Map<String, int> getPrescriptionStatistics() {
    final stats = {
      'total': _prescriptions.length,
      'active': 0,
      'completed': 0,
      'pending': 0,
      'cancelled': 0,
    };
    
    for (final prescription in _prescriptions) {
      final status = prescription['status'] ?? 'pending';
      if (stats.containsKey(status)) {
        stats[status] = stats[status]! + 1;
      }
    }
    
    return stats;
  }
  
  List<Map<String, dynamic>> getRecentPrescriptions() {
    final recent = [..._prescriptions];
    recent.sort((a, b) {
      final dateA = DateTime.parse(a['createdAt']);
      final dateB = DateTime.parse(b['createdAt']);
      return dateB.compareTo(dateA);
    });
    return recent.take(10).toList();
  }
  
  List<Map<String, dynamic>> getActivePrescriptions() {
    return _prescriptions.where((prescription) {
      return prescription['status'] == 'active';
    }).toList();
  }
  
  List<Map<String, dynamic>> getPendingPrescriptions() {
    return _prescriptions.where((prescription) {
      return prescription['status'] == 'pending';
    }).toList();
  }
  
  void clearError() {
    _errorMessage = null;
    notifyListeners();
  }
  
  // Get medication frequency options
  static List<String> get frequencyOptions => [
    'Once daily',
    'Twice daily', 
    'Three times daily',
    'Four times daily',
    'Every 6 hours',
    'Every 8 hours',
    'Every 12 hours',
    'As needed',
    'Before meals',
    'After meals',
    'At bedtime',
  ];
  
  // Get duration options
  static List<String> get durationOptions => [
    '3 days',
    '5 days',
    '7 days',
    '10 days',
    '14 days',
    '21 days',
    '30 days',
    '60 days',
    '90 days',
    'Ongoing',
  ];
  
  // Common medications
  static List<String> get commonMedications => [
    'Amoxicillin',
    'Ibuprofen', 
    'Paracetamol',
    'Omeprazole',
    'Metformin',
    'Atorvastatin',
    'Amlodipine',
    'Lisinopril',
    'Metoprolol',
    'Losartan',
    'Simvastatin',
    'Levothyroxine',
    'Albuterol',
    'Hydrochlorothiazide',
    'Warfarin',
  ];
}