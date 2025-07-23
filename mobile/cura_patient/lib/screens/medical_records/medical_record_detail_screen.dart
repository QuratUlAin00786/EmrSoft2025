import 'package:flutter/material.dart';
import '../../services/api_service.dart';
import '../../theme/app_theme.dart';
import '../../utils/app_colors.dart';

class MedicalRecordDetailScreen extends StatefulWidget {
  final int recordId;
  final String? recordTitle;

  const MedicalRecordDetailScreen({
    super.key,
    required this.recordId,
    this.recordTitle,
  });

  @override
  State<MedicalRecordDetailScreen> createState() => _MedicalRecordDetailScreenState();
}

class _MedicalRecordDetailScreenState extends State<MedicalRecordDetailScreen> {
  Map<String, dynamic>? _recordData;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadRecordDetail();
  }

  Future<void> _loadRecordDetail() async {
    try {
      final data = await ApiService.getMedicalRecordDetail(widget.recordId);
      setState(() {
        _recordData = data;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to load record details: $e'),
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
        title: Text(widget.recordTitle ?? 'Medical Record'),
        backgroundColor: Colors.white,
        foregroundColor: AppColors.textPrimary,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.share),
            onPressed: _shareRecord,
          ),
          IconButton(
            icon: const Icon(Icons.download),
            onPressed: _downloadRecord,
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
          : _recordData != null
              ? _buildRecordDetail()
              : _buildErrorState(),
    );
  }

  Widget _buildRecordDetail() {
    final record = _recordData!;
    final date = DateTime.parse(record['createdAt']);

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
                        color: AppColors.primary.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Icon(
                        _getRecordIcon(record['type']),
                        color: AppColors.primary,
                        size: 24,
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            record['title'] ?? 'Medical Record',
                            style: const TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            '${_formatDate(date)} • ${record['doctorName'] ?? 'Unknown Doctor'}',
                            style: TextStyle(
                              color: AppColors.textSecondary,
                              fontSize: 14,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                if (record['diagnosis'] != null) ...[
                  const SizedBox(height: 16),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppColors.success.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: AppColors.success.withOpacity(0.3)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Diagnosis',
                          style: TextStyle(
                            color: AppColors.success,
                            fontWeight: FontWeight.bold,
                            fontSize: 12,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          record['diagnosis'],
                          style: const TextStyle(
                            fontWeight: FontWeight.w600,
                            fontSize: 14,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),

          const SizedBox(height: 16),

          // Vital Signs
          if (record['vitalSigns'] != null)
            _buildVitalSignsCard(record['vitalSigns']),

          const SizedBox(height: 16),

          // Symptoms & Complaints
          if (record['symptoms'] != null || record['complaints'] != null)
            _buildSymptomsCard(record),

          const SizedBox(height: 16),

          // Clinical Notes
          if (record['clinicalNotes'] != null)
            _buildClinicalNotesCard(record['clinicalNotes']),

          const SizedBox(height: 16),

          // Treatment Plan
          if (record['treatmentPlan'] != null)
            _buildTreatmentPlanCard(record['treatmentPlan']),

          const SizedBox(height: 16),

          // Medications
          if (record['medications'] != null && record['medications'].isNotEmpty)
            _buildMedicationsCard(record['medications']),

          const SizedBox(height: 16),

          // Lab Orders
          if (record['labOrders'] != null && record['labOrders'].isNotEmpty)
            _buildLabOrdersCard(record['labOrders']),

          const SizedBox(height: 16),

          // Follow-up Instructions
          if (record['followUpInstructions'] != null)
            _buildFollowUpCard(record['followUpInstructions']),

          const SizedBox(height: 16),

          // Attachments
          if (record['attachments'] != null && record['attachments'].isNotEmpty)
            _buildAttachmentsCard(record['attachments']),

          const SizedBox(height: 32),
        ],
      ),
    );
  }

  Widget _buildVitalSignsCard(Map<String, dynamic> vitalSigns) {
    return _buildSectionCard(
      'Vital Signs',
      Icons.favorite,
      [
        Row(
          children: [
            Expanded(
              child: _buildVitalItem('Blood Pressure', '${vitalSigns['systolic']}/${vitalSigns['diastolic']} mmHg'),
            ),
            Expanded(
              child: _buildVitalItem('Heart Rate', '${vitalSigns['heartRate']} bpm'),
            ),
          ],
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            Expanded(
              child: _buildVitalItem('Temperature', '${vitalSigns['temperature']}°F'),
            ),
            Expanded(
              child: _buildVitalItem('Oxygen Sat', '${vitalSigns['oxygenSaturation']}%'),
            ),
          ],
        ),
        if (vitalSigns['weight'] != null || vitalSigns['height'] != null) ...[
          const SizedBox(height: 8),
          Row(
            children: [
              if (vitalSigns['weight'] != null)
                Expanded(
                  child: _buildVitalItem('Weight', '${vitalSigns['weight']} kg'),
                ),
              if (vitalSigns['height'] != null)
                Expanded(
                  child: _buildVitalItem('Height', '${vitalSigns['height']} cm'),
                ),
            ],
          ),
        ],
      ],
    );
  }

  Widget _buildVitalItem(String label, String value) {
    return Container(
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: AppColors.background,
        borderRadius: BorderRadius.circular(6),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: TextStyle(
              color: AppColors.textSecondary,
              fontSize: 12,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            value,
            style: const TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 14,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSymptomsCard(Map<String, dynamic> record) {
    return _buildSectionCard(
      'Symptoms & Complaints',
      Icons.healing,
      [
        if (record['symptoms'] != null) ...[
          const Text(
            'Primary Symptoms:',
            style: TextStyle(
              fontWeight: FontWeight.w600,
              fontSize: 14,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            record['symptoms'],
            style: const TextStyle(fontSize: 14),
          ),
        ],
        if (record['complaints'] != null) ...[
          const SizedBox(height: 12),
          const Text(
            'Patient Complaints:',
            style: TextStyle(
              fontWeight: FontWeight.w600,
              fontSize: 14,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            record['complaints'],
            style: const TextStyle(fontSize: 14),
          ),
        ],
      ],
    );
  }

  Widget _buildClinicalNotesCard(String clinicalNotes) {
    return _buildSectionCard(
      'Clinical Notes',
      Icons.notes,
      [
        Text(
          clinicalNotes,
          style: const TextStyle(
            fontSize: 14,
            height: 1.5,
          ),
        ),
      ],
    );
  }

  Widget _buildTreatmentPlanCard(String treatmentPlan) {
    return _buildSectionCard(
      'Treatment Plan',
      Icons.medical_services,
      [
        Text(
          treatmentPlan,
          style: const TextStyle(
            fontSize: 14,
            height: 1.5,
          ),
        ),
      ],
    );
  }

  Widget _buildMedicationsCard(List<dynamic> medications) {
    return _buildSectionCard(
      'Prescribed Medications',
      Icons.medication,
      medications.map<Widget>((medication) {
        return Container(
          margin: const EdgeInsets.only(bottom: 8),
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: AppColors.background,
            borderRadius: BorderRadius.circular(8),
          ),
          child: Row(
            children: [
              Container(
                width: 8,
                height: 8,
                decoration: BoxDecoration(
                  color: AppColors.primary,
                  borderRadius: BorderRadius.circular(4),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      medication['name'] ?? 'Unknown Medication',
                      style: const TextStyle(
                        fontWeight: FontWeight.w600,
                        fontSize: 14,
                      ),
                    ),
                    Text(
                      '${medication['dosage']} • ${medication['frequency']}',
                      style: TextStyle(
                        color: AppColors.textSecondary,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      }).toList(),
    );
  }

  Widget _buildLabOrdersCard(List<dynamic> labOrders) {
    return _buildSectionCard(
      'Lab Orders',
      Icons.science,
      labOrders.map<Widget>((order) {
        return Container(
          margin: const EdgeInsets.only(bottom: 8),
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Colors.purple.withOpacity(0.05),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: Colors.purple.withOpacity(0.2)),
          ),
          child: Row(
            children: [
              Icon(
                Icons.science,
                color: Colors.purple,
                size: 16,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      order['testName'] ?? 'Lab Test',
                      style: const TextStyle(
                        fontWeight: FontWeight.w600,
                        fontSize: 14,
                      ),
                    ),
                    if (order['instructions'] != null)
                      Text(
                        order['instructions'],
                        style: TextStyle(
                          color: AppColors.textSecondary,
                          fontSize: 12,
                        ),
                      ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.orange.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  order['status'] ?? 'Pending',
                  style: TextStyle(
                    color: Colors.orange,
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
        );
      }).toList(),
    );
  }

  Widget _buildFollowUpCard(String followUpInstructions) {
    return _buildSectionCard(
      'Follow-up Instructions',
      Icons.schedule,
      [
        Text(
          followUpInstructions,
          style: const TextStyle(
            fontSize: 14,
            height: 1.5,
          ),
        ),
      ],
    );
  }

  Widget _buildAttachmentsCard(List<dynamic> attachments) {
    return _buildSectionCard(
      'Attachments',
      Icons.attach_file,
      attachments.map<Widget>((attachment) {
        return InkWell(
          onTap: () => _viewAttachment(attachment),
          child: Container(
            margin: const EdgeInsets.only(bottom: 8),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.background,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: AppColors.border),
            ),
            child: Row(
              children: [
                Icon(
                  _getAttachmentIcon(attachment['type']),
                  color: AppColors.primary,
                  size: 20,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        attachment['name'] ?? 'Attachment',
                        style: const TextStyle(
                          fontWeight: FontWeight.w600,
                          fontSize: 14,
                        ),
                      ),
                      Text(
                        '${attachment['size'] ?? 'Unknown size'} • ${attachment['type'] ?? 'Unknown type'}',
                        style: TextStyle(
                          color: AppColors.textSecondary,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ),
                Icon(
                  Icons.chevron_right,
                  color: AppColors.textSecondary,
                ),
              ],
            ),
          ),
        );
      }).toList(),
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
            'Failed to load record details',
            style: TextStyle(
              fontSize: 16,
              color: AppColors.error,
            ),
          ),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: _loadRecordDetail,
            child: const Text('Retry'),
          ),
        ],
      ),
    );
  }

  IconData _getRecordIcon(String? type) {
    switch (type?.toLowerCase()) {
      case 'consultation':
        return Icons.medical_services;
      case 'lab_result':
        return Icons.science;
      case 'imaging':
        return Icons.camera_alt;
      case 'prescription':
        return Icons.medication;
      case 'surgery':
        return Icons.local_hospital;
      default:
        return Icons.folder;
    }
  }

  IconData _getAttachmentIcon(String? type) {
    switch (type?.toLowerCase()) {
      case 'pdf':
        return Icons.picture_as_pdf;
      case 'image':
        return Icons.image;
      case 'document':
        return Icons.description;
      default:
        return Icons.attach_file;
    }
  }

  String _formatDate(DateTime date) {
    return '${date.day}/${date.month}/${date.year}';
  }

  void _shareRecord() {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Share feature coming soon')),
    );
  }

  void _downloadRecord() {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: const Text('Downloading medical record...'),
        backgroundColor: AppColors.success,
      ),
    );
  }

  void _viewAttachment(Map<String, dynamic> attachment) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Opening ${attachment['name']}...'),
      ),
    );
  }
}