import 'package:flutter/foundation.dart';
import '../services/api_service.dart';

class PrescriptionProvider extends ChangeNotifier {
  List<Map<String, dynamic>> _prescriptions = [];
  bool _isLoading = false;
  String? _errorMessage;
  
  List<Map<String, dynamic>> get prescriptions => _prescriptions;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  
  Future<void> fetchPrescriptions() async {
    try {
      _isLoading = true;
      _errorMessage = null;
      notifyListeners();
      
      _prescriptions = await ApiService.getPatientPrescriptions();
    } catch (e) {
      _errorMessage = 'Failed to load prescriptions: ${e.toString()}';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
  
  List<Map<String, dynamic>> getActivePrescriptions() {
    return _prescriptions.where((prescription) {
      return prescription['status'] == 'active';
    }).toList();
  }
  
  List<Map<String, dynamic>> getExpiredPrescriptions() {
    return _prescriptions.where((prescription) {
      final validUntil = prescription['validUntil'];
      if (validUntil != null) {
        final expiryDate = DateTime.parse(validUntil);
        return expiryDate.isBefore(DateTime.now());
      }
      return false;
    }).toList();
  }
  
  List<Map<String, dynamic>> searchPrescriptions(String query) {
    if (query.isEmpty) return _prescriptions;
    
    return _prescriptions.where((prescription) {
      final medications = prescription['medications'] as List<dynamic>? ?? [];
      final medicationNames = medications
          .map((med) => med['name']?.toString().toLowerCase() ?? '')
          .join(' ');
      
      final diagnosis = prescription['diagnosis']?.toString().toLowerCase() ?? '';
      final providerName = prescription['providerName']?.toString().toLowerCase() ?? '';
      
      return medicationNames.contains(query.toLowerCase()) ||
             diagnosis.contains(query.toLowerCase()) ||
             providerName.contains(query.toLowerCase());
    }).toList();
  }
  
  Map<String, int> getPrescriptionStatistics() {
    final stats = {
      'total': _prescriptions.length,
      'active': 0,
      'expired': 0,
      'pending': 0,
    };
    
    final now = DateTime.now();
    
    for (final prescription in _prescriptions) {
      final status = prescription['status'] ?? 'pending';
      if (status == 'active') {
        // Check if actually expired
        final validUntil = prescription['validUntil'];
        if (validUntil != null) {
          final expiryDate = DateTime.parse(validUntil);
          if (expiryDate.isBefore(now)) {
            stats['expired'] = stats['expired']! + 1;
          } else {
            stats['active'] = stats['active']! + 1;
          }
        } else {
          stats['active'] = stats['active']! + 1;
        }
      } else {
        stats['pending'] = stats['pending']! + 1;
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
  
  void clearError() {
    _errorMessage = null;
    notifyListeners();
  }
}