import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/prescription_provider.dart';
import '../../services/api_service.dart';
import '../../theme/app_theme.dart';
import '../../utils/app_colors.dart';

class PrescriptionsScreen extends StatefulWidget {
  const PrescriptionsScreen({super.key});

  @override
  State<PrescriptionsScreen> createState() => _PrescriptionsScreenState();
}

class _PrescriptionsScreenState extends State<PrescriptionsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';
  bool _isLoading = true;
  List<Map<String, dynamic>> _prescriptions = [];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadPrescriptions();
  }

  Future<void> _loadPrescriptions() async {
    try {
      final prescriptions = await ApiService.getDoctorPrescriptions();
      setState(() {
        _prescriptions = List<Map<String, dynamic>>.from(prescriptions);
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to load prescriptions: $e'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    }
  }

  List<Map<String, dynamic>> get _activePrescriptions =>
      _prescriptions.where((p) => p['status'] == 'active').toList();
  
  List<Map<String, dynamic>> get _pendingPrescriptions =>
      _prescriptions.where((p) => p['status'] == 'pending').toList();
  
  List<Map<String, dynamic>> get _expiredPrescriptions =>
      _prescriptions.where((p) => p['status'] == 'expired' || p['status'] == 'completed').toList();

  List<Map<String, dynamic>> get _filteredPrescriptions {
    final prescriptions = _tabController.index == 0
        ? _activePrescriptions
        : _tabController.index == 1
            ? _pendingPrescriptions
            : _expiredPrescriptions;

    if (_searchQuery.isEmpty) return prescriptions;

    return prescriptions.where((p) {
      final patientName = p['patientName']?.toLowerCase() ?? '';
      final medicationName = p['medicationName']?.toLowerCase() ?? '';
      final query = _searchQuery.toLowerCase();
      return patientName.contains(query) || medicationName.contains(query);
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Prescriptions'),
        backgroundColor: Colors.white,
        foregroundColor: AppColors.textPrimary,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: _showCreatePrescriptionDialog,
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
                      hintText: 'Search prescriptions...',
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
                    Tab(text: 'Active (${_activePrescriptions.length})'),
                    Tab(text: 'Pending (${_pendingPrescriptions.length})'),
                    Tab(text: 'History (${_expiredPrescriptions.length})'),
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
                _buildPrescriptionsList('No active prescriptions'),
                _buildPrescriptionsList('No pending prescriptions'),
                _buildPrescriptionsList('No prescription history'),
              ],
            ),
      floatingActionButton: FloatingActionButton(
        onPressed: _showCreatePrescriptionDialog,
        backgroundColor: AppColors.primary,
        child: const Icon(Icons.add),
      ),
    );
  }

  Widget _buildPrescriptionsList(String emptyMessage) {
    final prescriptions = _filteredPrescriptions;

    if (prescriptions.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.medication_outlined,
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
      onRefresh: _loadPrescriptions,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: prescriptions.length,
        itemBuilder: (context, index) {
          final prescription = prescriptions[index];
          return _buildPrescriptionCard(prescription);
        },
      ),
    );
  }

  Widget _buildPrescriptionCard(Map<String, dynamic> prescription) {
    final status = prescription['status'] ?? 'active';
    final statusColor = _getStatusColor(status);
    final createdDate = DateTime.parse(prescription['createdAt']);
    final expiryDate = prescription['expiryDate'] != null
        ? DateTime.parse(prescription['expiryDate'])
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
        onTap: () => _showPrescriptionDetails(prescription),
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
                      Icons.medication,
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
                          prescription['medicationName'] ?? 'Unknown Medication',
                          style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 16,
                          ),
                        ),
                        Text(
                          prescription['patientName'] ?? 'Unknown Patient',
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

              // Prescription Details
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.background,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildDetailRow('Dosage', prescription['dosage'] ?? 'Not specified'),
                    _buildDetailRow('Frequency', prescription['frequency'] ?? 'Not specified'),
                    _buildDetailRow('Duration', prescription['duration'] ?? 'Not specified'),
                    if (prescription['instructions'] != null)
                      _buildDetailRow('Instructions', prescription['instructions']),
                  ],
                ),
              ),

              const SizedBox(height: 12),

              // Dates and Refills
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Prescribed: ${_formatDate(createdDate)}',
                          style: TextStyle(
                            color: AppColors.textSecondary,
                            fontSize: 12,
                          ),
                        ),
                        if (expiryDate != null)
                          Text(
                            'Expires: ${_formatDate(expiryDate)}',
                            style: TextStyle(
                              color: AppColors.textSecondary,
                              fontSize: 12,
                            ),
                          ),
                      ],
                    ),
                  ),
                  if (prescription['refillsRemaining'] != null)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: AppColors.primary.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        '${prescription['refillsRemaining']} refills left',
                        style: TextStyle(
                          color: AppColors.primary,
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                ],
              ),

              const SizedBox(height: 12),

              // Action Buttons
              Row(
                children: [
                  if (status == 'active') ...[
                    _buildActionButton(
                      'Refill',
                      Icons.refresh,
                      AppColors.success,
                      () => _refillPrescription(prescription),
                    ),
                    const SizedBox(width: 8),
                    _buildActionButton(
                      'Modify',
                      Icons.edit,
                      AppColors.primary,
                      () => _modifyPrescription(prescription),
                    ),
                    const SizedBox(width: 8),
                  ],
                  if (status == 'pending') ...[
                    _buildActionButton(
                      'Approve',
                      Icons.check,
                      AppColors.success,
                      () => _approvePrescription(prescription),
                    ),
                    const SizedBox(width: 8),
                  ],
                  _buildActionButton(
                    'Details',
                    Icons.info_outline,
                    AppColors.textSecondary,
                    () => _showPrescriptionDetails(prescription),
                  ),
                ],
              ),
            ],
          ),
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
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
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

  void _showCreatePrescriptionDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Create Prescription'),
        content: const Text('Prescription creation feature will be available soon.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  void _showPrescriptionDetails(Map<String, dynamic> prescription) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.7,
        maxChildSize: 0.9,
        minChildSize: 0.5,
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
                  Expanded(
                    child: Text(
                      prescription['medicationName'] ?? 'Prescription',
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  IconButton(
                    onPressed: () => Navigator.pop(context),
                    icon: const Icon(Icons.close),
                  ),
                ],
              ),
              
              const SizedBox(height: 16),
              
              // Details
              Expanded(
                child: SingleChildScrollView(
                  controller: scrollController,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _buildDetailSection('Patient Information', [
                        _buildDetailItem('Name', prescription['patientName']),
                        _buildDetailItem('Age', prescription['patientAge']?.toString()),
                        _buildDetailItem('Weight', prescription['patientWeight']),
                      ]),
                      
                      const SizedBox(height: 16),
                      
                      _buildDetailSection('Medication Details', [
                        _buildDetailItem('Medication', prescription['medicationName']),
                        _buildDetailItem('Dosage', prescription['dosage']),
                        _buildDetailItem('Frequency', prescription['frequency']),
                        _buildDetailItem('Duration', prescription['duration']),
                        _buildDetailItem('Route', prescription['route']),
                      ]),
                      
                      const SizedBox(height: 16),
                      
                      if (prescription['instructions'] != null) ...[
                        _buildDetailSection('Instructions', [
                          Text(
                            prescription['instructions'],
                            style: const TextStyle(fontSize: 14),
                          ),
                        ]),
                        const SizedBox(height: 16),
                      ],
                      
                      _buildDetailSection('Prescription Information', [
                        _buildDetailItem('Status', prescription['status']),
                        _buildDetailItem('Prescribed Date', _formatDate(DateTime.parse(prescription['createdAt']))),
                        if (prescription['expiryDate'] != null)
                          _buildDetailItem('Expiry Date', _formatDate(DateTime.parse(prescription['expiryDate']))),
                        _buildDetailItem('Refills Remaining', prescription['refillsRemaining']?.toString()),
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
                        _modifyPrescription(prescription);
                      },
                      icon: const Icon(Icons.edit),
                      label: const Text('Modify'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () {
                        Navigator.pop(context);
                        _printPrescription(prescription);
                      },
                      icon: const Icon(Icons.print),
                      label: const Text('Print'),
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

  void _refillPrescription(Map<String, dynamic> prescription) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Refill requested for ${prescription['medicationName']}'),
        backgroundColor: AppColors.success,
      ),
    );
  }

  void _modifyPrescription(Map<String, dynamic> prescription) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Modify prescription feature coming soon')),
    );
  }

  void _approvePrescription(Map<String, dynamic> prescription) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('${prescription['medicationName']} prescription approved'),
        backgroundColor: AppColors.success,
      ),
    );
  }

  void _printPrescription(Map<String, dynamic> prescription) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Print feature coming soon')),
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

  @override
  void dispose() {
    _tabController.dispose();
    _searchController.dispose();
    super.dispose();
  }
}