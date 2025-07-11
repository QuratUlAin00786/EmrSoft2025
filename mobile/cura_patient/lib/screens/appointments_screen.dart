import 'package:flutter/material.dart';
import 'package:table_calendar/table_calendar.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import '../services/auth_service.dart';
import '../utils/app_colors.dart';
import 'package:intl/intl.dart';

class AppointmentsScreen extends StatefulWidget {
  const AppointmentsScreen({super.key});

  @override
  State<AppointmentsScreen> createState() => _AppointmentsScreenState();
}

class _AppointmentsScreenState extends State<AppointmentsScreen> {
  List<dynamic> _appointments = [];
  List<dynamic> _providers = [];
  bool _isLoading = true;
  String _error = '';
  DateTime _selectedDay = DateTime.now();
  DateTime _focusedDay = DateTime.now();

  @override
  void initState() {
    super.initState();
    _loadAppointments();
    _loadProviders();
  }

  Future<void> _loadAppointments() async {
    try {
      final authService = AuthService();
      final headers = await authService.getAuthHeaders();
      
      final response = await http.get(
        Uri.parse('${authService._baseUrl}/appointments'),
        headers: headers,
      );

      if (response.statusCode == 200) {
        setState(() {
          _appointments = jsonDecode(response.body);
          _isLoading = false;
        });
      } else {
        setState(() {
          _error = 'Failed to load appointments';
          _isLoading = false;
        });
      }
    } catch (e) {
      setState(() {
        _error = 'Network error: ${e.toString()}';
        _isLoading = false;
      });
    }
  }

  Future<void> _loadProviders() async {
    try {
      final authService = AuthService();
      final headers = await authService.getAuthHeaders();
      
      final response = await http.get(
        Uri.parse('${authService._baseUrl}/medical-staff'),
        headers: headers,
      );

      if (response.statusCode == 200) {
        setState(() {
          _providers = jsonDecode(response.body);
        });
      }
    } catch (e) {
      // Continue without providers if this fails
    }
  }

  List<dynamic> _getAppointmentsForDay(DateTime day) {
    return _appointments.where((appointment) {
      final appointmentDate = DateTime.parse(appointment['scheduledAt']);
      return isSameDay(appointmentDate, day);
    }).toList();
  }

  void _showBookAppointmentDialog() {
    showDialog(
      context: context,
      builder: (context) => _BookAppointmentDialog(
        providers: _providers,
        onAppointmentBooked: () {
          _loadAppointments();
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Appointments'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: _showBookAppointmentDialog,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _error.isNotEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.error_outline,
                        size: 64,
                        color: AppColors.error,
                      ),
                      const SizedBox(height: 16),
                      Text(
                        _error,
                        style: const TextStyle(
                          fontSize: 16,
                          color: AppColors.textLight,
                        ),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: () {
                          setState(() {
                            _isLoading = true;
                            _error = '';
                          });
                          _loadAppointments();
                        },
                        child: const Text('Retry'),
                      ),
                    ],
                  ),
                )
              : Column(
                  children: [
                    Container(
                      color: Colors.white,
                      child: TableCalendar<dynamic>(
                        firstDay: DateTime.utc(2020, 1, 1),
                        lastDay: DateTime.utc(2030, 12, 31),
                        focusedDay: _focusedDay,
                        selectedDayPredicate: (day) => isSameDay(_selectedDay, day),
                        eventLoader: _getAppointmentsForDay,
                        startingDayOfWeek: StartingDayOfWeek.monday,
                        calendarStyle: const CalendarStyle(
                          outsideDaysVisible: false,
                          selectedDecoration: BoxDecoration(
                            color: AppColors.primary,
                            shape: BoxShape.circle,
                          ),
                          todayDecoration: BoxDecoration(
                            color: AppColors.secondary,
                            shape: BoxShape.circle,
                          ),
                          markerDecoration: BoxDecoration(
                            color: AppColors.accent,
                            shape: BoxShape.circle,
                          ),
                        ),
                        headerStyle: const HeaderStyle(
                          formatButtonVisible: false,
                          titleCentered: true,
                          leftChevronIcon: Icon(Icons.chevron_left, color: AppColors.primary),
                          rightChevronIcon: Icon(Icons.chevron_right, color: AppColors.primary),
                        ),
                        onDaySelected: (selectedDay, focusedDay) {
                          setState(() {
                            _selectedDay = selectedDay;
                            _focusedDay = focusedDay;
                          });
                        },
                        onPageChanged: (focusedDay) {
                          _focusedDay = focusedDay;
                        },
                      ),
                    ),
                    const SizedBox(height: 16),
                    Expanded(
                      child: _buildAppointmentsList(),
                    ),
                  ],
                ),
      floatingActionButton: FloatingActionButton(
        onPressed: _showBookAppointmentDialog,
        backgroundColor: AppColors.primary,
        child: const Icon(Icons.add, color: Colors.white),
      ),
    );
  }

  Widget _buildAppointmentsList() {
    final dayAppointments = _getAppointmentsForDay(_selectedDay);
    
    if (dayAppointments.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.event_available,
              size: 64,
              color: AppColors.textMuted,
            ),
            const SizedBox(height: 16),
            Text(
              'No appointments for ${DateFormat('MMM dd, yyyy').format(_selectedDay)}',
              style: const TextStyle(
                fontSize: 16,
                color: AppColors.textLight,
              ),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      itemCount: dayAppointments.length,
      itemBuilder: (context, index) {
        final appointment = dayAppointments[index];
        return _AppointmentCard(appointment: appointment);
      },
    );
  }
}

class _AppointmentCard extends StatelessWidget {
  final Map<String, dynamic> appointment;

  const _AppointmentCard({required this.appointment});

  @override
  Widget build(BuildContext context) {
    final scheduledAt = DateTime.parse(appointment['scheduledAt']);
    final timeFormat = DateFormat('h:mm a');
    
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppColors.primary.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(
                  appointment['isVirtual'] == true 
                      ? Icons.videocam 
                      : Icons.local_hospital,
                  color: AppColors.primary,
                  size: 20,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      appointment['title'] ?? 'Appointment',
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textDark,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      timeFormat.format(scheduledAt),
                      style: const TextStyle(
                        fontSize: 14,
                        color: AppColors.textLight,
                      ),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: _getStatusColor(appointment['status']).withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  appointment['status'] ?? 'Unknown',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                    color: _getStatusColor(appointment['status']),
                  ),
                ),
              ),
            ],
          ),
          if (appointment['description'] != null) ...[
            const SizedBox(height: 12),
            Text(
              appointment['description'],
              style: const TextStyle(
                fontSize: 14,
                color: AppColors.textDark,
              ),
            ),
          ],
          if (appointment['location'] != null) ...[
            const SizedBox(height: 8),
            Row(
              children: [
                Icon(
                  Icons.location_on,
                  size: 16,
                  color: AppColors.textLight,
                ),
                const SizedBox(width: 4),
                Text(
                  appointment['location'],
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppColors.textLight,
                  ),
                ),
              ],
            ),
          ],
          const SizedBox(height: 8),
          Row(
            children: [
              Icon(
                Icons.access_time,
                size: 16,
                color: AppColors.textLight,
              ),
              const SizedBox(width: 4),
              Text(
                'Duration: ${appointment['duration'] ?? 30} minutes',
                style: const TextStyle(
                  fontSize: 12,
                  color: AppColors.textLight,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Color _getStatusColor(String? status) {
    switch (status?.toLowerCase()) {
      case 'scheduled':
        return AppColors.primary;
      case 'confirmed':
        return AppColors.accent;
      case 'completed':
        return AppColors.textMuted;
      case 'cancelled':
        return AppColors.error;
      default:
        return AppColors.textLight;
    }
  }
}

class _BookAppointmentDialog extends StatefulWidget {
  final List<dynamic> providers;
  final VoidCallback onAppointmentBooked;

  const _BookAppointmentDialog({
    required this.providers,
    required this.onAppointmentBooked,
  });

  @override
  State<_BookAppointmentDialog> createState() => _BookAppointmentDialogState();
}

class _BookAppointmentDialogState extends State<_BookAppointmentDialog> {
  final _formKey = GlobalKey<FormState>();
  String? _selectedProviderId;
  DateTime _selectedDate = DateTime.now();
  TimeOfDay _selectedTime = TimeOfDay.now();
  String _appointmentType = 'consultation';
  String _description = '';
  bool _isVirtual = false;
  bool _isLoading = false;

  Future<void> _bookAppointment() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);

    try {
      final authService = AuthService();
      final headers = await authService.getAuthHeaders();
      final user = await authService.getUser();
      
      final scheduledDateTime = DateTime(
        _selectedDate.year,
        _selectedDate.month,
        _selectedDate.day,
        _selectedTime.hour,
        _selectedTime.minute,
      );

      final response = await http.post(
        Uri.parse('${authService._baseUrl}/appointments'),
        headers: headers,
        body: jsonEncode({
          'patientId': user?['id'],
          'providerId': int.parse(_selectedProviderId!),
          'title': '$_appointmentType Appointment',
          'description': _description,
          'scheduledAt': scheduledDateTime.toIso8601String(),
          'duration': 30,
          'type': _appointmentType,
          'isVirtual': _isVirtual,
          'status': 'scheduled',
        }),
      );

      setState(() => _isLoading = false);

      if (response.statusCode == 200 || response.statusCode == 201) {
        widget.onAppointmentBooked();
        Navigator.of(context).pop();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Appointment booked successfully!'),
            backgroundColor: AppColors.accent,
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Failed to book appointment'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    } catch (e) {
      setState(() => _isLoading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error: ${e.toString()}'),
          backgroundColor: AppColors.error,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
      ),
      child: Container(
        padding: const EdgeInsets.all(24),
        constraints: const BoxConstraints(maxHeight: 600),
        child: Form(
          key: _formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Book New Appointment',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: AppColors.textDark,
                ),
              ),
              const SizedBox(height: 20),
              
              // Provider Selection
              DropdownButtonFormField<String>(
                value: _selectedProviderId,
                decoration: const InputDecoration(
                  labelText: 'Select Provider',
                ),
                items: widget.providers.map<DropdownMenuItem<String>>((provider) {
                  return DropdownMenuItem<String>(
                    value: provider['id'].toString(),
                    child: Text('${provider['firstName']} ${provider['lastName']}'),
                  );
                }).toList(),
                onChanged: (value) {
                  setState(() => _selectedProviderId = value);
                },
                validator: (value) {
                  if (value == null) return 'Please select a provider';
                  return null;
                },
              ),
              const SizedBox(height: 16),

              // Appointment Type
              DropdownButtonFormField<String>(
                value: _appointmentType,
                decoration: const InputDecoration(
                  labelText: 'Appointment Type',
                ),
                items: const [
                  DropdownMenuItem(value: 'consultation', child: Text('Consultation')),
                  DropdownMenuItem(value: 'checkup', child: Text('Check-up')),
                  DropdownMenuItem(value: 'followup', child: Text('Follow-up')),
                  DropdownMenuItem(value: 'emergency', child: Text('Emergency')),
                ],
                onChanged: (value) {
                  setState(() => _appointmentType = value!);
                },
              ),
              const SizedBox(height: 16),

              // Date Selection
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.calendar_today),
                title: Text('Date: ${DateFormat('MMM dd, yyyy').format(_selectedDate)}'),
                onTap: () async {
                  final date = await showDatePicker(
                    context: context,
                    initialDate: _selectedDate,
                    firstDate: DateTime.now(),
                    lastDate: DateTime.now().add(const Duration(days: 365)),
                  );
                  if (date != null) {
                    setState(() => _selectedDate = date);
                  }
                },
              ),

              // Time Selection
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.access_time),
                title: Text('Time: ${_selectedTime.format(context)}'),
                onTap: () async {
                  final time = await showTimePicker(
                    context: context,
                    initialTime: _selectedTime,
                  );
                  if (time != null) {
                    setState(() => _selectedTime = time);
                  }
                },
              ),

              // Virtual Appointment Toggle
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text('Virtual Appointment'),
                value: _isVirtual,
                onChanged: (value) {
                  setState(() => _isVirtual = value);
                },
              ),

              // Description
              TextFormField(
                decoration: const InputDecoration(
                  labelText: 'Description (optional)',
                ),
                maxLines: 2,
                onChanged: (value) => _description = value,
              ),
              const SizedBox(height: 24),

              // Buttons
              Row(
                children: [
                  Expanded(
                    child: TextButton(
                      onPressed: () => Navigator.of(context).pop(),
                      child: const Text('Cancel'),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: _isLoading ? null : _bookAppointment,
                      child: _isLoading
                          ? const SizedBox(
                              height: 16,
                              width: 16,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: Colors.white,
                              ),
                            )
                          : const Text('Book Appointment'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}