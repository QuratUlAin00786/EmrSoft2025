import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/patient.dart';
import '../services/api_service.dart';
import '../utils/app_colors.dart';

class PatientDetailScreen extends StatefulWidget {
  final Patient patient;

  const PatientDetailScreen({super.key, required this.patient});

  @override
  State<PatientDetailScreen> createState() => _PatientDetailScreenState();
}

class _PatientDetailScreenState extends State<PatientDetailScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  Map<String, dynamic>? _patientDetails;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    _loadPatientDetails();
  }

  Future<void> _loadPatientDetails() async {
    setState(() => _isLoading = true);
    try {
      final details = await ApiService.getPatientDetails(widget.patient.id);
      setState(() {
        _patientDetails = details;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error loading patient details: $e'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.patient.fullName),
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: 'Overview'),
            Tab(text: 'Records'),
            Tab(text: 'Appointments'),
            Tab(text: 'Prescriptions'),
          ],
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : TabBarView(
              controller: _tabController,
              children: [
                _buildOverviewTab(),
                _buildRecordsTab(),
                _buildAppointmentsTab(),
                _buildPrescriptionsTab(),
              ],
            ),
    );
  }

  Widget _buildOverviewTab() {
    final patient = widget.patient;
    final dateFormat = DateFormat('MMM dd, yyyy');
    
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Patient Header
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 30,
                    backgroundColor: AppColors.primary,
                    child: Text(
                      patient.firstName.substring(0, 1).toUpperCase(),
                      style: const TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          patient.fullName,
                          style: const TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'ID: ${patient.patientId}',
                          style: TextStyle(
                            color: AppColors.textSecondary,
                          ),
                        ),
                        if (patient.age > 0) ...[
                          const SizedBox(height: 4),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(
                              color: AppColors.primaryLight.withOpacity(0.1),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Text(
                              'Age: ${patient.age}',
                              style: TextStyle(
                                color: AppColors.primary,
                                fontSize: 12,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),

          const SizedBox(height: 16),

          // Personal Information
          _buildInfoSection('Personal Information', [
            _buildInfoRow('Email', patient.email),
            if (patient.phone != null) _buildInfoRow('Phone', patient.phone!),
            if (patient.dateOfBirth != null)
              _buildInfoRow('Date of Birth', dateFormat.format(patient.dateOfBirth!)),
            if (patient.gender != null) _buildInfoRow('Gender', patient.gender!),
            if (patient.address != null) _buildInfoRow('Address', patient.address!),
          ]),

          const SizedBox(height: 16),

          // Medical Information
          if (_patientDetails != null) ...[
            _buildInfoSection('Medical Information', [
              _buildInfoRow('Blood Group', _patientDetails!['bloodGroup'] ?? 'Not specified'),
              _buildInfoRow('Allergies', _patientDetails!['allergies'] ?? 'None recorded'),
              _buildInfoRow('Emergency Contact', _patientDetails!['emergencyContact'] ?? 'Not provided'),
              _buildInfoRow('Insurance Provider', _patientDetails!['insuranceProvider'] ?? 'Not specified'),
            ]),

            const SizedBox(height: 16),

            // Recent Activity
            _buildInfoSection('Recent Activity', [
              _buildActivityItem(
                'Last Appointment',
                _patientDetails!['lastAppointment'] ?? 'No recent appointments',
                Icons.calendar_today,
              ),
              _buildActivityItem(
                'Last Prescription',
                _patientDetails!['lastPrescription'] ?? 'No recent prescriptions',
                Icons.medication,
              ),
              _buildActivityItem(
                'Last Visit',
                _patientDetails!['lastVisit'] != null
                    ? dateFormat.format(DateTime.parse(_patientDetails!['lastVisit']))
                    : 'No visits recorded',
                Icons.local_hospital,
              ),
            ]),
          ],
        ],
      ),
    );
  }

  Widget _buildRecordsTab() {
    final records = _patientDetails?['medicalRecords'] as List<dynamic>? ?? [];
    
    if (records.isEmpty) {
      return _buildEmptyState(
        'No medical records found',
        'Medical records will appear here when added',
        Icons.medical_information,
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: records.length,
      itemBuilder: (context, index) {
        final record = records[index];
        return _buildRecordCard(record);
      },
    );
  }

  Widget _buildAppointmentsTab() {
    final appointments = _patientDetails?['appointments'] as List<dynamic>? ?? [];
    
    if (appointments.isEmpty) {
      return _buildEmptyState(
        'No appointments found',
        'Appointments will appear here when scheduled',
        Icons.calendar_today,
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: appointments.length,
      itemBuilder: (context, index) {
        final appointment = appointments[index];
        return _buildAppointmentCard(appointment);
      },
    );
  }

  Widget _buildPrescriptionsTab() {
    final prescriptions = _patientDetails?['prescriptions'] as List<dynamic>? ?? [];
    
    if (prescriptions.isEmpty) {
      return _buildEmptyState(
        'No prescriptions found',
        'Prescriptions will appear here when created',
        Icons.medication,
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: prescriptions.length,
      itemBuilder: (context, index) {
        final prescription = prescriptions[index];
        return _buildPrescriptionCard(prescription);
      },
    );
  }

  Widget _buildInfoSection(String title, List<Widget> children) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 12),
            ...children,
          ],
        ),
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 120,
            child: Text(
              '$label:',
              style: TextStyle(
                color: AppColors.textSecondary,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: TextStyle(
                color: AppColors.textPrimary,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActivityItem(String title, String value, IconData icon) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Icon(icon, size: 16, color: AppColors.textSecondary),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    color: AppColors.textSecondary,
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                Text(
                  value,
                  style: TextStyle(
                    color: AppColors.textPrimary,
                    fontSize: 14,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRecordCard(Map<String, dynamic> record) {
    final dateFormat = DateFormat('MMM dd, yyyy');
    
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              record['title'] ?? 'Medical Record',
              style: const TextStyle(
                fontWeight: FontWeight.w600,
                fontSize: 16,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'Date: ${dateFormat.format(DateTime.parse(record['date']))}',
              style: TextStyle(
                color: AppColors.textSecondary,
                fontSize: 12,
              ),
            ),
            if (record['description'] != null) ...[
              const SizedBox(height: 8),
              Text(
                record['description'],
                style: TextStyle(
                  color: AppColors.textPrimary,
                  fontSize: 14,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildAppointmentCard(Map<String, dynamic> appointment) {
    final dateFormat = DateFormat('MMM dd, yyyy HH:mm');
    
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              appointment['title'] ?? 'Appointment',
              style: const TextStyle(
                fontWeight: FontWeight.w600,
                fontSize: 16,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              dateFormat.format(DateTime.parse(appointment['scheduledAt'])),
              style: TextStyle(
                color: AppColors.textSecondary,
                fontSize: 12,
              ),
            ),
            if (appointment['description'] != null) ...[
              const SizedBox(height: 8),
              Text(
                appointment['description'],
                style: TextStyle(
                  color: AppColors.textPrimary,
                  fontSize: 14,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildPrescriptionCard(Map<String, dynamic> prescription) {
    final dateFormat = DateFormat('MMM dd, yyyy');
    
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              prescription['medicationName'] ?? 'Prescription',
              style: const TextStyle(
                fontWeight: FontWeight.w600,
                fontSize: 16,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'Prescribed: ${dateFormat.format(DateTime.parse(prescription['createdAt']))}',
              style: TextStyle(
                color: AppColors.textSecondary,
                fontSize: 12,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Dosage: ${prescription['dosage']} - ${prescription['frequency']}',
              style: TextStyle(
                color: AppColors.textPrimary,
                fontSize: 14,
              ),
            ),
            if (prescription['instructions'] != null && prescription['instructions'].isNotEmpty) ...[
              const SizedBox(height: 4),
              Text(
                prescription['instructions'],
                style: TextStyle(
                  color: AppColors.textSecondary,
                  fontSize: 12,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState(String title, String subtitle, IconData icon) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            icon,
            size: 64,
            color: AppColors.textLight,
          ),
          const SizedBox(height: 16),
          Text(
            title,
            style: TextStyle(
              fontSize: 18,
              color: AppColors.textSecondary,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            subtitle,
            style: TextStyle(
              color: AppColors.textLight,
            ),
          ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }
}