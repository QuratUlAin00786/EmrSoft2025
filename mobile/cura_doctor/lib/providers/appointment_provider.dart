import 'package:flutter/foundation.dart';
import '../services/api_service.dart';

class AppointmentProvider extends ChangeNotifier {
  List<Map<String, dynamic>> _appointments = [];
  Map<String, dynamic>? _selectedAppointment;
  bool _isLoading = false;
  String? _errorMessage;
  DateTime _selectedDate = DateTime.now();
  
  List<Map<String, dynamic>> get appointments => _appointments;
  Map<String, dynamic>? get selectedAppointment => _selectedAppointment;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  DateTime get selectedDate => _selectedDate;
  
  Future<void> fetchAppointments({String? date}) async {
    try {
      _isLoading = true;
      _errorMessage = null;
      notifyListeners();
      
      _appointments = await ApiService.getDoctorAppointments(date: date);
    } catch (e) {
      _errorMessage = 'Failed to load appointments: ${e.toString()}';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
  
  Future<bool> acceptAppointment(int appointmentId) async {
    try {
      _isLoading = true;
      _errorMessage = null;
      notifyListeners();
      
      await ApiService.acceptAppointment(appointmentId);
      
      // Update local appointment status
      final index = _appointments.indexWhere((apt) => apt['id'] == appointmentId);
      if (index != -1) {
        _appointments[index]['status'] = 'confirmed';
      }
      
      return true;
    } catch (e) {
      _errorMessage = 'Failed to accept appointment: ${e.toString()}';
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
  
  Future<bool> rejectAppointment(int appointmentId, String reason) async {
    try {
      _isLoading = true;
      _errorMessage = null;
      notifyListeners();
      
      await ApiService.rejectAppointment(appointmentId, reason);
      
      // Update local appointment status
      final index = _appointments.indexWhere((apt) => apt['id'] == appointmentId);
      if (index != -1) {
        _appointments[index]['status'] = 'cancelled';
        _appointments[index]['description'] = 'Cancelled: $reason';
      }
      
      return true;
    } catch (e) {
      _errorMessage = 'Failed to reject appointment: ${e.toString()}';
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
  
  void setSelectedDate(DateTime date) {
    _selectedDate = date;
    notifyListeners();
    
    // Fetch appointments for the selected date
    final dateString = '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
    fetchAppointments(date: dateString);
  }
  
  void setSelectedAppointment(Map<String, dynamic> appointment) {
    _selectedAppointment = appointment;
    notifyListeners();
  }
  
  void clearSelectedAppointment() {
    _selectedAppointment = null;
    notifyListeners();
  }
  
  List<Map<String, dynamic>> getAppointmentsByStatus(String status) {
    return _appointments.where((appointment) {
      return appointment['status'] == status;
    }).toList();
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
  
  List<Map<String, dynamic>> getUpcomingAppointments() {
    final now = DateTime.now();
    return _appointments.where((appointment) {
      final scheduledAt = DateTime.parse(appointment['scheduledAt']);
      return scheduledAt.isAfter(now) && appointment['status'] == 'scheduled';
    }).toList()
      ..sort((a, b) => DateTime.parse(a['scheduledAt']).compareTo(DateTime.parse(b['scheduledAt'])));
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
  
  List<Map<String, dynamic>> searchAppointments(String query) {
    if (query.isEmpty) return _appointments;
    
    return _appointments.where((appointment) {
      final patientName = appointment['patientName']?.toString().toLowerCase() ?? '';
      final title = appointment['title']?.toString().toLowerCase() ?? '';
      final type = appointment['type']?.toString().toLowerCase() ?? '';
      
      return patientName.contains(query.toLowerCase()) ||
             title.contains(query.toLowerCase()) ||
             type.contains(query.toLowerCase());
    }).toList();
  }
  
  void clearError() {
    _errorMessage = null;
    notifyListeners();
  }
  
  // Get next appointment
  Map<String, dynamic>? getNextAppointment() {
    final upcomingAppointments = getUpcomingAppointments();
    return upcomingAppointments.isNotEmpty ? upcomingAppointments.first : null;
  }
  
  // Check if appointment is virtual
  bool isVirtualAppointment(Map<String, dynamic> appointment) {
    return appointment['isVirtual'] == true || appointment['type'] == 'virtual';
  }
}