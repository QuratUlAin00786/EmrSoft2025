import 'package:flutter/material.dart';
import '../utils/app_colors.dart';

class TelemedicineScreen extends StatelessWidget {
  const TelemedicineScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Telemedicine'),
        backgroundColor: Colors.white,
        foregroundColor: AppColors.textDark,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Quick Start Section
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [AppColors.primary, AppColors.secondary],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Column(
                children: [
                  const Icon(
                    Icons.video_call,
                    size: 48,
                    color: Colors.white,
                  ),
                  const SizedBox(height: 12),
                  const Text(
                    'Start Virtual Consultation',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 18,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Connect with patients instantly or join scheduled consultations',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 14,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Expanded(
                        child: ElevatedButton(
                          onPressed: () => _showInstantConsultationDialog(context),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.white,
                            foregroundColor: AppColors.primary,
                          ),
                          child: const Text('Instant Call'),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: OutlinedButton(
                          onPressed: () => _showScheduledConsultations(context),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: Colors.white,
                            side: const BorderSide(color: Colors.white),
                          ),
                          child: const Text('Scheduled'),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            
            const SizedBox(height: 24),
            
            // Today's Virtual Appointments
            const Text(
              'Today\'s Virtual Appointments',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w600,
                color: AppColors.textDark,
              ),
            ),
            const SizedBox(height: 16),
            
            _buildVirtualAppointment(
              patientName: 'Sarah Johnson',
              time: '10:30 AM',
              duration: '30 min',
              type: 'Follow-up',
              status: 'Upcoming',
              statusColor: Colors.blue,
            ),
            
            _buildVirtualAppointment(
              patientName: 'Robert Davis',
              time: '2:00 PM',
              duration: '45 min',
              type: 'Consultation',
              status: 'In Progress',
              statusColor: Colors.green,
            ),
            
            _buildVirtualAppointment(
              patientName: 'Emily Watson',
              time: '4:15 PM',
              duration: '30 min',
              type: 'Check-up',
              status: 'Waiting',
              statusColor: Colors.orange,
            ),
            
            const SizedBox(height: 24),
            
            // Telemedicine Tools
            const Text(
              'Consultation Tools',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w600,
                color: AppColors.textDark,
              ),
            ),
            const SizedBox(height: 16),
            
            GridView.count(
              crossAxisCount: 2,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
              children: [
                _buildToolCard(
                  icon: Icons.screen_share,
                  title: 'Screen Share',
                  subtitle: 'Share medical data',
                  onTap: () => _showToolInfo(context, 'Screen Share'),
                ),
                _buildToolCard(
                  icon: Icons.record_voice_over,
                  title: 'Voice Notes',
                  subtitle: 'Record consultation',
                  onTap: () => _showToolInfo(context, 'Voice Notes'),
                ),
                _buildToolCard(
                  icon: Icons.file_present,
                  title: 'File Sharing',
                  subtitle: 'Send documents',
                  onTap: () => _showToolInfo(context, 'File Sharing'),
                ),
                _buildToolCard(
                  icon: Icons.chat,
                  title: 'Secure Chat',
                  subtitle: 'Text messaging',
                  onTap: () => _showToolInfo(context, 'Secure Chat'),
                ),
              ],
            ),
            
            const SizedBox(height: 24),
            
            // Settings & Preferences
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.grey[50],
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.grey[200]!),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Telemedicine Settings',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textDark,
                    ),
                  ),
                  const SizedBox(height: 12),
                  _buildSettingItem(
                    icon: Icons.videocam,
                    title: 'Camera Settings',
                    subtitle: 'Configure video quality',
                  ),
                  _buildSettingItem(
                    icon: Icons.mic,
                    title: 'Audio Settings',
                    subtitle: 'Microphone and speakers',
                  ),
                  _buildSettingItem(
                    icon: Icons.network_check,
                    title: 'Connection Test',
                    subtitle: 'Check network quality',
                  ),
                  _buildSettingItem(
                    icon: Icons.security,
                    title: 'Privacy Settings',
                    subtitle: 'Data protection options',
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildVirtualAppointment({
    required String patientName,
    required String time,
    required String duration,
    required String type,
    required String status,
    required Color statusColor,
  }) {
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
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CircleAvatar(
                backgroundColor: AppColors.primary,
                child: Text(
                  patientName.split(' ').map((e) => e[0]).join(),
                  style: const TextStyle(color: Colors.white),
                ),
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
                    Text(
                      '$type • $duration',
                      style: const TextStyle(
                        color: AppColors.textLight,
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
                  status,
                  style: TextStyle(
                    color: statusColor,
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              const Icon(Icons.access_time, size: 16, color: AppColors.textLight),
              const SizedBox(width: 4),
              Text(
                time,
                style: const TextStyle(
                  color: AppColors.textLight,
                  fontSize: 14,
                ),
              ),
              const Spacer(),
              if (status == 'In Progress')
                ElevatedButton.icon(
                  onPressed: () => _joinCall(context, patientName),
                  icon: const Icon(Icons.video_call, size: 16),
                  label: const Text('Join'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.green,
                    foregroundColor: Colors.white,
                  ),
                )
              else if (status == 'Waiting')
                ElevatedButton.icon(
                  onPressed: () => _startCall(context, patientName),
                  icon: const Icon(Icons.play_arrow, size: 16),
                  label: const Text('Start'),
                )
              else
                OutlinedButton.icon(
                  onPressed: () => _prepareCall(context, patientName),
                  icon: const Icon(Icons.settings, size: 16),
                  label: const Text('Prepare'),
                ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildToolCard({
    required IconData icon,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
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
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 32, color: AppColors.primary),
            const SizedBox(height: 12),
            Text(
              title,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: AppColors.textDark,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              subtitle,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 12,
                color: AppColors.textLight,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSettingItem({
    required IconData icon,
    required String title,
    required String subtitle,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          Icon(icon, size: 20, color: AppColors.primary),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                    color: AppColors.textDark,
                  ),
                ),
                Text(
                  subtitle,
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppColors.textLight,
                  ),
                ),
              ],
            ),
          ),
          const Icon(Icons.chevron_right, color: AppColors.textLight),
        ],
      ),
    );
  }

  void _showInstantConsultationDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Instant Consultation'),
        content: const Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('Start an instant video consultation with any patient'),
            SizedBox(height: 16),
            Text('This will:'),
            Text('• Send an immediate invitation'),
            Text('• Set up the video call'),
            Text('• Start recording (optional)'),
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
                const SnackBar(content: Text('Setting up instant consultation...')),
              );
            },
            child: const Text('Start Call'),
          ),
        ],
      ),
    );
  }

  void _showScheduledConsultations(BuildContext context) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Loading scheduled consultations...')),
    );
  }

  void _joinCall(BuildContext context, String patientName) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Joining call with $patientName...')),
    );
  }

  void _startCall(BuildContext context, String patientName) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Starting call with $patientName...')),
    );
  }

  void _prepareCall(BuildContext context, String patientName) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Preparing call with $patientName...')),
    );
  }

  void _showToolInfo(BuildContext context, String tool) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(tool),
        content: Text('$tool is available during video consultations to enhance patient care.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }
}