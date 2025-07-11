import 'package:flutter/material.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import '../services/auth_service.dart';
import '../utils/app_colors.dart';

class MedicalHistoryScreen extends StatefulWidget {
  const MedicalHistoryScreen({super.key});

  @override
  State<MedicalHistoryScreen> createState() => _MedicalHistoryScreenState();
}

class _MedicalHistoryScreenState extends State<MedicalHistoryScreen> {
  List<dynamic> _medicalRecords = [];
  List<dynamic> _labResults = [];
  bool _isLoading = true;
  String _error = '';

  @override
  void initState() {
    super.initState();
    _loadMedicalData();
  }

  Future<void> _loadMedicalData() async {
    try {
      final authService = AuthService();
      final headers = await authService.getAuthHeaders();
      
      // Load medical records
      final recordsResponse = await http.get(
        Uri.parse('${authService._baseUrl}/medical-records'),
        headers: headers,
      );
      
      // Load lab results
      final labResponse = await http.get(
        Uri.parse('${authService._baseUrl}/lab-results'),
        headers: headers,
      );

      if (recordsResponse.statusCode == 200 && labResponse.statusCode == 200) {
        setState(() {
          _medicalRecords = jsonDecode(recordsResponse.body);
          _labResults = jsonDecode(labResponse.body);
          _isLoading = false;
        });
      } else {
        setState(() {
          _error = 'Failed to load medical data';
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Medical History'),
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
                          _loadMedicalData();
                        },
                        child: const Text('Retry'),
                      ),
                    ],
                  ),
                )
              : DefaultTabController(
                  length: 3,
                  child: Column(
                    children: [
                      const TabBar(
                        labelColor: AppColors.primary,
                        unselectedLabelColor: AppColors.textLight,
                        indicatorColor: AppColors.primary,
                        tabs: [
                          Tab(text: 'Records'),
                          Tab(text: 'Lab Results'),
                          Tab(text: 'Reports'),
                        ],
                      ),
                      Expanded(
                        child: TabBarView(
                          children: [
                            _buildMedicalRecords(),
                            _buildLabResults(),
                            _buildReports(),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
    );
  }

  Widget _buildMedicalRecords() {
    if (_medicalRecords.isEmpty) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.description_outlined,
              size: 64,
              color: AppColors.textMuted,
            ),
            SizedBox(height: 16),
            Text(
              'No medical records found',
              style: TextStyle(
                fontSize: 16,
                color: AppColors.textLight,
              ),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _medicalRecords.length,
      itemBuilder: (context, index) {
        final record = _medicalRecords[index];
        return _MedicalRecordCard(record: record);
      },
    );
  }

  Widget _buildLabResults() {
    if (_labResults.isEmpty) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.science_outlined,
              size: 64,
              color: AppColors.textMuted,
            ),
            SizedBox(height: 16),
            Text(
              'No lab results found',
              style: TextStyle(
                fontSize: 16,
                color: AppColors.textLight,
              ),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _labResults.length,
      itemBuilder: (context, index) {
        final result = _labResults[index];
        return _LabResultCard(result: result);
      },
    );
  }

  Widget _buildReports() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _ReportCard(
          title: 'Annual Physical Report',
          date: 'December 15, 2024',
          doctor: 'Dr. Sarah Johnson',
          type: 'Physical Examination',
          status: 'Complete',
        ),
        const SizedBox(height: 12),
        _ReportCard(
          title: 'Cardiology Consultation',
          date: 'November 28, 2024',
          doctor: 'Dr. Michael Chen',
          type: 'Specialist Report',
          status: 'Complete',
        ),
        const SizedBox(height: 12),
        _ReportCard(
          title: 'Blood Work Analysis',
          date: 'October 10, 2024',
          doctor: 'Dr. Emily Davis',
          type: 'Laboratory Report',
          status: 'Complete',
        ),
      ],
    );
  }
}

class _MedicalRecordCard extends StatelessWidget {
  final Map<String, dynamic> record;

  const _MedicalRecordCard({required this.record});

  @override
  Widget build(BuildContext context) {
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
                child: const Icon(
                  Icons.description,
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
                      record['type'] ?? 'Medical Record',
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textDark,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      record['date'] ?? 'Date not available',
                      style: const TextStyle(
                        fontSize: 14,
                        color: AppColors.textLight,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            record['notes'] ?? 'No notes available',
            style: const TextStyle(
              fontSize: 14,
              color: AppColors.textDark,
            ),
          ),
          if (record['provider'] != null) ...[
            const SizedBox(height: 8),
            Text(
              'Provider: ${record['provider']}',
              style: const TextStyle(
                fontSize: 12,
                color: AppColors.textLight,
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _LabResultCard extends StatelessWidget {
  final Map<String, dynamic> result;

  const _LabResultCard({required this.result});

  @override
  Widget build(BuildContext context) {
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
                  color: AppColors.accent.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(
                  Icons.science,
                  color: AppColors.accent,
                  size: 20,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      result['testName'] ?? 'Lab Test',
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textDark,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      result['date'] ?? 'Date not available',
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
                  color: _getStatusColor(result['status']).withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  result['status'] ?? 'Unknown',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                    color: _getStatusColor(result['status']),
                  ),
                ),
              ),
            ],
          ),
          if (result['value'] != null) ...[
            const SizedBox(height: 12),
            Text(
              'Result: ${result['value']} ${result['unit'] ?? ''}',
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w500,
                color: AppColors.textDark,
              ),
            ),
          ],
          if (result['normalRange'] != null) ...[
            const SizedBox(height: 4),
            Text(
              'Normal Range: ${result['normalRange']}',
              style: const TextStyle(
                fontSize: 12,
                color: AppColors.textLight,
              ),
            ),
          ],
        ],
      ),
    );
  }

  Color _getStatusColor(String? status) {
    switch (status?.toLowerCase()) {
      case 'normal':
        return AppColors.accent;
      case 'high':
      case 'low':
        return AppColors.warning;
      case 'critical':
        return AppColors.error;
      default:
        return AppColors.textLight;
    }
  }
}

class _ReportCard extends StatelessWidget {
  final String title;
  final String date;
  final String doctor;
  final String type;
  final String status;

  const _ReportCard({
    required this.title,
    required this.date,
    required this.doctor,
    required this.type,
    required this.status,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
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
                  color: AppColors.secondary.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(
                  Icons.assignment,
                  color: AppColors.secondary,
                  size: 20,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textDark,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      date,
                      style: const TextStyle(
                        fontSize: 14,
                        color: AppColors.textLight,
                      ),
                    ),
                  ],
                ),
              ),
              const Icon(
                Icons.download,
                color: AppColors.primary,
                size: 20,
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Text(
                'Type: $type',
                style: const TextStyle(
                  fontSize: 12,
                  color: AppColors.textLight,
                ),
              ),
              const SizedBox(width: 16),
              Text(
                'Doctor: $doctor',
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
}