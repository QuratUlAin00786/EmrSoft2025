import 'package:flutter/material.dart';
import '../utils/app_colors.dart';
import '../services/auth_service.dart';
import 'medical_history_screen.dart';
import 'prescriptions_screen.dart';
import 'appointments_screen.dart';
import 'notifications_screen.dart';
import 'login_screen.dart';
import 'lab_results_screen.dart';
import 'imaging_screen.dart';
import 'telemedicine_screen.dart';
import 'billing_screen.dart';
import 'voice_documentation_screen.dart';
import 'patient_portal_screen.dart';

// QA NAV - New Screens Import
import 'auth/register_screen.dart';
import 'auth/verify_otp_screen.dart';
import 'auth/forgot_password_screen.dart';
import 'auth/reset_password_screen.dart';
import 'appointments/appointment_detail_screen.dart';
import 'billing/invoice_detail_screen.dart';
import 'profile/edit_profile_screen.dart';
import 'insurance/insurance_screen.dart';
import 'dependents/dependents_screen.dart';
import 'labs/order_lab_test_screen.dart';
import 'imaging/order_imaging_screen.dart';
import 'documents/upload_document_screen.dart';
import 'notifications/notification_detail_screen.dart';
import 'settings/change_password_screen.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  int _selectedIndex = 0;
  Map<String, dynamic>? _user;

  @override
  void initState() {
    super.initState();
    _loadUserData();
  }

  _loadUserData() async {
    final authService = AuthService();
    final user = await authService.getUser();
    setState(() => _user = user);
  }

  void _onItemTapped(int index) {
    setState(() => _selectedIndex = index);
  }

  Future<void> _logout() async {
    final authService = AuthService();
    await authService.logout();
    if (mounted) {
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (context) => const LoginScreen()),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final List<Widget> pages = [
      _DashboardHome(user: _user),
      const MedicalHistoryScreen(),
      const PrescriptionsScreen(),
      const AppointmentsScreen(),
      const NotificationsScreen(),
    ];

    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'Cura Patient',
          style: TextStyle(fontWeight: FontWeight.w600),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: _logout,
          ),
        ],
      ),
      drawer: _buildNavigationDrawer(context),
      body: pages[_selectedIndex],
      bottomNavigationBar: BottomNavigationBar(
        type: BottomNavigationBarType.fixed,
        currentIndex: _selectedIndex,
        onTap: _onItemTapped,
        selectedItemColor: AppColors.primary,
        unselectedItemColor: AppColors.textLight,
        backgroundColor: Colors.white,
        elevation: 8,
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.dashboard),
            label: 'Dashboard',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.history),
            label: 'History',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.medication),
            label: 'Prescriptions',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.calendar_today),
            label: 'Appointments',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.notifications),
            label: 'Alerts',
          ),
        ],
      ),
    );
  }

  Widget _buildNavigationDrawer(BuildContext context) {
    return Drawer(
      child: ListView(
        padding: EdgeInsets.zero,
        children: [
          DrawerHeader(
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                colors: [AppColors.primary, AppColors.secondary],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const CircleAvatar(
                  radius: 30,
                  backgroundColor: Colors.white,
                  child: Icon(
                    Icons.person,
                    size: 35,
                    color: AppColors.primary,
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  _user?['firstName'] ?? 'Patient',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                Text(
                  _user?['email'] ?? 'patient@cura.health',
                  style: TextStyle(
                    color: Colors.white.withOpacity(0.9),
                    fontSize: 14,
                  ),
                ),
              ],
            ),
          ),
          _buildDrawerItem(
            icon: Icons.dashboard,
            title: 'Dashboard',
            onTap: () => _navigateToIndex(0),
          ),
          _buildDrawerItem(
            icon: Icons.history,
            title: 'Medical History',
            onTap: () => _navigateToIndex(1),
          ),
          _buildDrawerItem(
            icon: Icons.medication,
            title: 'Prescriptions',
            onTap: () => _navigateToIndex(2),
          ),
          _buildDrawerItem(
            icon: Icons.calendar_today,
            title: 'Appointments',
            onTap: () => _navigateToIndex(3),
          ),
          _buildDrawerItem(
            icon: Icons.science,
            title: 'Lab Results',
            onTap: () => _navigateToScreen(const LabResultsScreen()),
          ),
          _buildDrawerItem(
            icon: Icons.image,
            title: 'Medical Imaging',
            onTap: () => _navigateToScreen(const ImagingScreen()),
          ),
          _buildDrawerItem(
            icon: Icons.video_call,
            title: 'Telemedicine',
            onTap: () => _navigateToScreen(const TelemedicineScreen()),
          ),
          _buildDrawerItem(
            icon: Icons.receipt_long,
            title: 'Billing & Payments',
            onTap: () => _navigateToScreen(const BillingScreen()),
          ),
          _buildDrawerItem(
            icon: Icons.mic,
            title: 'Voice Documentation',
            onTap: () => _navigateToScreen(const VoiceDocumentationScreen()),
          ),
          _buildDrawerItem(
            icon: Icons.web,
            title: 'Patient Portal',
            onTap: () => _navigateToScreen(const PatientPortalScreen()),
          ),
          _buildDrawerItem(
            icon: Icons.notifications,
            title: 'Notifications & Alerts',
            onTap: () => _navigateToIndex(4),
          ),
          const Divider(),
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
            child: Text(
              'QA NAV - Testing Screens',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.bold,
                color: Colors.red,
              ),
            ),
          ),
          _buildDrawerItem(
            icon: Icons.person_add,
            title: 'RegisterScreen',
            onTap: () => _navigateToScreen(const RegisterScreen()),
          ),
          _buildDrawerItem(
            icon: Icons.verified,
            title: 'VerifyOTPScreen',
            onTap: () => _navigateToScreen(const VerifyOTPScreen()),
          ),
          _buildDrawerItem(
            icon: Icons.lock_reset,
            title: 'ForgotPasswordScreen',
            onTap: () => _navigateToScreen(const ForgotPasswordScreen()),
          ),
          _buildDrawerItem(
            icon: Icons.lock_open,
            title: 'ResetPasswordScreen',
            onTap: () => _navigateToScreen(const ResetPasswordScreen()),
          ),
          _buildDrawerItem(
            icon: Icons.event_note,
            title: 'AppointmentDetailScreen',
            onTap: () => _navigateToScreen(const AppointmentDetailScreen()),
          ),
          _buildDrawerItem(
            icon: Icons.receipt,
            title: 'InvoiceDetailScreen',
            onTap: () => _navigateToScreen(const InvoiceDetailScreen()),
          ),
          _buildDrawerItem(
            icon: Icons.edit,
            title: 'EditProfileScreen',
            onTap: () => _navigateToScreen(const EditProfileScreen()),
          ),
          _buildDrawerItem(
            icon: Icons.security,
            title: 'InsuranceScreen',
            onTap: () => _navigateToScreen(const InsuranceScreen()),
          ),
          _buildDrawerItem(
            icon: Icons.family_restroom,
            title: 'DependentsScreen',
            onTap: () => _navigateToScreen(const DependentsScreen()),
          ),
          _buildDrawerItem(
            icon: Icons.biotech,
            title: 'OrderLabTestScreen',
            onTap: () => _navigateToScreen(const OrderLabTestScreen()),
          ),
          _buildDrawerItem(
            icon: Icons.camera_alt,
            title: 'OrderImagingScreen',
            onTap: () => _navigateToScreen(const OrderImagingScreen()),
          ),
          _buildDrawerItem(
            icon: Icons.upload_file,
            title: 'UploadDocumentScreen',
            onTap: () => _navigateToScreen(const UploadDocumentScreen()),
          ),
          _buildDrawerItem(
            icon: Icons.notification_important,
            title: 'NotificationDetailScreen',
            onTap: () => _navigateToScreen(const NotificationDetailScreen()),
          ),
          _buildDrawerItem(
            icon: Icons.password,
            title: 'ChangePasswordScreen',
            onTap: () => _navigateToScreen(const ChangePasswordScreen()),
          ),
          const Divider(),
          _buildDrawerItem(
            icon: Icons.help_outline,
            title: 'Help & Support',
            onTap: () => _showComingSoon(context, 'Help & Support'),
          ),
          _buildDrawerItem(
            icon: Icons.settings,
            title: 'Settings',
            onTap: () => _showComingSoon(context, 'Settings'),
          ),
          _buildDrawerItem(
            icon: Icons.logout,
            title: 'Logout',
            onTap: _logout,
          ),
        ],
      ),
    );
  }

  Widget _buildDrawerItem({
    required IconData icon,
    required String title,
    required VoidCallback onTap,
  }) {
    return ListTile(
      leading: Icon(icon, color: AppColors.primary),
      title: Text(
        title,
        style: const TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.w500,
        ),
      ),
      onTap: () {
        Navigator.pop(context); // Close drawer
        onTap();
      },
    );
  }

  void _navigateToIndex(int index) {
    setState(() => _selectedIndex = index);
  }

  void _navigateToScreen(Widget screen) {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => screen),
    );
  }

  void _showComingSoon(BuildContext context, String feature) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('$feature'),
        content: Text('$feature functionality is coming soon in the next update!'),
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

class _DashboardHome extends StatelessWidget {
  final Map<String, dynamic>? user;

  const _DashboardHome({this.user});

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Welcome Card
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
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Welcome back,',
                  style: TextStyle(
                    color: Colors.white.withOpacity(0.9),
                    fontSize: 16,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  user?['firstName'] ?? 'Patient',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 16),
                const Text(
                  'Your health is our priority. Stay connected with your care team.',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 14,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // Quick Stats
          Row(
            children: [
              Expanded(
                child: _QuickStatCard(
                  icon: Icons.calendar_today,
                  title: 'Next Appointment',
                  subtitle: 'Today, 2:30 PM',
                  color: AppColors.accent,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _QuickStatCard(
                  icon: Icons.medication,
                  title: 'Active Meds',
                  subtitle: '3 Prescriptions',
                  color: AppColors.warning,
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),

          // Quick Actions
          const Text(
            'Quick Actions',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: AppColors.textDark,
            ),
          ),
          const SizedBox(height: 16),
          GridView.count(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisCount: 2,
            crossAxisSpacing: 12,
            mainAxisSpacing: 12,
            childAspectRatio: 1.2,
            children: [
              _ActionCard(
                icon: Icons.history,
                title: 'Medical History',
                subtitle: 'View records',
                onTap: () => Navigator.push(
                  context,
                  MaterialPageRoute(builder: (context) => const MedicalHistoryScreen()),
                ),
              ),
              _ActionCard(
                icon: Icons.medication,
                title: 'Prescriptions',
                subtitle: 'Manage meds',
                onTap: () => Navigator.push(
                  context,
                  MaterialPageRoute(builder: (context) => const PrescriptionsScreen()),
                ),
              ),
              _ActionCard(
                icon: Icons.add_circle,
                title: 'Book Appointment',
                subtitle: 'Schedule visit',
                onTap: () => Navigator.push(
                  context,
                  MaterialPageRoute(builder: (context) => const AppointmentsScreen()),
                ),
              ),
              _ActionCard(
                icon: Icons.refresh,
                title: 'Request Refill',
                subtitle: 'Medicine refill',
                onTap: () => Navigator.push(
                  context,
                  MaterialPageRoute(builder: (context) => const PrescriptionsScreen()),
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),

          // Recent Activity
          const Text(
            'Recent Activity',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: AppColors.textDark,
            ),
          ),
          const SizedBox(height: 16),
          _ActivityCard(
            icon: Icons.calendar_today,
            title: 'Appointment Scheduled',
            subtitle: 'Dr. Smith - Cardiology',
            time: '2 hours ago',
          ),
          const SizedBox(height: 12),
          _ActivityCard(
            icon: Icons.medication,
            title: 'Prescription Updated',
            subtitle: 'Lisinopril 10mg',
            time: '1 day ago',
          ),
          const SizedBox(height: 12),
          _ActivityCard(
            icon: Icons.assessment,
            title: 'Lab Results Available',
            subtitle: 'Blood work completed',
            time: '3 days ago',
          ),
        ],
      ),
    );
  }
}

class _QuickStatCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final Color color;

  const _QuickStatCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: color, size: 24),
          const SizedBox(height: 8),
          Text(
            title,
            style: const TextStyle(
              fontSize: 12,
              color: AppColors.textLight,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            subtitle,
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: AppColors.textDark,
            ),
          ),
        ],
      ),
    );
  }
}

class _ActionCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  const _ActionCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.border),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: AppColors.primary, size: 32),
            const SizedBox(height: 12),
            Text(
              title,
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: AppColors.textDark,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 4),
            Text(
              subtitle,
              style: const TextStyle(
                fontSize: 12,
                color: AppColors.textLight,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}

class _ActivityCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final String time;

  const _ActivityCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.time,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: AppColors.primary.withOpacity(0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, color: AppColors.primary, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textDark,
                  ),
                ),
                const SizedBox(height: 4),
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
          Text(
            time,
            style: const TextStyle(
              fontSize: 12,
              color: AppColors.textMuted,
            ),
          ),
        ],
      ),
    );
  }
}