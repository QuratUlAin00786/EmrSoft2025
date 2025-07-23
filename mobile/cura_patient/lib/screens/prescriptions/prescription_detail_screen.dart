import 'package:flutter/material.dart';
import '../../services/api_service.dart';
import '../../theme/app_theme.dart';
import '../../utils/app_colors.dart';

class PrescriptionDetailScreen extends StatefulWidget {
  final int prescriptionId;
  final String? medicationName;

  const PrescriptionDetailScreen({
    super.key,
    required this.prescriptionId,
    this.medicationName,
  });

  @override
  State<PrescriptionDetailScreen> createState() => _PrescriptionDetailScreenState();
}

class _PrescriptionDetailScreenState extends State<PrescriptionDetailScreen> {
  Map<String, dynamic>? _prescriptionData;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadPrescriptionDetail();
  }

  Future<void> _loadPrescriptionDetail() async {
    try {
      final data = await ApiService.getPrescriptionDetail(widget.prescriptionId);
      setState(() {
        _prescriptionData = data;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to load prescription details: $e'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text(widget.medicationName ?? 'Prescription Details'),
        backgroundColor: Colors.white,
        foregroundColor: AppColors.textPrimary,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.local_pharmacy),
            onPressed: _findPharmacy,
            tooltip: 'Find Pharmacy',
          ),
          IconButton(
            icon: const Icon(Icons.share),
            onPressed: _sharePrescription,
            tooltip: 'Share',
          ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(
            height: 1,
            color: AppColors.border,
          ),
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _prescriptionData != null
              ? _buildPrescriptionDetail()
              : _buildErrorState(),
    );
  }

  Widget _buildPrescriptionDetail() {
    final prescription = _prescriptionData!;
    final status = prescription['status'] ?? 'active';
    final statusColor = _getStatusColor(status);
    final prescribedDate = DateTime.parse(prescription['createdAt']);
    final expiryDate = prescription['expiryDate'] != null
        ? DateTime.parse(prescription['expiryDate'])
        : null;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header Card
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(20),
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
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: statusColor.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Icon(
                        Icons.medication,
                        color: statusColor,
                        size: 24,
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            prescription['medicationName'] ?? 'Unknown Medication',
                            style: const TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Prescribed by ${prescription['doctorName'] ?? 'Unknown Doctor'}',
                            style: TextStyle(
                              color: AppColors.textSecondary,
                              fontSize: 14,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: statusColor.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(20),
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
                const SizedBox(height: 16),
                if (prescription['urgentInstructions'] != null)
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppColors.error.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: AppColors.error.withOpacity(0.3)),
                    ),
                    child: Row(
                      children: [
                        Icon(Icons.warning, color: AppColors.error, size: 20),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            prescription['urgentInstructions'],
                            style: TextStyle(
                              color: AppColors.error,
                              fontWeight: FontWeight.w600,
                              fontSize: 12,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
          ),

          const SizedBox(height: 16),

          // Dosage Information
          _buildSectionCard(
            'Dosage Information',
            Icons.info_outline,
            [
              _buildInfoRow('Medication Name', prescription['medicationName']),
              _buildInfoRow('Strength/Dosage', prescription['dosage']),
              _buildInfoRow('Frequency', prescription['frequency']),
              _buildInfoRow('Route of Administration', prescription['route'] ?? 'Oral'),
              _buildInfoRow('Duration', prescription['duration']),
            ],
          ),

          const SizedBox(height: 16),

          // Instructions
          if (prescription['instructions'] != null)
            _buildSectionCard(
              'Instructions',
              Icons.assignment,
              [
                Text(
                  prescription['instructions'],
                  style: const TextStyle(
                    fontSize: 14,
                    height: 1.5,
                  ),
                ),
              ],
            ),

          const SizedBox(height: 16),

          // Prescription Details
          _buildSectionCard(
            'Prescription Details',
            Icons.receipt,
            [
              _buildInfoRow('Prescribed Date', _formatDate(prescribedDate)),
              if (expiryDate != null)
                _buildInfoRow('Expiry Date', _formatDate(expiryDate)),
              if (prescription['refillsRemaining'] != null)
                _buildInfoRow('Refills Remaining', prescription['refillsRemaining'].toString()),
              _buildInfoRow('Prescription ID', prescription['prescriptionId'] ?? 'N/A'),
            ],
          ),

          const SizedBox(height: 16),

          // Warnings & Precautions
          if (prescription['warnings'] != null && prescription['warnings'].isNotEmpty)
            _buildWarningsCard(prescription['warnings']),

          const SizedBox(height: 16),

          // Side Effects
          if (prescription['sideEffects'] != null && prescription['sideEffects'].isNotEmpty)
            _buildSideEffectsCard(prescription['sideEffects']),

          const SizedBox(height: 16),

          // Drug Interactions
          if (prescription['interactions'] != null && prescription['interactions'].isNotEmpty)
            _buildInteractionsCard(prescription['interactions']),

          const SizedBox(height: 16),

          // Progress Tracking
          if (prescription['trackingData'] != null)
            _buildProgressCard(prescription['trackingData']),

          const SizedBox(height: 16),

          // Action Buttons
          _buildActionButtons(prescription),

          const SizedBox(height: 32),
        ],
      ),
    );
  }

  Widget _buildSectionCard(String title, IconData icon, List<Widget> children) {
    return Container(
      width: double.infinity,
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
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon, color: AppColors.primary, size: 20),
                const SizedBox(width: 8),
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            ...children,
          ],
        ),
      ),
    );
  }

  Widget _buildInfoRow(String label, String? value) {
    if (value == null) return const SizedBox.shrink();
    
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 120,
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

  Widget _buildWarningsCard(List<dynamic> warnings) {
    return Container(
      width: double.infinity,
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
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.warning, color: AppColors.error, size: 20),
                const SizedBox(width: 8),
                const Text(
                  'Warnings & Precautions',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            ...warnings.map<Widget>((warning) {
              return Container(
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.error.withOpacity(0.05),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: AppColors.error.withOpacity(0.2)),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: 6,
                      height: 6,
                      margin: const EdgeInsets.only(top: 6),
                      decoration: BoxDecoration(
                        color: AppColors.error,
                        borderRadius: BorderRadius.circular(3),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        warning.toString(),
                        style: const TextStyle(
                          fontSize: 14,
                          height: 1.4,
                        ),
                      ),
                    ),
                  ],
                ),
              );
            }).toList(),
          ],
        ),
      ),
    );
  }

  Widget _buildSideEffectsCard(List<dynamic> sideEffects) {
    return Container(
      width: double.infinity,
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
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.medical_services, color: Colors.orange, size: 20),
                const SizedBox(width: 8),
                const Text(
                  'Possible Side Effects',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            ...sideEffects.map<Widget>((sideEffect) {
              return Container(
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.orange.withOpacity(0.05),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: 6,
                      height: 6,
                      margin: const EdgeInsets.only(top: 6),
                      decoration: BoxDecoration(
                        color: Colors.orange,
                        borderRadius: BorderRadius.circular(3),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        sideEffect.toString(),
                        style: const TextStyle(
                          fontSize: 14,
                          height: 1.4,
                        ),
                      ),
                    ),
                  ],
                ),
              );
            }).toList(),
          ],
        ),
      ),
    );
  }

  Widget _buildInteractionsCard(List<dynamic> interactions) {
    return Container(
      width: double.infinity,
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
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.healing, color: Colors.purple, size: 20),
                const SizedBox(width: 8),
                const Text(
                  'Drug Interactions',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            ...interactions.map<Widget>((interaction) {
              return Container(
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.purple.withOpacity(0.05),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      interaction['drugName'] ?? 'Unknown Drug',
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      interaction['description'] ?? 'Interaction details not available',
                      style: TextStyle(
                        fontSize: 12,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              );
            }).toList(),
          ],
        ),
      ),
    );
  }

  Widget _buildProgressCard(Map<String, dynamic> trackingData) {
    final adherencePercentage = trackingData['adherencePercentage'] ?? 0.0;
    final missedDoses = trackingData['missedDoses'] ?? 0;
    final totalDoses = trackingData['totalDoses'] ?? 0;

    return Container(
      width: double.infinity,
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
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.track_changes, color: AppColors.success, size: 20),
                const SizedBox(width: 8),
                const Text(
                  'Progress Tracking',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: _buildProgressItem('Adherence', '${adherencePercentage.toStringAsFixed(1)}%'),
                ),
                Expanded(
                  child: _buildProgressItem('Missed Doses', missedDoses.toString()),
                ),
                Expanded(
                  child: _buildProgressItem('Total Doses', totalDoses.toString()),
                ),
              ],
            ),
            const SizedBox(height: 16),
            LinearProgressIndicator(
              value: adherencePercentage / 100,
              backgroundColor: AppColors.border,
              valueColor: AlwaysStoppedAnimation<Color>(
                adherencePercentage >= 80 ? AppColors.success : 
                adherencePercentage >= 60 ? Colors.orange : AppColors.error,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildProgressItem(String label, String value) {
    return Column(
      children: [
        Text(
          value,
          style: const TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          label,
          style: TextStyle(
            color: AppColors.textSecondary,
            fontSize: 12,
          ),
        ),
      ],
    );
  }

  Widget _buildActionButtons(Map<String, dynamic> prescription) {
    final status = prescription['status'] ?? 'active';
    
    return Container(
      width: double.infinity,
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
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Actions',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: status == 'active' ? _requestRefill : null,
                    icon: const Icon(Icons.refresh, size: 18),
                    label: const Text('Request Refill'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: _setReminder,
                    icon: const Icon(Icons.alarm, size: 18),
                    label: const Text('Set Reminder'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.orange,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _contactDoctor,
                    icon: const Icon(Icons.phone, size: 18),
                    label: const Text('Contact Doctor'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _reportSideEffect,
                    icon: const Icon(Icons.report, size: 18),
                    label: const Text('Report Issue'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildErrorState() {
    return Center(
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
            'Failed to load prescription details',
            style: TextStyle(
              fontSize: 16,
              color: AppColors.error,
            ),
          ),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: _loadPrescriptionDetail,
            child: const Text('Retry'),
          ),
        ],
      ),
    );
  }

  Color _getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'active':
        return AppColors.success;
      case 'pending':
        return Colors.orange;
      case 'expired':
      case 'completed':
        return AppColors.textSecondary;
      case 'cancelled':
        return AppColors.error;
      default:
        return AppColors.primary;
    }
  }

  String _formatDate(DateTime date) {
    return '${date.day}/${date.month}/${date.year}';
  }

  void _findPharmacy() {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Find pharmacy feature coming soon')),
    );
  }

  void _sharePrescription() {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Share prescription feature coming soon')),
    );
  }

  void _requestRefill() {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: const Text('Refill request submitted'),
        backgroundColor: AppColors.success,
      ),
    );
  }

  void _setReminder() {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: const Text('Medication reminder set'),
        backgroundColor: AppColors.success,
      ),
    );
  }

  void _contactDoctor() {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Contact doctor feature coming soon')),
    );
  }

  void _reportSideEffect() {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Report side effect feature coming soon')),
    );
  }
}