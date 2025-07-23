import 'package:flutter/material.dart';
import '../../services/api_service.dart';
import '../../theme/app_theme.dart';
import '../../utils/app_colors.dart';

class PatientsScreen extends StatefulWidget {
  const PatientsScreen({super.key});

  @override
  State<PatientsScreen> createState() => _PatientsScreenState();
}

class _PatientsScreenState extends State<PatientsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';
  bool _isLoading = true;
  List<Map<String, dynamic>> _patients = [];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadPatients();
  }

  Future<void> _loadPatients() async {
    try {
      final patients = await ApiService.getDoctorPatients();
      setState(() {
        _patients = List<Map<String, dynamic>>.from(patients);
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to load patients: $e'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    }
  }

  List<Map<String, dynamic>> get _allPatients => _patients;
  List<Map<String, dynamic>> get _recentPatients =>
      _patients.where((p) => p['lastVisit'] != null).take(10).toList();
  List<Map<String, dynamic>> get _criticalPatients =>
      _patients.where((p) => p['status'] == 'critical' || p['priority'] == 'high').toList();

  List<Map<String, dynamic>> get _filteredPatients {
    final patients = _tabController.index == 0
        ? _allPatients
        : _tabController.index == 1
            ? _recentPatients
            : _criticalPatients;

    if (_searchQuery.isEmpty) return patients;

    return patients.where((p) {
      final name = '${p['firstName']} ${p['lastName']}'.toLowerCase();
      final patientId = p['patientId']?.toString().toLowerCase() ?? '';
      final query = _searchQuery.toLowerCase();
      return name.contains(query) || patientId.contains(query);
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Patients'),
        backgroundColor: Colors.white,
        foregroundColor: AppColors.textPrimary,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: _showAddPatientDialog,
          ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(98),
          child: Container(
            color: Colors.white,
            child: Column(
              children: [
                // Search Bar
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: TextField(
                    controller: _searchController,
                    decoration: InputDecoration(
                      hintText: 'Search patients...',
                      prefixIcon: const Icon(Icons.search),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide(color: AppColors.border),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide(color: AppColors.border),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide(color: AppColors.primary),
                      ),
                    ),
                    onChanged: (value) {
                      setState(() {
                        _searchQuery = value;
                      });
                    },
                  ),
                ),
                // Tabs
                TabBar(
                  controller: _tabController,
                  labelColor: AppColors.primary,
                  unselectedLabelColor: AppColors.textSecondary,
                  indicatorColor: AppColors.primary,
                  tabs: [
                    Tab(text: 'All (${_allPatients.length})'),
                    Tab(text: 'Recent (${_recentPatients.length})'),
                    Tab(text: 'Critical (${_criticalPatients.length})'),
                  ],
                ),
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
                _buildPatientsList('No patients found'),
                _buildPatientsList('No recent patients'),
                _buildPatientsList('No critical patients'),
              ],
            ),
      floatingActionButton: FloatingActionButton(
        onPressed: _showAddPatientDialog,
        backgroundColor: AppColors.primary,
        child: const Icon(Icons.add),
      ),
    );
  }

  Widget _buildPatientsList(String emptyMessage) {
    final patients = _filteredPatients;

    if (patients.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.people_outline,
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
      onRefresh: _loadPatients,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: patients.length,
        itemBuilder: (context, index) {
          final patient = patients[index];
          return _buildPatientCard(patient);
        },
      ),
    );
  }

  Widget _buildPatientCard(Map<String, dynamic> patient) {
    final status = patient['status'] ?? 'stable';
    final statusColor = _getStatusColor(status);
    final age = patient['age'] ?? 0;
    final lastVisit = patient['lastVisit'] != null
        ? DateTime.parse(patient['lastVisit'])
        : null;

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
      ),
      child: InkWell(
        onTap: () => _showPatientDetails(patient),
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Row(
                children: [
                  CircleAvatar(
                    radius: 25,
                    backgroundColor: statusColor.withOpacity(0.1),
                    child: Text(
                      '${patient['firstName']?[0] ?? ''}${patient['lastName']?[0] ?? ''}',
                      style: TextStyle(
                        color: statusColor,
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                      ),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '${patient['firstName'] ?? ''} ${patient['lastName'] ?? ''}',
                          style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 16,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'ID: ${patient['patientId'] ?? 'N/A'} • Age: $age',
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

              // Patient Info
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.background,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(Icons.phone, size: 16, color: AppColors.textSecondary),
                        const SizedBox(width: 8),
                        Text(
                          patient['phone'] ?? 'No phone',
                          style: TextStyle(
                            color: AppColors.textSecondary,
                            fontSize: 12,
                          ),
                        ),
                        const Spacer(),
                        Icon(Icons.email, size: 16, color: AppColors.textSecondary),
                        const SizedBox(width: 8),
                        Flexible(
                          child: Text(
                            patient['email'] ?? 'No email',
                            style: TextStyle(
                              color: AppColors.textSecondary,
                              fontSize: 12,
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                    if (patient['diagnosis'] != null) ...[
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          Icon(Icons.medical_services, size: 16, color: AppColors.textSecondary),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              patient['diagnosis'],
                              style: TextStyle(
                                color: AppColors.textSecondary,
                                fontSize: 12,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),

              const SizedBox(height: 12),

              // Last Visit & Next Appointment
              Row(
                children: [
                  if (lastVisit != null) ...[
                    Icon(Icons.access_time, size: 16, color: AppColors.textSecondary),
                    const SizedBox(width: 4),
                    Text(
                      'Last visit: ${_formatDate(lastVisit)}',
                      style: TextStyle(
                        color: AppColors.textSecondary,
                        fontSize: 12,
                      ),
                    ),
                  ],
                  const Spacer(),
                  if (patient['nextAppointment'] != null) ...[
                    Icon(Icons.schedule, size: 16, color: AppColors.primary),
                    const SizedBox(width: 4),
                    Text(
                      'Next: ${_formatDate(DateTime.parse(patient['nextAppointment']))}',
                      style: TextStyle(
                        color: AppColors.primary,
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ],
              ),

              const SizedBox(height: 12),

              // Action Buttons
              Row(
                children: [
                  _buildActionButton(
                    'View',
                    Icons.visibility,
                    AppColors.primary,
                    () => _showPatientDetails(patient),
                  ),
                  const SizedBox(width: 8),
                  _buildActionButton(
                    'Message',
                    Icons.message,
                    AppColors.success,
                    () => _messagePatient(patient),
                  ),
                  const SizedBox(width: 8),
                  _buildActionButton(
                    'Call',
                    Icons.phone,
                    Colors.orange,
                    () => _callPatient(patient),
                  ),
                  const SizedBox(width: 8),
                  _buildActionButton(
                    'Schedule',
                    Icons.calendar_today,
                    AppColors.textSecondary,
                    () => _scheduleAppointment(patient),
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
    return Expanded(
      child: ElevatedButton.icon(
        onPressed: onPressed,
        icon: Icon(icon, size: 14),
        label: Text(label),
        style: ElevatedButton.styleFrom(
          backgroundColor: color.withOpacity(0.1),
          foregroundColor: color,
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
          minimumSize: Size.zero,
          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(8),
          ),
          textStyle: const TextStyle(fontSize: 11),
        ),
      ),
    );
  }

  void _showAddPatientDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Add New Patient'),
        content: const Text('Patient registration feature will be available soon.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  void _showPatientDetails(Map<String, dynamic> patient) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.8,
        maxChildSize: 0.95,
        minChildSize: 0.6,
        builder: (context, scrollController) => Container(
          padding: const EdgeInsets.all(24),
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Row(
                children: [
                  CircleAvatar(
                    radius: 30,
                    backgroundColor: AppColors.primary.withOpacity(0.1),
                    child: Text(
                      '${patient['firstName']?[0] ?? ''}${patient['lastName']?[0] ?? ''}',
                      style: TextStyle(
                        color: AppColors.primary,
                        fontWeight: FontWeight.bold,
                        fontSize: 20,
                      ),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '${patient['firstName'] ?? ''} ${patient['lastName'] ?? ''}',
                          style: const TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        Text(
                          'Patient ID: ${patient['patientId'] ?? 'N/A'}',
                          style: TextStyle(
                            color: AppColors.textSecondary,
                            fontSize: 14,
                          ),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    onPressed: () => Navigator.pop(context),
                    icon: const Icon(Icons.close),
                  ),
                ],
              ),
              
              const SizedBox(height: 24),
              
              // Details
              Expanded(
                child: SingleChildScrollView(
                  controller: scrollController,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _buildDetailSection('Personal Information', [
                        _buildDetailItem('Age', patient['age']?.toString()),
                        _buildDetailItem('Gender', patient['gender']),
                        _buildDetailItem('Phone', patient['phone']),
                        _buildDetailItem('Email', patient['email']),
                      ]),
                      
                      const SizedBox(height: 16),
                      
                      _buildDetailSection('Medical Information', [
                        _buildDetailItem('Blood Type', patient['bloodType']),
                        _buildDetailItem('Allergies', patient['allergies']),
                        _buildDetailItem('Current Diagnosis', patient['diagnosis']),
                        _buildDetailItem('Status', patient['status']),
                      ]),
                      
                      const SizedBox(height: 16),
                      
                      if (patient['emergencyContact'] != null)
                        _buildDetailSection('Emergency Contact', [
                          _buildDetailItem('Name', patient['emergencyContact']['name']),
                          _buildDetailItem('Relationship', patient['emergencyContact']['relationship']),
                          _buildDetailItem('Phone', patient['emergencyContact']['phone']),
                        ]),
                    ],
                  ),
                ),
              ),
              
              // Action Buttons
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () {
                        Navigator.pop(context);
                        _editPatient(patient);
                      },
                      icon: const Icon(Icons.edit),
                      label: const Text('Edit'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () {
                        Navigator.pop(context);
                        _viewMedicalHistory(patient);
                      },
                      icon: const Icon(Icons.history),
                      label: const Text('History'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                      ),
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

  Widget _buildDetailSection(String title, List<Widget> children) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 8),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: AppColors.background,
            borderRadius: BorderRadius.circular(8),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: children,
          ),
        ),
      ],
    );
  }

  Widget _buildDetailItem(String label, String? value) {
    if (value == null) return const SizedBox.shrink();
    
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 100,
            child: Text(
              '$label:',
              style: TextStyle(
                color: AppColors.textSecondary,
                fontSize: 14,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _messagePatient(Map<String, dynamic> patient) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Opening chat with ${patient['firstName']} ${patient['lastName']}'),
        backgroundColor: AppColors.success,
      ),
    );
  }

  void _callPatient(Map<String, dynamic> patient) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Calling ${patient['firstName']} ${patient['lastName']}...'),
        backgroundColor: Colors.orange,
      ),
    );
  }

  void _scheduleAppointment(Map<String, dynamic> patient) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Schedule appointment feature coming soon')),
    );
  }

  void _editPatient(Map<String, dynamic> patient) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Edit patient feature coming soon')),
    );
  }

  void _viewMedicalHistory(Map<String, dynamic> patient) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Medical history feature coming soon')),
    );
  }

  Color _getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'stable':
        return AppColors.success;
      case 'critical':
        return AppColors.error;
      case 'under_observation':
        return Colors.orange;
      case 'discharged':
        return AppColors.textSecondary;
      default:
        return AppColors.primary;
    }
  }

  String _formatDate(DateTime date) {
    return '${date.day}/${date.month}/${date.year}';
  }

  @override
  void dispose() {
    _tabController.dispose();
    _searchController.dispose();
    super.dispose();
  }
}