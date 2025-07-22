import 'package:flutter/foundation.dart';
import '../services/api_service.dart';

class AppointmentProvider extends ChangeNotifier {
  List<Map<String, dynamic>> _appointments = [];
  List<Map<String, dynamic>> _availableDoctors = [];
  List<Map<String, dynamic>> _availableSlots = [];
  bool _isLoading = false;
  String? _errorMessage;
  
  List<Map<String, dynamic>> get appointments => _appointments;
  List<Map<String, dynamic>> get availableDoctors => _availableDoctors;
  List<Map<String, dynamic>> get availableSlots => _availableSlots;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  
  Future<void> fetchAppointments({String? date}) async {
    try {
      _isLoading = true;
      _errorMessage = null;
      notifyListeners();
      
      _appointments = await ApiService.getPatientAppointments(date: date);
    } catch (e) {
      _errorMessage = 'Failed to load appointments: ${e.toString()}';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
  
  Future<void> fetchAvailableDoctors() async {
    try {
      _isLoading = true;
      _errorMessage = null;
      notifyListeners();
      
      _availableDoctors = await ApiService.getAvailableDoctors();
    } catch (e) {
      _errorMessage = 'Failed to load doctors: ${e.toString()}';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
  
  Future<void> fetchAvailableSlots(int doctorId, String date) async {
    try {
      _isLoading = true;
      _errorMessage = null;
      notifyListeners();
      
      _availableSlots = await ApiService.getAvailableTimeSlots(doctorId, date);
    } catch (e) {
      _errorMessage = 'Failed to load available slots: ${e.toString()}';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
  
  Future<bool> bookAppointment(Map<String, dynamic> appointmentData) async {
    try {
      _isLoading = true;
      _errorMessage = null;
      notifyListeners();
      
      final newAppointment = await ApiService.bookAppointment(appointmentData);
      _appointments.add(newAppointment);
      
      return true;
    } catch (e) {
      _errorMessage = 'Failed to book appointment: ${e.toString()}';
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
  
  Future<bool> cancelAppointment(int appointmentId) async {
    try {
      _isLoading = true;
      _errorMessage = null;
      notifyListeners();
      
      await ApiService.cancelAppointment(appointmentId);
      
      // Remove from local list
      _appointments.removeWhere((apt) => apt['id'] == appointmentId);
      
      return true;
    } catch (e) {
      _errorMessage = 'Failed to cancel appointment: ${e.toString()}';
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
  
  List<Map<String, dynamic>> getAppointmentsByStatus(String status) {
    return _appointments.where((appointment) {
      return appointment['status'] == status;
    }).toList();
  }
  
  List<Map<String, dynamic>> getUpcomingAppointments() {
    final now = DateTime.now();
    return _appointments.where((appointment) {
      final scheduledAt = DateTime.parse(appointment['scheduledAt']);
      return scheduledAt.isAfter(now);
    }).toList()
      ..sort((a, b) => DateTime.parse(a['scheduledAt']).compareTo(DateTime.parse(b['scheduledAt'])));
  }
  
  List<Map<String, dynamic>> getTodaysAppointments() {
    final today = DateTime.now();
    return _appointments.where((appointment) {
      final scheduledAt = DateTime.parse(appointment['scheduledAt']);
      return scheduledAt.year == today.year &&
             scheduledAt.month == today.month &&
             scheduledAt.day == today.day;
    }).toList();
  }
  
  Map<String, dynamic>? getNextAppointment() {
    final upcomingAppointments = getUpcomingAppointments();
    return upcomingAppointments.isNotEmpty ? upcomingAppointments.first : null;
  }
  
  void clearError() {
    _errorMessage = null;
    notifyListeners();
  }
  
  // Check if appointment is virtual
  bool isVirtualAppointment(Map<String, dynamic> appointment) {
    return appointment['isVirtual'] == true || appointment['type'] == 'virtual';
  }
  
  Map<String, int> getAppointmentStatistics() {
    final stats = {
      'total': _appointments.length,
      'scheduled': 0,
      'confirmed': 0,
      'completed': 0,
      'cancelled': 0,
    };
    
    for (final appointment in _appointments) {
      final status = appointment['status'] ?? 'scheduled';
      if (stats.containsKey(status)) {
        stats[status] = stats[status]! + 1;
      }
    }
    
    return stats;
  }
}