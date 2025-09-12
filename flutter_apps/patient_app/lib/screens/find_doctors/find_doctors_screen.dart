import 'package:flutter/material.dart';
import '../../services/api_service.dart';

class FindDoctorsScreen extends StatefulWidget {
  const FindDoctorsScreen({super.key});

  @override
  State<FindDoctorsScreen> createState() => _FindDoctorsScreenState();
}

class _FindDoctorsScreenState extends State<FindDoctorsScreen> {
  List<Map<String, dynamic>> _doctors = [];
  bool _isLoading = false;
  String _errorMessage = '';
  
  // Filter controllers
  String? _selectedMainSpecialty;
  String? _selectedSubSpecialty;
  
  // Medical specialties data - matching the actual backend data
  final Map<String, List<String>> _medicalSpecialties = {
    'Cardiology': ['Interventional Cardiology'],
    'Digestive System': ['Hepatologist'],
  };

  @override
  void initState() {
    super.initState();
    _loadAllDoctors();
  }

  Future<void> _loadAllDoctors() async {
    setState(() {
      _isLoading = true;
      _errorMessage = '';
    });

    try {
      final response = await ApiService.getDoctorsBySpecialization();
      setState(() {
        _doctors = List<Map<String, dynamic>>.from(response['doctors'] ?? []);
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _errorMessage = 'Failed to load doctors: $e';
        _isLoading = false;
      });
    }
  }

  Future<void> _filterDoctors() async {
    setState(() {
      _isLoading = true;
      _errorMessage = '';
    });

    try {
      final response = await ApiService.getDoctorsBySpecialization(
        mainSpecialty: _selectedMainSpecialty,
        subSpecialty: _selectedSubSpecialty,
      );
      setState(() {
        _doctors = List<Map<String, dynamic>>.from(response['doctors'] ?? []);
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _errorMessage = 'Failed to filter doctors: $e';
        _isLoading = false;
      });
    }
  }

  void _clearFilters() {
    setState(() {
      _selectedMainSpecialty = null;
      _selectedSubSpecialty = null;
    });
    _loadAllDoctors();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Find Doctors'),
        backgroundColor: Theme.of(context).primaryColor,
        foregroundColor: Colors.white,
      ),
      body: Column(
        children: [
          // Filters Section
          Card(
            margin: const EdgeInsets.all(16.0),
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Filter by Specialization',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 16),
                  
                  // Main Specialty Dropdown
                  DropdownButtonFormField<String?>(
                    value: _selectedMainSpecialty,
                    decoration: const InputDecoration(
                      labelText: 'Main Specialization',
                      border: OutlineInputBorder(),
                    ),
                    items: [
                      const DropdownMenuItem<String?>(
                        value: null,
                        child: Text('All Specializations'),
                      ),
                      ..._medicalSpecialties.keys.map((specialty) => 
                        DropdownMenuItem<String?>(
                          value: specialty,
                          child: Text(specialty),
                        ),
                      ),
                    ],
                    onChanged: (value) {
                      setState(() {
                        _selectedMainSpecialty = value;
                        _selectedSubSpecialty = null; // Reset sub-specialty when main changes
                      });
                    },
                  ),
                  const SizedBox(height: 16),
                  
                  // Sub Specialty Dropdown
                  DropdownButtonFormField<String?>(
                    value: _selectedSubSpecialty,
                    decoration: const InputDecoration(
                      labelText: 'Sub-Specialization',
                      border: OutlineInputBorder(),
                    ),
                    items: [
                      const DropdownMenuItem<String?>(
                        value: null,
                        child: Text('All Sub-Specializations'),
                      ),
                      if (_selectedMainSpecialty != null)
                        ...(_medicalSpecialties[_selectedMainSpecialty] ?? []).map((subSpecialty) => 
                          DropdownMenuItem<String?>(
                            value: subSpecialty,
                            child: Text(subSpecialty),
                          ),
                        ),
                    ],
                    onChanged: _selectedMainSpecialty == null ? null : (value) {
                      setState(() {
                        _selectedSubSpecialty = value;
                      });
                    },
                  ),
                  const SizedBox(height: 16),
                  
                  // Filter Buttons
                  Row(
                    children: [
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed: _filterDoctors,
                          icon: const Icon(Icons.filter_list),
                          label: const Text('Apply Filters'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Theme.of(context).primaryColor,
                            foregroundColor: Colors.white,
                          ),
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: _clearFilters,
                          icon: const Icon(Icons.clear),
                          label: const Text('Clear Filters'),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          
          // Results Section
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _errorMessage.isNotEmpty
                    ? Center(
                        child: Padding(
                          padding: const EdgeInsets.all(16.0),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                Icons.error_outline,
                                size: 64,
                                color: Colors.red[300],
                              ),
                              const SizedBox(height: 16),
                              Text(
                                _errorMessage,
                                style: const TextStyle(fontSize: 16),
                                textAlign: TextAlign.center,
                              ),
                              const SizedBox(height: 16),
                              ElevatedButton(
                                onPressed: _loadAllDoctors,
                                child: const Text('Retry'),
                              ),
                            ],
                          ),
                        ),
                      )
                    : _doctors.isEmpty
                        ? const Center(
                            child: Padding(
                              padding: EdgeInsets.all(16.0),
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(
                                    Icons.search_off,
                                    size: 64,
                                    color: Colors.grey,
                                  ),
                                  SizedBox(height: 16),
                                  Text(
                                    'No doctors found matching your criteria',
                                    style: TextStyle(
                                      fontSize: 16,
                                      color: Colors.grey,
                                    ),
                                    textAlign: TextAlign.center,
                                  ),
                                ],
                              ),
                            ),
                          )
                        : ListView.builder(
                            padding: const EdgeInsets.symmetric(horizontal: 16.0),
                            itemCount: _doctors.length,
                            itemBuilder: (context, index) {
                              final doctor = _doctors[index];
                              return _buildDoctorCard(doctor);
                            },
                          ),
          ),
        ],
      ),
    );
  }

  Widget _buildDoctorCard(Map<String, dynamic> doctor) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12.0),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                CircleAvatar(
                  radius: 30,
                  backgroundColor: Theme.of(context).primaryColor,
                  child: Text(
                    '${doctor['firstName']?[0] ?? 'D'}${doctor['lastName']?[0] ?? 'R'}',
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 18,
                    ),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Dr. ${doctor['firstName'] ?? ''} ${doctor['lastName'] ?? ''}',
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 4),
                      if (doctor['email'] != null)
                        Text(
                          doctor['email'],
                          style: const TextStyle(
                            color: Colors.grey,
                            fontSize: 14,
                          ),
                        ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            
            // Specialization Information
            if (doctor['medicalSpecialtyCategory'] != null) ...[
              _buildInfoRow('Main Specialization', doctor['medicalSpecialtyCategory']),
            ],
            if (doctor['subSpecialty'] != null) ...[
              _buildInfoRow('Sub-Specialization', doctor['subSpecialty']),
            ],
            if (doctor['department'] != null) ...[
              _buildInfoRow('Department', doctor['department']),
            ],
            
            const SizedBox(height: 16),
            
            // Action Buttons
            Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () {
                      // TODO: Navigate to book appointment with this doctor
                      _showBookAppointmentDialog(doctor);
                    },
                    icon: const Icon(Icons.calendar_today),
                    label: const Text('Book Appointment'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Theme.of(context).primaryColor,
                      foregroundColor: Colors.white,
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                OutlinedButton.icon(
                  onPressed: () {
                    // TODO: Show doctor profile/details
                    _showDoctorProfile(doctor);
                  },
                  icon: const Icon(Icons.info_outline),
                  label: const Text('Details'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 120,
            child: Text(
              '$label:',
              style: const TextStyle(
                fontWeight: FontWeight.w500,
                color: Colors.grey,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _showBookAppointmentDialog(Map<String, dynamic> doctor) {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: const Text('Book Appointment'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Doctor: Dr. ${doctor['firstName']} ${doctor['lastName']}'),
              const SizedBox(height: 8),
              if (doctor['medicalSpecialtyCategory'] != null)
                Text('Specialization: ${doctor['medicalSpecialtyCategory']}'),
              const SizedBox(height: 16),
              const Text(
                'This feature will redirect you to the appointments section where you can select this doctor and book an appointment.',
                style: TextStyle(color: Colors.grey),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () {
                Navigator.of(context).pop();
                // TODO: Navigate to appointments screen with doctor pre-selected
                // For now, just navigate to appointments screen
                Navigator.of(context).pop(); // Go back to home screen
                // The home screen will handle navigation to appointments
              },
              child: const Text('Go to Appointments'),
            ),
          ],
        );
      },
    );
  }

  void _showDoctorProfile(Map<String, dynamic> doctor) {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: Text('Dr. ${doctor['firstName']} ${doctor['lastName']}'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (doctor['email'] != null)
                _buildInfoRow('Email', doctor['email']),
              if (doctor['medicalSpecialtyCategory'] != null)
                _buildInfoRow('Main Specialization', doctor['medicalSpecialtyCategory']),
              if (doctor['subSpecialty'] != null)
                _buildInfoRow('Sub-Specialization', doctor['subSpecialty']),
              if (doctor['department'] != null)
                _buildInfoRow('Department', doctor['department']),
              _buildInfoRow('Status', doctor['isActive'] == true ? 'Active' : 'Inactive'),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Close'),
            ),
          ],
        );
      },
    );
  }
}