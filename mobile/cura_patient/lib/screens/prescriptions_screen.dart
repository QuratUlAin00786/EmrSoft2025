import 'package:flutter/material.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import '../services/auth_service.dart';
import '../utils/app_colors.dart';

class PrescriptionsScreen extends StatefulWidget {
  const PrescriptionsScreen({super.key});

  @override
  State<PrescriptionsScreen> createState() => _PrescriptionsScreenState();
}

class _PrescriptionsScreenState extends State<PrescriptionsScreen> {
  List<dynamic> _prescriptions = [];
  bool _isLoading = true;
  String _error = '';

  @override
  void initState() {
    super.initState();
    _loadPrescriptions();
  }

  Future<void> _loadPrescriptions() async {
    try {
      final authService = AuthService();
      final headers = await authService.getAuthHeaders();
      
      final response = await http.get(
        Uri.parse('${authService._baseUrl}/prescriptions'),
        headers: headers,
      );

      if (response.statusCode == 200) {
        setState(() {
          _prescriptions = jsonDecode(response.body);
          _isLoading = false;
        });
      } else {
        setState(() {
          _error = 'Failed to load prescriptions';
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

  Future<void> _requestRefill(Map<String, dynamic> prescription) async {
    try {
      final authService = AuthService();
      final headers = await authService.getAuthHeaders();
      
      final response = await http.post(
        Uri.parse('${authService._baseUrl}/prescriptions/${prescription['id']}/refill'),
        headers: headers,
        body: jsonEncode({
          'reason': 'Patient requested refill via mobile app',
          'urgency': 'normal',
        }),
      );

      if (response.statusCode == 200) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Refill request sent for ${prescription['medicationName']}'),
            backgroundColor: AppColors.accent,
          ),
        );
        
        // Show medication alert notification
        _showMedicationAlert(prescription);
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Failed to request refill'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error: ${e.toString()}'),
          backgroundColor: AppColors.error,
        ),
      );
    }
  }

  void _showMedicationAlert(Map<String, dynamic> prescription) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
        title: Row(
          children: [
            Icon(
              Icons.notification_important,
              color: AppColors.warning,
              size: 24,
            ),
            const SizedBox(width: 8),
            const Text('Medication Alert'),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Refill request has been submitted for:',
              style: TextStyle(
                fontSize: 14,
                color: AppColors.textLight,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              prescription['medicationName'] ?? 'Unknown medication',
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: AppColors.textDark,
              ),
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.warning.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  Icon(
                    Icons.schedule,
                    color: AppColors.warning,
                    size: 16,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Your doctor will review this request within 24 hours.',
                      style: TextStyle(
                        fontSize: 12,
                        color: AppColors.warning,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Prescriptions'),
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
                          _loadPrescriptions();
                        },
                        child: const Text('Retry'),
                      ),
                    ],
                  ),
                )
              : _prescriptions.isEmpty
                  ? const Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.medication_outlined,
                            size: 64,
                            color: AppColors.textMuted,
                          ),
                          SizedBox(height: 16),
                          Text(
                            'No prescriptions found',
                            style: TextStyle(
                              fontSize: 16,
                              color: AppColors.textLight,
                            ),
                          ),
                        ],
                      ),
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.all(16),
                      itemCount: _prescriptions.length,
                      itemBuilder: (context, index) {
                        final prescription = _prescriptions[index];
                        return _PrescriptionCard(
                          prescription: prescription,
                          onRefillRequest: () => _requestRefill(prescription),
                        );
                      },
                    ),
    );
  }
}

class _PrescriptionCard extends StatelessWidget {
  final Map<String, dynamic> prescription;
  final VoidCallback onRefillRequest;

  const _PrescriptionCard({
    required this.prescription,
    required this.onRefillRequest,
  });

  @override
  Widget build(BuildContext context) {
    final isActive = prescription['status'] == 'active';
    final refillsRemaining = prescription['refillsRemaining'] ?? 0;
    final lowRefills = refillsRemaining <= 2;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: lowRefills && isActive ? AppColors.warning : AppColors.border,
          width: lowRefills && isActive ? 2 : 1,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: isActive 
                      ? AppColors.accent.withOpacity(0.1)
                      : AppColors.textMuted.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(
                  Icons.medication,
                  color: isActive ? AppColors.accent : AppColors.textMuted,
                  size: 20,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      prescription['medicationName'] ?? 'Unknown medication',
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textDark,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${prescription['dosage'] ?? 'Unknown dosage'} - ${prescription['frequency'] ?? 'As needed'}',
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
                  color: _getStatusColor(prescription['status']).withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  prescription['status'] ?? 'Unknown',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                    color: _getStatusColor(prescription['status']),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          
          if (prescription['instructions'] != null) ...[
            Text(
              'Instructions: ${prescription['instructions']}',
              style: const TextStyle(
                fontSize: 14,
                color: AppColors.textDark,
              ),
            ),
            const SizedBox(height: 8),
          ],
          
          Row(
            children: [
              if (prescription['prescribedBy'] != null) ...[
                Text(
                  'Prescribed by: ${prescription['prescribedBy']}',
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppColors.textLight,
                  ),
                ),
                const Spacer(),
              ],
              Text(
                'Refills: $refillsRemaining',
                style: TextStyle(
                  fontSize: 12,
                  color: lowRefills ? AppColors.warning : AppColors.textLight,
                  fontWeight: lowRefills ? FontWeight.w600 : FontWeight.normal,
                ),
              ),
            ],
          ),
          
          if (lowRefills && isActive) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.warning.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  Icon(
                    Icons.warning_amber,
                    color: AppColors.warning,
                    size: 16,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Low refill count - consider requesting a refill',
                      style: TextStyle(
                        fontSize: 12,
                        color: AppColors.warning,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
          
          if (isActive) ...[
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: onRefillRequest,
                icon: const Icon(Icons.refresh, size: 16),
                label: const Text('Request Refill'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: lowRefills ? AppColors.warning : AppColors.primary,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 12),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Color _getStatusColor(String? status) {
    switch (status?.toLowerCase()) {
      case 'active':
        return AppColors.accent;
      case 'pending':
        return AppColors.warning;
      case 'completed':
      case 'expired':
        return AppColors.textMuted;
      case 'cancelled':
        return AppColors.error;
      default:
        return AppColors.textLight;
    }
  }
}