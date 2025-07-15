import 'package:flutter/material.dart';
import '../utils/app_colors.dart';

class ImagingScreen extends StatelessWidget {
  const ImagingScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Medical Imaging'),
        backgroundColor: Colors.white,
        foregroundColor: AppColors.textDark,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () => _showOrderImagingDialog(context),
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
                    title: 'Pending Studies',
                    value: '8',
                    color: Colors.orange,
                    icon: Icons.schedule,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _buildStatCard(
                    title: 'Urgent Reviews',
                    value: '2',
                    color: Colors.red,
                    icon: Icons.priority_high,
                  ),
                ),
              ],
            ),
            
            const SizedBox(height: 24),
            
            // Imaging Studies List
            const Text(
              'Recent Imaging Studies',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w600,
                color: AppColors.textDark,
              ),
            ),
            const SizedBox(height: 16),
            
            _buildImagingStudy(
              patientName: 'Sarah Johnson',
              studyType: 'Chest X-Ray',
              bodyPart: 'Chest',
              orderDate: 'July 14, 2025',
              studyDate: 'July 15, 2025',
              status: 'Report Ready',
              statusColor: Colors.green,
              urgency: 'Routine',
              findings: 'Normal chest X-ray',
            ),
            
            _buildImagingStudy(
              patientName: 'Robert Davis',
              studyType: 'MRI Brain',
              bodyPart: 'Head',
              orderDate: 'July 12, 2025',
              studyDate: 'July 13, 2025',
              status: 'Under Review',
              statusColor: Colors.orange,
              urgency: 'Urgent',
              findings: 'Radiologist review pending',
            ),
            
            _buildImagingStudy(
              patientName: 'Emily Watson',
              studyType: 'CT Abdomen',
              bodyPart: 'Abdomen',
              orderDate: 'July 10, 2025',
              studyDate: 'Scheduled for July 18',
              status: 'Scheduled',
              statusColor: Colors.blue,
              urgency: 'Routine',
              findings: 'Study not yet performed',
            ),
            
            _buildImagingStudy(
              patientName: 'Michael Brown',
              studyType: 'Ultrasound',
              bodyPart: 'Abdomen',
              orderDate: 'July 8, 2025',
              studyDate: 'July 9, 2025',
              status: 'Completed',
              statusColor: Colors.green,
              urgency: 'Routine',
              findings: 'No acute abnormalities',
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
                      Icon(Icons.medical_services, color: AppColors.primary),
                      const SizedBox(width: 8),
                      const Text(
                        'Imaging Management',
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
                          onPressed: () => _showOrderImagingDialog(context),
                          icon: const Icon(Icons.add, size: 16),
                          label: const Text('Order Study'),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed: () => _showViewerDialog(context),
                          icon: const Icon(Icons.visibility, size: 16),
                          label: const Text('Image Viewer'),
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

  Widget _buildImagingStudy({
    required String patientName,
    required String studyType,
    required String bodyPart,
    required String orderDate,
    required String studyDate,
    required String status,
    required Color statusColor,
    required String urgency,
    required String findings,
  }) {
    Color urgencyColor = urgency == 'Urgent' ? Colors.red : 
                        urgency == 'STAT' ? Colors.purple : Colors.green;
    
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
        border: urgency == 'Urgent' ? Border.all(color: Colors.red.withOpacity(0.3), width: 2) : null,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                Icons.medical_services,
                color: AppColors.primary,
                size: 24,
              ),
              const SizedBox(width: 12),
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
                      '$studyType • $bodyPart',
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
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.grey[50],
              borderRadius: BorderRadius.circular(8),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Findings:',
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textDark,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  findings,
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppColors.textLight,
                  ),
                ),
              ],
            ),
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
              Text(
                'Study: $studyDate',
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
                  onPressed: () => _showImageViewer(context, patientName, studyType),
                  icon: const Icon(Icons.visibility, size: 16),
                  label: const Text('View Images'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: () => _showReportDialog(context, patientName, studyType),
                  icon: const Icon(Icons.description, size: 16),
                  label: const Text('Report'),
                ),
              ),
              if (urgency == 'Urgent') ...[
                const SizedBox(width: 12),
                ElevatedButton.icon(
                  onPressed: () => _showUrgentActionDialog(context, patientName),
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

  void _showOrderImagingDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Order Imaging Study'),
        content: const Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('Order new imaging studies for your patients'),
            SizedBox(height: 16),
            Text('Available studies:'),
            Text('• X-Ray (Chest, Abdomen, Extremities)'),
            Text('• CT Scan (Head, Chest, Abdomen)'),
            Text('• MRI (Brain, Spine, Joints)'),
            Text('• Ultrasound (Abdomen, Pelvis)'),
            Text('• Mammography'),
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
                const SnackBar(content: Text('Opening imaging order form...')),
              );
            },
            child: const Text('Create Order'),
          ),
        ],
      ),
    );
  }

  void _showViewerDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('DICOM Image Viewer'),
        content: const Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('Advanced medical image viewing capabilities'),
            SizedBox(height: 16),
            Text('Features:'),
            Text('• Multi-planar reconstruction'),
            Text('• Window/Level adjustments'),
            Text('• Measurement tools'),
            Text('• 3D rendering'),
            Text('• PACS integration'),
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
                const SnackBar(content: Text('Opening DICOM viewer...')),
              );
            },
            child: const Text('Open Viewer'),
          ),
        ],
      ),
    );
  }

  void _showImageViewer(BuildContext context, String patientName, String studyType) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('$studyType Images'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('Patient: $patientName'),
            const SizedBox(height: 16),
            Container(
              height: 200,
              width: double.infinity,
              decoration: BoxDecoration(
                color: Colors.grey[200],
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.image, size: 64, color: Colors.grey),
                  SizedBox(height: 8),
                  Text('Medical Images'),
                  Text('(DICOM Viewer)', style: TextStyle(fontSize: 12)),
                ],
              ),
            ),
            const SizedBox(height: 16),
            const Text('Use pinch to zoom, drag to pan'),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Opening full-screen viewer...')),
              );
            },
            child: const Text('Full Screen'),
          ),
        ],
      ),
    );
  }

  void _showReportDialog(BuildContext context, String patientName, String studyType) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('$studyType Report'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Patient: $patientName'),
            const SizedBox(height: 16),
            const Text('Report Actions:'),
            const Text('• View radiology report'),
            const Text('• Add clinical notes'),
            const Text('• Share with patient'),
            const Text('• Print/Export'),
            const Text('• Request addendum'),
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
                SnackBar(content: Text('Opening $studyType report for $patientName...')),
              );
            },
            child: const Text('View Report'),
          ),
        ],
      ),
    );
  }

  void _showUrgentActionDialog(BuildContext context, String patientName) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Urgent: Contact $patientName'),
        content: const Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('This study requires immediate attention.'),
            SizedBox(height: 16),
            Text('Recommended actions:'),
            Text('• Contact patient immediately'),
            Text('• Schedule urgent follow-up'),
            Text('• Consult specialist'),
            Text('• Emergency referral if needed'),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Later'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('Initiating urgent contact with $patientName...')),
              );
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red,
              foregroundColor: Colors.white,
            ),
            child: const Text('Contact Now'),
          ),
        ],
      ),
    );
  }
}