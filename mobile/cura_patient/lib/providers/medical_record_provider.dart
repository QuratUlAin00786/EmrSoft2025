import 'package:flutter/foundation.dart';
import '../services/api_service.dart';

class MedicalRecordProvider extends ChangeNotifier {
  List<Map<String, dynamic>> _medicalRecords = [];
  bool _isLoading = false;
  String? _errorMessage;
  
  List<Map<String, dynamic>> get medicalRecords => _medicalRecords;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  
  Future<void> fetchMedicalRecords() async {
    try {
      _isLoading = true;
      _errorMessage = null;
      notifyListeners();
      
      _medicalRecords = await ApiService.getPatientMedicalRecords();
    } catch (e) {
      _errorMessage = 'Failed to load medical records: ${e.toString()}';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
  
  List<Map<String, dynamic>> getRecordsByType(String type) {
    return _medicalRecords.where((record) {
      return record['type'] == type;
    }).toList();
  }
  
  List<Map<String, dynamic>> getRecentRecords() {
    final recent = [..._medicalRecords];
    recent.sort((a, b) {
      final dateA = DateTime.parse(a['date'] ?? a['createdAt']);
      final dateB = DateTime.parse(b['date'] ?? b['createdAt']);
      return dateB.compareTo(dateA);
    });
    return recent.take(10).toList();
  }
  
  List<Map<String, dynamic>> searchRecords(String query) {
    if (query.isEmpty) return _medicalRecords;
    
    return _medicalRecords.where((record) {
      final diagnosis = record['diagnosis']?.toString().toLowerCase() ?? '';
      final symptoms = record['symptoms']?.toString().toLowerCase() ?? '';
      final treatment = record['treatment']?.toString().toLowerCase() ?? '';
      final notes = record['notes']?.toString().toLowerCase() ?? '';
      final providerName = record['providerName']?.toString().toLowerCase() ?? '';
      
      return diagnosis.contains(query.toLowerCase()) ||
             symptoms.contains(query.toLowerCase()) ||
             treatment.contains(query.toLowerCase()) ||
             notes.contains(query.toLowerCase()) ||
             providerName.contains(query.toLowerCase());
    }).toList();
  }
  
  Map<String, int> getMedicalRecordStatistics() {
    final stats = {
      'total': _medicalRecords.length,
      'consultations': 0,
      'diagnoses': 0,
      'treatments': 0,
      'procedures': 0,
    };
    
    for (final record in _medicalRecords) {
      final type = record['type'] ?? 'consultation';
      switch (type.toLowerCase()) {
        case 'consultation':
          stats['consultations'] = stats['consultations']! + 1;
          break;
        case 'diagnosis':
          stats['diagnoses'] = stats['diagnoses']! + 1;
          break;
        case 'treatment':
          stats['treatments'] = stats['treatments']! + 1;
          break;
        case 'procedure':
          stats['procedures'] = stats['procedures']! + 1;
          break;
        default:
          stats['consultations'] = stats['consultations']! + 1;
      }
    }
    
    return stats;
  }
  
  List<Map<String, dynamic>> getRecordsByDateRange(DateTime startDate, DateTime endDate) {
    return _medicalRecords.where((record) {
      final recordDate = DateTime.parse(record['date'] ?? record['createdAt']);
      return recordDate.isAfter(startDate) && recordDate.isBefore(endDate);
    }).toList();
  }
  
  List<String> getAllDiagnoses() {
    final diagnoses = <String>{};
    for (final record in _medicalRecords) {
      final diagnosis = record['diagnosis']?.toString();
      if (diagnosis != null && diagnosis.isNotEmpty) {
        diagnoses.add(diagnosis);
      }
    }
    return diagnoses.toList()..sort();
  }
  
  List<String> getAllSymptoms() {
    final symptoms = <String>{};
    for (final record in _medicalRecords) {
      final symptomList = record['symptoms'];
      if (symptomList is List) {
        for (final symptom in symptomList) {
          if (symptom is String && symptom.isNotEmpty) {
            symptoms.add(symptom);
          }
        }
      } else if (symptomList is String && symptomList.isNotEmpty) {
        // Split comma-separated symptoms
        final splitSymptoms = symptomList.split(',');
        for (final symptom in splitSymptoms) {
          symptoms.add(symptom.trim());
        }
      }
    }
    return symptoms.toList()..sort();
  }
  
  Map<String, dynamic>? getLatestRecord() {
    if (_medicalRecords.isEmpty) return null;
    
    final sortedRecords = [..._medicalRecords];
    sortedRecords.sort((a, b) {
      final dateA = DateTime.parse(a['date'] ?? a['createdAt']);
      final dateB = DateTime.parse(b['date'] ?? b['createdAt']);
      return dateB.compareTo(dateA);
    });
    
    return sortedRecords.first;
  }
  
  void clearError() {
    _errorMessage = null;
    notifyListeners();
  }
}