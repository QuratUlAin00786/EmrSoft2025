import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';
import '../../utils/app_colors.dart';
import '../../services/api_service.dart';

class PatientsScreen extends StatefulWidget {
  const PatientsScreen({super.key});

  @override
  State<PatientsScreen> createState() => _PatientsScreenState();
}

class _PatientsScreenState extends State<PatientsScreen> {
  final TextEditingController _searchController = TextEditingController();
  List<Map<String, dynamic>> _patients = [];
  List<Map<String, dynamic>> _filteredPatients = [];
  bool _isLoading = true;
  String _selectedFilter = 'all';

  @override
  void initState() {
    super.initState();
    _loadPatients();
  }

  Future<void> _loadPatients() async {
    try {
      final response = await ApiService.get('/api/mobile/doctor/patients');
      if (response['success']) {
        setState(() {
          _patients = List<Map<String, dynamic>>.from(response['patients']);
          _filteredPatients = _patients;
          _isLoading = false;
        });
      }
    } catch (e) {
      setState(() {
        _isLoading = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error loading patients: $e'),
          backgroundColor: AppColors.error,
        ),
      );
    }
  }

  void _filterPatients() {
    final query = _searchController.text.toLowerCase();
    setState(() {
      _filteredPatients = _patients.where((patient) {
        final matchesSearch = patient['name']?.toLowerCase().contains(query) ?? false ||
                             patient['patientId']?.toLowerCase().contains(query) ?? false ||
                             patient['phone']?.toLowerCase().contains(query) ?? false;
        
        final matchesFilter = _selectedFilter == 'all' ||
                             (_selectedFilter == 'critical' && patient['riskLevel'] == 'high') ||
                             (_selectedFilter == 'recent' && _isRecentPatient(patient));
        
        return matchesSearch && matchesFilter;
      }).toList();
    });
  }

  bool _isRecentPatient(Map<String, dynamic> patient) {
    if (patient['lastVisit'] == null) return false;
    final lastVisit = DateTime.parse(patient['lastVisit']);
    final now = DateTime.now();
    return now.difference(lastVisit).inDays <= 7;
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
            onPressed: _addNewPatient,
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
                      hintText: 'Search patients...',
                      prefixIcon: Icon(Icons.search, color: AppColors.textSecondary),
                      border: InputBorder.none,
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 12,
                      ),
                    ),
                    onChanged: (_) => _filterPatients(),
                  ),
                ),
                
                const SizedBox(height: 12),
                
                // Filter Pills
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      _buildFilterPill('All Patients', 'all'),
                      const SizedBox(width: 8),
                      _buildFilterPill('Critical', 'critical'),
                      const SizedBox(width: 8),
                      _buildFilterPill('Recent', 'recent'),
                      const SizedBox(width: 8),
                      _buildFilterPill('Upcoming', 'upcoming'),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // Patients List
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _filteredPatients.isEmpty
                    ? _buildEmptyState()
                    : RefreshIndicator(
                        onRefresh: _loadPatients,
                        child: ListView.builder(
                          padding: const EdgeInsets.all(16),
                          itemCount: _filteredPatients.length,
                          itemBuilder: (context, index) {
                            final patient = _filteredPatients[index];
                            return _buildPatientCard(patient, index);
                          },
                        ),
                      ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _addNewPatient,
        backgroundColor: AppColors.primary,
        child: const Icon(Icons.person_add, color: Colors.white),
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
        _filterPatients();
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

  Widget _buildPatientCard(Map<String, dynamic> patient, int index) {
    final riskLevel = patient['riskLevel'] ?? 'low';
    final lastVisit = patient['lastVisit'] != null 
        ? DateTime.parse(patient['lastVisit'])
        : null;
    final age = _calculateAge(patient['dateOfBirth']);

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
        onTap: () => _viewPatientDetails(patient),
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  // Patient Avatar
                  Container(
                    width: 50,
                    height: 50,
                    decoration: BoxDecoration(
                      color: _getRiskColor(riskLevel).withOpacity(0.1),
                      borderRadius: BorderRadius.circular(25),
                    ),
                    child: Icon(
                      Icons.person,
                      color: _getRiskColor(riskLevel),
                      size: 24,
                    ),
                  ),
                  
                  const SizedBox(width: 12),
                  
                  // Patient Info
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                patient['name'] ?? 'Unknown Patient',
                                style: const TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: _getRiskColor(riskLevel).withOpacity(0.1),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Text(
                                riskLevel.toUpperCase(),
                                style: TextStyle(
                                  color: _getRiskColor(riskLevel),
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                          ],
                        ),
                        
                        const SizedBox(height: 4),
                        
                        Row(
                          children: [
                            Text(
                              'ID: ${patient['patientId'] ?? 'N/A'}',
                              style: TextStyle(
                                color: AppColors.textSecondary,
                                fontSize: 12,
                              ),
                            ),
                            if (age != null) ...[
                              Text(
                                ' • $age years',
                                style: TextStyle(
                                  color: AppColors.textSecondary,
                                  fontSize: 12,
                                ),
                              ),
                            ],
                            if (patient['gender'] != null) ...[
                              Text(
                                ' • ${patient['gender']}',
                                style: TextStyle(
                                  color: AppColors.textSecondary,
                                  fontSize: 12,
                                ),
                              ),
                            ],
                          ],
                        ),
                        
                        if (lastVisit != null) ...[
                          const SizedBox(height: 4),
                          Text(
                            'Last visit: ${_formatDate(lastVisit)}',
                            style: TextStyle(
                              color: AppColors.textSecondary,
                              fontSize: 12,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                  
                  // Action Buttons
                  PopupMenuButton<String>(
                    onSelected: (value) => _handlePatientAction(value, patient),
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
                        value: 'appointment',
                        child: Row(
                          children: [
                            Icon(Icons.event, size: 16),
                            SizedBox(width: 8),
                            Text('Schedule Appointment'),
                          ],
                        ),
                      ),
                      const PopupMenuItem(
                        value: 'prescription',
                        child: Row(
                          children: [
                            Icon(Icons.medication, size: 16),
                            SizedBox(width: 8),
                            Text('Prescribe Medication'),
                          ],
                        ),
                      ),
                      const PopupMenuItem(
                        value: 'message',
                        child: Row(
                          children: [
                            Icon(Icons.message, size: 16),
                            SizedBox(width: 8),
                            Text('Send Message'),
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
              
              // Quick Info Tags
              if (patient['conditions'] != null || patient['allergies'] != null) ...[
                const SizedBox(height: 12),
                Wrap(
                  spacing: 8,
                  runSpacing: 4,
                  children: [
                    if (patient['conditions'] != null)
                      ...List<String>.from(patient['conditions']).take(2).map(
                        (condition) => Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: Colors.blue.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            condition,
                            style: const TextStyle(
                              color: Colors.blue,
                              fontSize: 10,
                            ),
                          ),
                        ),
                      ),
                    if (patient['allergies'] != null)
                      ...List<String>.from(patient['allergies']).take(1).map(
                        (allergy) => Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: Colors.red.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            'Allergy: $allergy',
                            style: const TextStyle(
                              color: Colors.red,
                              fontSize: 10,
                            ),
                          ),
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
            Icons.people_outline,
            size: 64,
            color: AppColors.textSecondary,
          ),
          const SizedBox(height: 16),
          Text(
            'No patients found',
            style: TextStyle(
              fontSize: 18,
              color: AppColors.textSecondary,
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Add a new patient or adjust your search filters',
            style: TextStyle(
              fontSize: 14,
              color: AppColors.textSecondary,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 24),
          ElevatedButton.icon(
            onPressed: _addNewPatient,
            icon: const Icon(Icons.person_add),
            label: const Text('Add New Patient'),
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
        _loadPatients();
        break;
      case 'export':
        _exportPatientList();
        break;
    }
  }

  void _handlePatientAction(String action, Map<String, dynamic> patient) {
    switch (action) {
      case 'view':
        _viewPatientDetails(patient);
        break;
      case 'appointment':
        _scheduleAppointment(patient);
        break;
      case 'prescription':
        _prescribeMedication(patient);
        break;
      case 'message':
        _sendMessage(patient);
        break;
    }
  }

  void _viewPatientDetails(Map<String, dynamic> patient) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Opening details for ${patient['name']}'),
        backgroundColor: AppColors.primary,
      ),
    );
  }

  void _scheduleAppointment(Map<String, dynamic> patient) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Scheduling appointment for ${patient['name']}'),
        backgroundColor: AppColors.success,
      ),
    );
  }

  void _prescribeMedication(Map<String, dynamic> patient) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Prescribing medication for ${patient['name']}'),
        backgroundColor: Colors.orange,
      ),
    );
  }

  void _sendMessage(Map<String, dynamic> patient) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Opening chat with ${patient['name']}'),
        backgroundColor: Colors.blue,
      ),
    );
  }

  void _addNewPatient() {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: const Text('Add new patient feature coming soon'),
        backgroundColor: AppColors.primary,
      ),
    );
  }

  void _exportPatientList() {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: const Text('Exporting patient list...'),
        backgroundColor: AppColors.success,
      ),
    );
  }

  Color _getRiskColor(String riskLevel) {
    switch (riskLevel.toLowerCase()) {
      case 'high':
      case 'critical':
        return AppColors.error;
      case 'medium':
      case 'moderate':
        return Colors.orange;
      case 'low':
      default:
        return AppColors.success;
    }
  }

  int? _calculateAge(String? dateOfBirth) {
    if (dateOfBirth == null) return null;
    try {
      final birthDate = DateTime.parse(dateOfBirth);
      final now = DateTime.now();
      int age = now.year - birthDate.year;
      if (now.month < birthDate.month || 
          (now.month == birthDate.month && now.day < birthDate.day)) {
        age--;
      }
      return age;
    } catch (e) {
      return null;
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