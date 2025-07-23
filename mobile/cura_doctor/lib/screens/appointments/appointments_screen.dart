import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/appointment_provider.dart';
import '../../services/api_service.dart';
import '../../theme/app_theme.dart';
import '../../utils/app_colors.dart';

class AppointmentsScreen extends StatefulWidget {
  const AppointmentsScreen({super.key});

  @override
  State<AppointmentsScreen> createState() => _AppointmentsScreenState();
}

class _AppointmentsScreenState extends State<AppointmentsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  bool _isLoading = true;
  List<Map<String, dynamic>> _appointments = [];
  DateTime _selectedDate = DateTime.now();

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadAppointments();
  }

  Future<void> _loadAppointments() async {
    try {
      final appointments = await ApiService.getDoctorAppointments();
      setState(() {
        _appointments = List<Map<String, dynamic>>.from(appointments);
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to load appointments: $e'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    }
  }

  List<Map<String, dynamic>> get _todayAppointments {
    final today = DateTime.now();
    return _appointments.where((apt) {
      final aptDate = DateTime.parse(apt['scheduledAt']);
      return aptDate.year == today.year &&
          aptDate.month == today.month &&
          aptDate.day == today.day;
    }).toList();
  }

  List<Map<String, dynamic>> get _upcomingAppointments {
    final now = DateTime.now();
    return _appointments.where((apt) {
      final aptDate = DateTime.parse(apt['scheduledAt']);
      return aptDate.isAfter(now);
    }).toList();
  }

  List<Map<String, dynamic>> get _pastAppointments {
    final now = DateTime.now();
    return _appointments.where((apt) {
      final aptDate = DateTime.parse(apt['scheduledAt']);
      return aptDate.isBefore(now);
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Appointments'),
        backgroundColor: Colors.white,
        foregroundColor: AppColors.textPrimary,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.calendar_today),
            onPressed: () {
              _showDatePicker();
            },
          ),
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () {
              _showCreateAppointmentDialog();
            },
          ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(49),
          child: Container(
            color: Colors.white,
            child: TabBar(
              controller: _tabController,
              labelColor: AppColors.primary,
              unselectedLabelColor: AppColors.textSecondary,
              indicatorColor: AppColors.primary,
              tabs: [
                Tab(text: 'Today (${_todayAppointments.length})'),
                Tab(text: 'Upcoming (${_upcomingAppointments.length})'),
                Tab(text: 'Past (${_pastAppointments.length})'),
              ],
            ),
          ),
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : TabBarView(
              controller: _tabController,
              children: [
                _buildAppointmentsList(_todayAppointments, 'No appointments today'),
                _buildAppointmentsList(_upcomingAppointments, 'No upcoming appointments'),
                _buildAppointmentsList(_pastAppointments, 'No past appointments'),
              ],
            ),
      floatingActionButton: FloatingActionButton(
        onPressed: _showCreateAppointmentDialog,
        backgroundColor: AppColors.primary,
        child: const Icon(Icons.add),
      ),
    );
  }

  Widget _buildAppointmentsList(List<Map<String, dynamic>> appointments, String emptyMessage) {
    if (appointments.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.calendar_today_outlined,
              size: 64,
              color: AppColors.textSecondary,
            ),
            const SizedBox(height: 16),
            Text(
              emptyMessage,
              style: TextStyle(
                fontSize: 16,
                color: AppColors.textSecondary,
              ),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadAppointments,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: appointments.length,
        itemBuilder: (context, index) {
          final appointment = appointments[index];
          return _buildAppointmentCard(appointment);
        },
      ),
    );
  }

  Widget _buildAppointmentCard(Map<String, dynamic> appointment) {
    final date = DateTime.parse(appointment['scheduledAt']);
    final status = appointment['status'] ?? 'scheduled';
    final statusColor = _getStatusColor(status);
    final isToday = _isToday(date);
    final isPast = date.isBefore(DateTime.now());

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
        border: isToday
            ? Border.all(color: AppColors.primary.withOpacity(0.3), width: 2)
            : null,
      ),
      child: InkWell(
        onTap: () => _showAppointmentDetails(appointment),
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Row(
                children: [
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: statusColor.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Icon(
                      _getAppointmentIcon(appointment['type']),
                      color: statusColor,
                      size: 20,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          appointment['patientName'] ?? 'Unknown Patient',
                          style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 16,
                          ),
                        ),
                        Text(
                          appointment['type'] ?? 'Consultation',
                          style: TextStyle(
                            color: AppColors.textSecondary,
                            fontSize: 14,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: statusColor.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      status.toUpperCase(),
                      style: TextStyle(
                        color: statusColor,
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 12),

              // Time and Date
              Row(
                children: [
                  Icon(
                    Icons.access_time,
                    size: 16,
                    color: AppColors.textSecondary,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    '${_formatTime(date)} • ${_formatDate(date)}',
                    style: TextStyle(
                      color: AppColors.textSecondary,
                      fontSize: 14,
                    ),
                  ),
                  if (isToday) ...[
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: AppColors.primary,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Text(
                        'TODAY',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 8,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ],
                ],
              ),

              // Location/Notes
              if (appointment['location'] != null || appointment['notes'] != null) ...[
                const SizedBox(height: 8),
                if (appointment['location'] != null)
                  Row(
                    children: [
                      Icon(
                        Icons.location_on,
                        size: 16,
                        color: AppColors.textSecondary,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        appointment['location'],
                        style: TextStyle(
                          color: AppColors.textSecondary,
                          fontSize: 14,
                        ),
                      ),
                    ],
                  ),
                if (appointment['notes'] != null) ...[
                  const SizedBox(height: 4),
                  Text(
                    appointment['notes'],
                    style: TextStyle(
                      color: AppColors.textSecondary,
                      fontSize: 12,
                      fontStyle: FontStyle.italic,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ],

              const SizedBox(height: 12),

              // Action Buttons
              Row(
                children: [
                  if (!isPast && status != 'cancelled') ...[
                    _buildActionButton(
                      'Start',
                      Icons.play_arrow,
                      AppColors.success,
                      () => _startAppointment(appointment),
                    ),
                    const SizedBox(width: 8),
                    _buildActionButton(
                      'Reschedule',
                      Icons.schedule,
                      AppColors.primary,
                      () => _rescheduleAppointment(appointment),
                    ),
                    const SizedBox(width: 8),
                  ],
                  if (isPast && status == 'completed') ...[
                    _buildActionButton(
                      'View Notes',
                      Icons.notes,
                      AppColors.primary,
                      () => _viewAppointmentNotes(appointment),
                    ),
                    const SizedBox(width: 8),
                  ],
                  _buildActionButton(
                    'Details',
                    Icons.info_outline,
                    AppColors.textSecondary,
                    () => _showAppointmentDetails(appointment),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildActionButton(String label, IconData icon, Color color, VoidCallback onPressed) {
    return ElevatedButton.icon(
      onPressed: onPressed,
      icon: Icon(icon, size: 16),
      label: Text(label),
      style: ElevatedButton.styleFrom(
        backgroundColor: color.withOpacity(0.1),
        foregroundColor: color,
        elevation: 0,
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        minimumSize: Size.zero,
        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8),
        ),
        textStyle: const TextStyle(fontSize: 12),
      ),
    );
  }

  void _showDatePicker() async {
    final date = await showDatePicker(
      context: context,
      initialDate: _selectedDate,
      firstDate: DateTime(2020),
      lastDate: DateTime(2030),
    );
    if (date != null) {
      setState(() {
        _selectedDate = date;
      });
      // Filter appointments by selected date
      _loadAppointments();
    }
  }

  void _showCreateAppointmentDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Schedule Appointment'),
        content: const Text('Appointment scheduling feature will be available soon.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  void _showAppointmentDetails(Map<String, dynamic> appointment) {
    showModalBottomSheet(
      context: context,
      builder: (context) => Container(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Appointment Details',
              style: const TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            _buildDetailRow('Patient', appointment['patientName']),
            _buildDetailRow('Type', appointment['type']),
            _buildDetailRow('Date', _formatDate(DateTime.parse(appointment['scheduledAt']))),
            _buildDetailRow('Time', _formatTime(DateTime.parse(appointment['scheduledAt']))),
            _buildDetailRow('Status', appointment['status']),
            if (appointment['location'] != null)
              _buildDetailRow('Location', appointment['location']),
            if (appointment['notes'] != null)
              _buildDetailRow('Notes', appointment['notes']),
            const SizedBox(height: 24),
            Row(
              children: [
                Expanded(
                  child: ElevatedButton(
                    onPressed: () {
                      Navigator.pop(context);
                      _editAppointment(appointment);
                    },
                    child: const Text('Edit'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton(
                    onPressed: () {
                      Navigator.pop(context);
                      _cancelAppointment(appointment);
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.error,
                    ),
                    child: const Text('Cancel'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDetailRow(String label, String? value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 80,
            child: Text(
              '$label:',
              style: TextStyle(
                fontWeight: FontWeight.w500,
                color: AppColors.textSecondary,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value ?? 'Not specified',
              style: const TextStyle(fontWeight: FontWeight.w500),
            ),
          ),
        ],
      ),
    );
  }

  void _startAppointment(Map<String, dynamic> appointment) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Starting appointment with ${appointment['patientName']}'),
        backgroundColor: AppColors.success,
      ),
    );
  }

  void _rescheduleAppointment(Map<String, dynamic> appointment) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Reschedule feature coming soon')),
    );
  }

  void _viewAppointmentNotes(Map<String, dynamic> appointment) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('View notes feature coming soon')),
    );
  }

  void _editAppointment(Map<String, dynamic> appointment) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Edit appointment feature coming soon')),
    );
  }

  void _cancelAppointment(Map<String, dynamic> appointment) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Cancel Appointment'),
        content: Text('Are you sure you want to cancel the appointment with ${appointment['patientName']}?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Keep'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Appointment cancelled')),
              );
            },
            child: Text(
              'Cancel',
              style: TextStyle(color: AppColors.error),
            ),
          ),
        ],
      ),
    );
  }

  Color _getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'completed':
        return AppColors.success;
      case 'cancelled':
        return AppColors.error;
      case 'scheduled':
        return AppColors.primary;
      case 'in_progress':
        return Colors.orange;
      default:
        return AppColors.textSecondary;
    }
  }

  IconData _getAppointmentIcon(String? type) {
    switch (type?.toLowerCase()) {
      case 'consultation':
        return Icons.medical_services;
      case 'follow-up':
        return Icons.follow_the_signs;
      case 'emergency':
        return Icons.emergency;
      case 'checkup':
        return Icons.health_and_safety;
      default:
        return Icons.event;
    }
  }

  bool _isToday(DateTime date) {
    final now = DateTime.now();
    return date.year == now.year && date.month == now.month && date.day == now.day;
  }

  String _formatDate(DateTime date) {
    final now = DateTime.now();
    final difference = date.difference(now).inDays;
    
    if (difference == 0) {
      return 'Today';
    } else if (difference == 1) {
      return 'Tomorrow';
    } else if (difference == -1) {
      return 'Yesterday';
    } else {
      return '${date.day}/${date.month}/${date.year}';
    }
  }

  String _formatTime(DateTime date) {
    final hour = date.hour > 12 ? date.hour - 12 : (date.hour == 0 ? 12 : date.hour);
    final period = date.hour >= 12 ? 'PM' : 'AM';
    return '${hour}:${date.minute.toString().padLeft(2, '0')} $period';
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }
}