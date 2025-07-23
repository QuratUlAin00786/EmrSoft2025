import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';
import '../../utils/app_colors.dart';
import '../../services/api_service.dart';

class PrescriptionsScreen extends StatefulWidget {
  const PrescriptionsScreen({super.key});

  @override
  State<PrescriptionsScreen> createState() => _PrescriptionsScreenState();
}

class _PrescriptionsScreenState extends State<PrescriptionsScreen> {
  final TextEditingController _searchController = TextEditingController();
  List<Map<String, dynamic>> _prescriptions = [];
  List<Map<String, dynamic>> _filteredPrescriptions = [];
  bool _isLoading = true;
  String _selectedFilter = 'all';

  @override
  void initState() {
    super.initState();
    _loadPrescriptions();
  }

  Future<void> _loadPrescriptions() async {
    try {
      final response = await ApiService.get('/api/mobile/doctor/prescriptions');
      if (response['success']) {
        setState(() {
          _prescriptions = List<Map<String, dynamic>>.from(response['prescriptions']);
          _filteredPrescriptions = _prescriptions;
          _isLoading = false;
        });
      }
    } catch (e) {
      setState(() {
        _isLoading = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error loading prescriptions: $e'),
          backgroundColor: AppColors.error,
        ),
      );
    }
  }

  void _filterPrescriptions() {
    final query = _searchController.text.toLowerCase();
    setState(() {
      _filteredPrescriptions = _prescriptions.where((prescription) {
        final matchesSearch = prescription['medicationName']?.toLowerCase().contains(query) ?? false ||
                             prescription['patientName']?.toLowerCase().contains(query) ?? false ||
                             prescription['patientId']?.toLowerCase().contains(query) ?? false;
        
        final matchesFilter = _selectedFilter == 'all' ||
                             (_selectedFilter == 'active' && prescription['status'] == 'active') ||
                             (_selectedFilter == 'expired' && prescription['status'] == 'expired') ||
                             (_selectedFilter == 'recent' && _isRecentPrescription(prescription));
        
        return matchesSearch && matchesFilter;
      }).toList();
    });
  }

  bool _isRecentPrescription(Map<String, dynamic> prescription) {
    if (prescription['createdAt'] == null) return false;
    final createdAt = DateTime.parse(prescription['createdAt']);
    final now = DateTime.now();
    return now.difference(createdAt).inDays <= 7;
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
            onPressed: _createNewPrescription,
          ),
          PopupMenuButton<String>(
            onSelected: _handleMenuAction,
            itemBuilder: (context) => [
              const PopupMenuItem(
                value: 'refresh',
                child: Row(
                  children: [
                    Icon(Icons.refresh, size: 16),
                    SizedBox(width: 8),
                    Text('Refresh'),
                  ],
                ),
              ),
              const PopupMenuItem(
                value: 'export',
                child: Row(
                  children: [
                    Icon(Icons.download, size: 16),
                    SizedBox(width: 8),
                    Text('Export List'),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
      body: Column(
        children: [
          // Search and Filter Section
          Container(
            padding: const EdgeInsets.all(16),
            color: Colors.white,
            child: Column(
              children: [
                // Search Bar
                Container(
                  decoration: BoxDecoration(
                    color: AppColors.background,
                    borderRadius: BorderRadius.circular(25),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: TextField(
                    controller: _searchController,
                    decoration: InputDecoration(
                      hintText: 'Search prescriptions...',
                      prefixIcon: Icon(Icons.search, color: AppColors.textSecondary),
                      border: InputBorder.none,
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 12,
                      ),
                    ),
                    onChanged: (_) => _filterPrescriptions(),
                  ),
                ),
                
                const SizedBox(height: 12),
                
                // Filter Pills
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      _buildFilterPill('All', 'all'),
                      const SizedBox(width: 8),
                      _buildFilterPill('Active', 'active'),
                      const SizedBox(width: 8),
                      _buildFilterPill('Expired', 'expired'),
                      const SizedBox(width: 8),
                      _buildFilterPill('Recent', 'recent'),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // Prescriptions List
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _filteredPrescriptions.isEmpty
                    ? _buildEmptyState()
                    : RefreshIndicator(
                        onRefresh: _loadPrescriptions,
                        child: ListView.builder(
                          padding: const EdgeInsets.all(16),
                          itemCount: _filteredPrescriptions.length,
                          itemBuilder: (context, index) {
                            final prescription = _filteredPrescriptions[index];
                            return _buildPrescriptionCard(prescription, index);
                          },
                        ),
                      ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _createNewPrescription,
        backgroundColor: AppColors.primary,
        child: const Icon(Icons.add, color: Colors.white),
      ),
    );
  }

  Widget _buildFilterPill(String label, String value) {
    final isSelected = _selectedFilter == value;
    return GestureDetector(
      onTap: () {
        setState(() {
          _selectedFilter = value;
        });
        _filterPrescriptions();
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.primary : Colors.transparent,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? AppColors.primary : AppColors.border,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isSelected ? Colors.white : AppColors.textSecondary,
            fontSize: 12,
            fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
          ),
        ),
      ),
    );
  }

  Widget _buildPrescriptionCard(Map<String, dynamic> prescription, int index) {
    final status = prescription['status'] ?? 'active';
    final createdAt = prescription['createdAt'] != null 
        ? DateTime.parse(prescription['createdAt'])
        : DateTime.now();
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
        onTap: () => _viewPrescriptionDetails(prescription),
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  // Medication Icon
                  Container(
                    width: 50,
                    height: 50,
                    decoration: BoxDecoration(
                      color: _getStatusColor(status).withOpacity(0.1),
                      borderRadius: BorderRadius.circular(25),
                    ),
                    child: Icon(
                      Icons.medication,
                      color: _getStatusColor(status),
                      size: 24,
                    ),
                  ),
                  
                  const SizedBox(width: 12),
                  
                  // Prescription Info
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                prescription['medicationName'] ?? 'Unknown Medication',
                                style: const TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: _getStatusColor(status).withOpacity(0.1),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Text(
                                status.toUpperCase(),
                                style: TextStyle(
                                  color: _getStatusColor(status),
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                          ],
                        ),
                        
                        const SizedBox(height: 4),
                        
                        Text(
                          'Patient: ${prescription['patientName'] ?? 'Unknown'}',
                          style: TextStyle(
                            color: AppColors.textSecondary,
                            fontSize: 14,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        
                        const SizedBox(height: 2),
                        
                        Row(
                          children: [
                            Text(
                              'Dosage: ${prescription['dosage'] ?? 'N/A'}',
                              style: TextStyle(
                                color: AppColors.textSecondary,
                                fontSize: 12,
                              ),
                            ),
                            if (prescription['frequency'] != null) ...[
                              Text(
                                ' • ${prescription['frequency']}',
                                style: TextStyle(
                                  color: AppColors.textSecondary,
                                  fontSize: 12,
                                ),
                              ),
                            ],
                          ],
                        ),
                      ],
                    ),
                  ),
                  
                  // Action Menu
                  PopupMenuButton<String>(
                    onSelected: (value) => _handlePrescriptionAction(value, prescription),
                    itemBuilder: (context) => [
                      const PopupMenuItem(
                        value: 'view',
                        child: Row(
                          children: [
                            Icon(Icons.visibility, size: 16),
                            SizedBox(width: 8),
                            Text('View Details'),
                          ],
                        ),
                      ),
                      const PopupMenuItem(
                        value: 'edit',
                        child: Row(
                          children: [
                            Icon(Icons.edit, size: 16),
                            SizedBox(width: 8),
                            Text('Edit'),
                          ],
                        ),
                      ),
                      const PopupMenuItem(
                        value: 'renew',
                        child: Row(
                          children: [
                            Icon(Icons.refresh, size: 16),
                            SizedBox(width: 8),
                            Text('Renew'),
                          ],
                        ),
                      ),
                      const PopupMenuItem(
                        value: 'stop',
                        child: Row(
                          children: [
                            Icon(Icons.stop, size: 16),
                            SizedBox(width: 8),
                            Text('Stop Prescription'),
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
              
              const SizedBox(height: 12),
              
              // Additional Info Row
              Row(
                children: [
                  Icon(Icons.calendar_today, size: 14, color: AppColors.textSecondary),
                  const SizedBox(width: 4),
                  Text(
                    'Prescribed: ${_formatDate(createdAt)}',
                    style: TextStyle(
                      color: AppColors.textSecondary,
                      fontSize: 12,
                    ),
                  ),
                  if (expiryDate != null) ...[
                    const SizedBox(width: 16),
                    Icon(Icons.access_time, size: 14, color: AppColors.textSecondary),
                    const SizedBox(width: 4),
                    Text(
                      'Expires: ${_formatDate(expiryDate)}',
                      style: TextStyle(
                        color: AppColors.textSecondary,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ],
              ),
              
              // Duration and Instructions
              if (prescription['duration'] != null || prescription['instructions'] != null) ...[
                const SizedBox(height: 8),
                if (prescription['duration'] != null)
                  Text(
                    'Duration: ${prescription['duration']}',
                    style: TextStyle(
                      color: AppColors.textSecondary,
                      fontSize: 12,
                    ),
                  ),
                if (prescription['instructions'] != null) ...[
                  const SizedBox(height: 4),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: AppColors.background,
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      prescription['instructions'],
                      style: TextStyle(
                        color: AppColors.textPrimary,
                        fontSize: 12,
                        fontStyle: FontStyle.italic,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ],
              
              // Refills Info
              if (prescription['refillsRemaining'] != null) ...[
                const SizedBox(height: 8),
                Row(
                  children: [
                    Icon(Icons.repeat, size: 14, color: AppColors.textSecondary),
                    const SizedBox(width: 4),
                    Text(
                      'Refills remaining: ${prescription['refillsRemaining']}',
                      style: TextStyle(
                        color: AppColors.textSecondary,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ],
            ],
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
            color: AppColors.textSecondary,
          ),
          const SizedBox(height: 16),
          Text(
            'No prescriptions found',
            style: TextStyle(
              fontSize: 18,
              color: AppColors.textSecondary,
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Create a new prescription or adjust your search filters',
            style: TextStyle(
              fontSize: 14,
              color: AppColors.textSecondary,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 24),
          ElevatedButton.icon(
            onPressed: _createNewPrescription,
            icon: const Icon(Icons.add),
            label: const Text('Create Prescription'),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
            ),
          ),
        ],
      ),
    );
  }

  void _handleMenuAction(String action) {
    switch (action) {
      case 'refresh':
        _loadPrescriptions();
        break;
      case 'export':
        _exportPrescriptionList();
        break;
    }
  }

  void _handlePrescriptionAction(String action, Map<String, dynamic> prescription) {
    switch (action) {
      case 'view':
        _viewPrescriptionDetails(prescription);
        break;
      case 'edit':
        _editPrescription(prescription);
        break;
      case 'renew':
        _renewPrescription(prescription);
        break;
      case 'stop':
        _stopPrescription(prescription);
        break;
    }
  }

  void _viewPrescriptionDetails(Map<String, dynamic> prescription) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Opening details for ${prescription['medicationName']}'),
        backgroundColor: AppColors.primary,
      ),
    );
  }

  void _editPrescription(Map<String, dynamic> prescription) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Editing prescription for ${prescription['medicationName']}'),
        backgroundColor: Colors.orange,
      ),
    );
  }

  void _renewPrescription(Map<String, dynamic> prescription) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Renew Prescription'),
        content: Text('Renew prescription for ${prescription['medicationName']}?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: const Text('Prescription renewed successfully'),
                  backgroundColor: AppColors.success,
                ),
              );
            },
            child: const Text('Renew'),
          ),
        ],
      ),
    );
  }

  void _stopPrescription(Map<String, dynamic> prescription) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Stop Prescription'),
        content: Text('Are you sure you want to stop ${prescription['medicationName']} for this patient?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: const Text('Prescription stopped'),
                  backgroundColor: AppColors.error,
                ),
              );
            },
            child: Text(
              'Stop',
              style: TextStyle(color: AppColors.error),
            ),
          ),
        ],
      ),
    );
  }

  void _createNewPrescription() {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: const Text('Create new prescription feature coming soon'),
        backgroundColor: AppColors.primary,
      ),
    );
  }

  void _exportPrescriptionList() {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: const Text('Exporting prescription list...'),
        backgroundColor: AppColors.success,
      ),
    );
  }

  Color _getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'active':
        return AppColors.success;
      case 'expired':
        return AppColors.error;
      case 'completed':
        return Colors.blue;
      case 'cancelled':
        return AppColors.textSecondary;
      default:
        return AppColors.primary;
    }
  }

  String _formatDate(DateTime date) {
    final now = DateTime.now();
    final difference = now.difference(date).inDays;

    if (difference == 0) {
      return 'Today';
    } else if (difference == 1) {
      return 'Yesterday';
    } else if (difference < 7) {
      return '$difference days ago';
    } else {
      return '${date.day}/${date.month}/${date.year}';
    }
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }
}