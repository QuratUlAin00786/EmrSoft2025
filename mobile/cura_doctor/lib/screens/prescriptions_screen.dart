import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../services/api_service.dart';
import '../models/prescription.dart';
import '../models/patient.dart';
import '../utils/app_colors.dart';

class PrescriptionsScreen extends StatefulWidget {
  const PrescriptionsScreen({super.key});

  @override
  State<PrescriptionsScreen> createState() => _PrescriptionsScreenState();
}

class _PrescriptionsScreenState extends State<PrescriptionsScreen> {
  List<Prescription> _prescriptions = [];
  bool _isLoading = true;
  String _selectedFilter = 'all';

  @override
  void initState() {
    super.initState();
    _loadPrescriptions();
  }

  Future<void> _loadPrescriptions() async {
    setState(() => _isLoading = true);
    try {
      final prescriptions = await ApiService.getPrescriptions();
      setState(() {
        _prescriptions = prescriptions;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error loading prescriptions: $e'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    }
  }

  List<Prescription> get _filteredPrescriptions {
    switch (_selectedFilter) {
      case 'active':
        return _prescriptions.where((p) => p.status == 'active').toList();
      case 'completed':
        return _prescriptions.where((p) => p.status == 'completed').toList();
      case 'cancelled':
        return _prescriptions.where((p) => p.status == 'cancelled').toList();
      default:
        return _prescriptions;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Prescriptions'),
        actions: [
          IconButton(
            onPressed: _showCreatePrescriptionDialog,
            icon: const Icon(Icons.add),
          ),
        ],
      ),
      body: Column(
        children: [
          // Filter Tabs
          Container(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Expanded(child: _buildFilterChip('All', 'all')),
                const SizedBox(width: 8),
                Expanded(child: _buildFilterChip('Active', 'active')),
                const SizedBox(width: 8),
                Expanded(child: _buildFilterChip('Completed', 'completed')),
                const SizedBox(width: 8),
                Expanded(child: _buildFilterChip('Cancelled', 'cancelled')),
              ],
            ),
          ),
          
          // Prescriptions List
          Expanded(
            child: RefreshIndicator(
              onRefresh: _loadPrescriptions,
              child: _isLoading
                  ? const Center(child: CircularProgressIndicator())
                  : _filteredPrescriptions.isEmpty
                      ? _buildEmptyState()
                      : ListView.builder(
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          itemCount: _filteredPrescriptions.length,
                          itemBuilder: (context, index) {
                            final prescription = _filteredPrescriptions[index];
                            return _buildPrescriptionCard(prescription);
                          },
                        ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChip(String label, String value) {
    final isSelected = _selectedFilter == value;
    return GestureDetector(
      onTap: () => setState(() => _selectedFilter = value),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 12),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.primary : AppColors.surfaceVariant,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? AppColors.primary : AppColors.border,
          ),
        ),
        child: Text(
          label,
          textAlign: TextAlign.center,
          style: TextStyle(
            color: isSelected ? Colors.white : AppColors.textSecondary,
            fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
            fontSize: 12,
          ),
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.medication_outlined,
            size: 64,
            color: AppColors.textLight,
          ),
          const SizedBox(height: 16),
          Text(
            'No prescriptions found',
            style: TextStyle(
              fontSize: 18,
              color: AppColors.textSecondary,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Create prescriptions for your patients',
            style: TextStyle(
              color: AppColors.textLight,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPrescriptionCard(Prescription prescription) {
    final dateFormat = DateFormat('MMM dd, yyyy');
    
    Color statusColor = AppColors.textSecondary;
    switch (prescription.status.toLowerCase()) {
      case 'active':
        statusColor = AppColors.success;
        break;
      case 'completed':
        statusColor = AppColors.primary;
        break;
      case 'cancelled':
        statusColor = AppColors.error;
        break;
      case 'expired':
        statusColor = AppColors.warning;
        break;
    }

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    prescription.medicationName,
                    style: const TextStyle(
                      fontWeight: FontWeight.w600,
                      fontSize: 16,
                    ),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: statusColor.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    prescription.statusDisplay,
                    style: TextStyle(
                      color: statusColor,
                      fontSize: 11,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
              ],
            ),
            
            const SizedBox(height: 8),
            
            Row(
              children: [
                Icon(Icons.person, size: 16, color: AppColors.textSecondary),
                const SizedBox(width: 4),
                Text(
                  prescription.patientName ?? 'Patient ID: ${prescription.patientId}',
                  style: TextStyle(
                    color: AppColors.textSecondary,
                    fontSize: 14,
                  ),
                ),
              ],
            ),
            
            const SizedBox(height: 4),
            
            Row(
              children: [
                Icon(Icons.schedule, size: 16, color: AppColors.textSecondary),
                const SizedBox(width: 4),
                Text(
                  'Created: ${dateFormat.format(prescription.createdAt)}',
                  style: TextStyle(
                    color: AppColors.textSecondary,
                    fontSize: 14,
                  ),
                ),
              ],
            ),
            
            const SizedBox(height: 12),
            
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.surfaceVariant,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildDetailRow('Dosage', prescription.dosage),
                  _buildDetailRow('Frequency', prescription.frequency),
                  _buildDetailRow('Duration', prescription.duration),
                  if (prescription.instructions.isNotEmpty)
                    _buildDetailRow('Instructions', prescription.instructions),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 80,
            child: Text(
              '$label:',
              style: TextStyle(
                color: AppColors.textSecondary,
                fontSize: 12,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: TextStyle(
                color: AppColors.textPrimary,
                fontSize: 12,
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _showCreatePrescriptionDialog() {
    showDialog(
      context: context,
      builder: (context) => const CreatePrescriptionDialog(),
    ).then((_) => _loadPrescriptions());
  }
}

class CreatePrescriptionDialog extends StatefulWidget {
  const CreatePrescriptionDialog({super.key});

  @override
  State<CreatePrescriptionDialog> createState() => _CreatePrescriptionDialogState();
}

class _CreatePrescriptionDialogState extends State<CreatePrescriptionDialog> {
  final _formKey = GlobalKey<FormState>();
  final _medicationController = TextEditingController();
  final _dosageController = TextEditingController();
  final _frequencyController = TextEditingController();
  final _durationController = TextEditingController();
  final _instructionsController = TextEditingController();
  
  List<Patient> _patients = [];
  Patient? _selectedPatient;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _loadPatients();
  }

  Future<void> _loadPatients() async {
    try {
      final patients = await ApiService.getPatients();
      setState(() {
        _patients = patients;
      });
    } catch (e) {
      // Handle error silently
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Create Prescription'),
      content: SizedBox(
        width: double.maxFinite,
        child: Form(
          key: _formKey,
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                DropdownButtonFormField<Patient>(
                  value: _selectedPatient,
                  decoration: const InputDecoration(
                    labelText: 'Patient',
                    border: OutlineInputBorder(),
                  ),
                  items: _patients.map((patient) {
                    return DropdownMenuItem(
                      value: patient,
                      child: Text(patient.fullName),
                    );
                  }).toList(),
                  onChanged: (patient) => setState(() => _selectedPatient = patient),
                  validator: (value) => value == null ? 'Please select a patient' : null,
                ),
                
                const SizedBox(height: 16),
                
                TextFormField(
                  controller: _medicationController,
                  decoration: const InputDecoration(
                    labelText: 'Medication Name',
                    border: OutlineInputBorder(),
                  ),
                  validator: (value) => value?.isEmpty ?? true ? 'Please enter medication name' : null,
                ),
                
                const SizedBox(height: 16),
                
                TextFormField(
                  controller: _dosageController,
                  decoration: const InputDecoration(
                    labelText: 'Dosage',
                    border: OutlineInputBorder(),
                    hintText: 'e.g., 500mg',
                  ),
                  validator: (value) => value?.isEmpty ?? true ? 'Please enter dosage' : null,
                ),
                
                const SizedBox(height: 16),
                
                TextFormField(
                  controller: _frequencyController,
                  decoration: const InputDecoration(
                    labelText: 'Frequency',
                    border: OutlineInputBorder(),
                    hintText: 'e.g., Twice daily',
                  ),
                  validator: (value) => value?.isEmpty ?? true ? 'Please enter frequency' : null,
                ),
                
                const SizedBox(height: 16),
                
                TextFormField(
                  controller: _durationController,
                  decoration: const InputDecoration(
                    labelText: 'Duration',
                    border: OutlineInputBorder(),
                    hintText: 'e.g., 7 days',
                  ),
                  validator: (value) => value?.isEmpty ?? true ? 'Please enter duration' : null,
                ),
                
                const SizedBox(height: 16),
                
                TextFormField(
                  controller: _instructionsController,
                  decoration: const InputDecoration(
                    labelText: 'Instructions',
                    border: OutlineInputBorder(),
                    hintText: 'Special instructions...',
                  ),
                  maxLines: 3,
                ),
              ],
            ),
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Cancel'),
        ),
        ElevatedButton(
          onPressed: _isLoading ? null : _createPrescription,
          child: _isLoading
              ? const SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : const Text('Create'),
        ),
      ],
    );
  }

  Future<void> _createPrescription() async {
    if (_formKey.currentState?.validate() ?? false) {
      setState(() => _isLoading = true);
      
      try {
        await ApiService.createPrescription({
          'patientId': _selectedPatient!.id,
          'medicationName': _medicationController.text,
          'dosage': _dosageController.text,
          'frequency': _frequencyController.text,
          'duration': _durationController.text,
          'instructions': _instructionsController.text,
        });
        
        if (mounted) {
          Navigator.pop(context);
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Prescription created successfully'),
              backgroundColor: AppColors.success,
            ),
          );
        }
      } catch (e) {
        setState(() => _isLoading = false);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Error creating prescription: $e'),
              backgroundColor: AppColors.error,
            ),
          );
        }
      }
    }
  }

  @override
  void dispose() {
    _medicationController.dispose();
    _dosageController.dispose();
    _frequencyController.dispose();
    _durationController.dispose();
    _instructionsController.dispose();
    super.dispose();
  }
}