import 'package:flutter/material.dart';
import '../utils/app_colors.dart';

class LabResultsScreen extends StatelessWidget {
  const LabResultsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Lab Results'),
        backgroundColor: Colors.white,
        foregroundColor: AppColors.textDark,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.filter_list),
            onPressed: () => _showFilterDialog(context),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Quick Stats
            Row(
              children: [
                Expanded(
                  child: _buildStatCard(
                    title: 'Pending Results',
                    value: '12',
                    color: Colors.orange,
                    icon: Icons.pending,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _buildStatCard(
                    title: 'Urgent Reviews',
                    value: '3',
                    color: Colors.red,
                    icon: Icons.priority_high,
                  ),
                ),
              ],
            ),
            
            const SizedBox(height: 24),
            
            // Lab Results List
            const Text(
              'Recent Lab Results',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w600,
                color: AppColors.textDark,
              ),
            ),
            const SizedBox(height: 16),
            
            _buildLabResult(
              patientName: 'Sarah Johnson',
              testName: 'Complete Blood Count (CBC)',
              orderDate: 'July 14, 2025',
              resultDate: 'July 15, 2025',
              status: 'Abnormal',
              statusColor: Colors.red,
              urgency: 'High',
            ),
            
            _buildLabResult(
              patientName: 'Robert Davis',
              testName: 'Lipid Panel',
              orderDate: 'July 13, 2025',
              resultDate: 'July 14, 2025',
              status: 'Normal',
              statusColor: Colors.green,
              urgency: 'Low',
            ),
            
            _buildLabResult(
              patientName: 'Emily Watson',
              testName: 'Thyroid Function Tests',
              orderDate: 'July 12, 2025',
              resultDate: 'Pending',
              status: 'Processing',
              statusColor: Colors.orange,
              urgency: 'Medium',
            ),
            
            _buildLabResult(
              patientName: 'Michael Brown',
              testName: 'Hemoglobin A1C',
              orderDate: 'July 10, 2025',
              resultDate: 'July 11, 2025',
              status: 'Borderline',
              statusColor: Colors.orange,
              urgency: 'Medium',
            ),
            
            _buildLabResult(
              patientName: 'Lisa Wilson',
              testName: 'Vitamin D Level',
              orderDate: 'July 8, 2025',
              resultDate: 'July 9, 2025',
              status: 'Low',
              statusColor: Colors.red,
              urgency: 'Medium',
            ),
            
            const SizedBox(height: 24),
            
            // Quick Actions
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.primary.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.primary.withOpacity(0.3)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Icons.science, color: AppColors.primary),
                      const SizedBox(width: 8),
                      const Text(
                        'Lab Management',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                          color: AppColors.primary,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () => _showOrderLabDialog(context),
                          icon: const Icon(Icons.add, size: 16),
                          label: const Text('Order Lab'),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed: () => _showBulkReviewDialog(context),
                          icon: const Icon(Icons.checklist, size: 16),
                          label: const Text('Bulk Review'),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatCard({
    required String title,
    required String value,
    required Color color,
    required IconData icon,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Icon(icon, color: color, size: 24),
              Text(
                value,
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                  color: color,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            title,
            style: TextStyle(
              fontSize: 14,
              color: color,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLabResult({
    required String patientName,
    required String testName,
    required String orderDate,
    required String resultDate,
    required String status,
    required Color statusColor,
    required String urgency,
  }) {
    Color urgencyColor = urgency == 'High' ? Colors.red : 
                        urgency == 'Medium' ? Colors.orange : Colors.green;
    
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.grey.withOpacity(0.1),
            spreadRadius: 1,
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
        border: urgency == 'High' ? Border.all(color: Colors.red.withOpacity(0.3), width: 2) : null,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      patientName,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textDark,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      testName,
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                        color: AppColors.primary,
                      ),
                    ),
                  ],
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: statusColor.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      status,
                      style: TextStyle(
                        color: statusColor,
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                  const SizedBox(height: 4),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: urgencyColor.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      urgency,
                      style: TextStyle(
                        color: urgencyColor,
                        fontSize: 10,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              const Icon(Icons.calendar_today, size: 16, color: AppColors.textLight),
              const SizedBox(width: 4),
              Text(
                'Ordered: $orderDate',
                style: const TextStyle(
                  color: AppColors.textLight,
                  fontSize: 12,
                ),
              ),
              const Spacer(),
              if (resultDate != 'Pending')
                Text(
                  'Result: $resultDate',
                  style: const TextStyle(
                    color: AppColors.textLight,
                    fontSize: 12,
                  ),
                ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('Viewing $testName details for $patientName...')),
                    );
                  },
                  icon: const Icon(Icons.visibility, size: 16),
                  label: const Text('View'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: () => _showReviewDialog(context, patientName, testName),
                  icon: const Icon(Icons.rate_review, size: 16),
                  label: const Text('Review'),
                ),
              ),
              if (urgency == 'High') ...[
                const SizedBox(width: 12),
                ElevatedButton.icon(
                  onPressed: () => _showContactPatientDialog(context, patientName),
                  icon: const Icon(Icons.phone, size: 16),
                  label: const Text('Contact'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.red,
                    foregroundColor: Colors.white,
                  ),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }

  void _showFilterDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Filter Lab Results'),
        content: const Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('Filter by:'),
            SizedBox(height: 16),
            Text('• Patient name'),
            Text('• Test type'),
            Text('• Status (Normal/Abnormal/Pending)'),
            Text('• Urgency level'),
            Text('• Date range'),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Applying filters...')),
              );
            },
            child: const Text('Apply'),
          ),
        ],
      ),
    );
  }

  void _showOrderLabDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Order Lab Test'),
        content: const Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('Order new lab tests for your patients'),
            SizedBox(height: 16),
            Text('Available tests:'),
            Text('• Blood work (CBC, Chemistry panel)'),
            Text('• Lipid panel'),
            Text('• Thyroid function'),
            Text('• Diabetes monitoring'),
            Text('• Custom lab orders'),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Opening lab order form...')),
              );
            },
            child: const Text('Create Order'),
          ),
        ],
      ),
    );
  }

  void _showBulkReviewDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Bulk Review'),
        content: const Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('Review multiple lab results efficiently'),
            SizedBox(height: 16),
            Text('This feature allows you to:'),
            Text('• Select multiple results'),
            Text('• Apply common actions'),
            Text('• Generate summary reports'),
            Text('• Send batch notifications'),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Starting bulk review mode...')),
              );
            },
            child: const Text('Start Review'),
          ),
        ],
      ),
    );
  }

  void _showReviewDialog(BuildContext context, String patientName, String testName) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Review $testName'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Patient: $patientName'),
            const SizedBox(height: 16),
            const Text('Actions available:'),
            const Text('• Add clinical notes'),
            const Text('• Flag for follow-up'),
            const Text('• Contact patient'),
            const Text('• Order additional tests'),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('Opening review for $patientName...')),
              );
            },
            child: const Text('Review'),
          ),
        ],
      ),
    );
  }

  void _showContactPatientDialog(BuildContext context, String patientName) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Contact $patientName'),
        content: const Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('How would you like to contact the patient?'),
            SizedBox(height: 16),
            Text('• Phone call'),
            Text('• Secure message'),
            Text('• Schedule urgent appointment'),
            Text('• Send to emergency'),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('Contacting $patientName...')),
              );
            },
            child: const Text('Contact'),
          ),
        ],
      ),
    );
  }
}