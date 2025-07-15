import 'package:flutter/material.dart';
import '../utils/app_colors.dart';
import '../services/auth_service.dart';
import 'appointments_screen.dart';
import 'patients_screen.dart';
import 'medication_alerts_screen.dart';
import 'login_screen.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'prescriptions_screen.dart';
import 'analytics_screen.dart';
import 'telemedicine_screen.dart';
import 'lab_results_screen.dart';
import 'imaging_screen.dart';
import 'voice_documentation_screen.dart';
import 'ai_insights_screen.dart';
import 'messaging_screen.dart';

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
      _DashboardHome(
        user: _user,
        onNavigateToPatients: () => _navigateToIndex(2),
      ),
      const AppointmentsScreen(),
      const PatientsScreen(),
      const MedicationAlertsScreen(),
    ];

    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'Cura Doctor',
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
            icon: Icon(Icons.calendar_today),
            label: 'Appointments',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.people),
            label: 'Patients',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.notification_important),
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
                    Icons.local_hospital,
                    size: 35,
                    color: AppColors.primary,
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  'Dr. ${_user?['firstName'] ?? 'Doctor'}',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                Text(
                  _user?['email'] ?? 'doctor@cura.health',
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
            icon: Icons.calendar_today,
            title: 'Appointments',
            onTap: () => _navigateToIndex(1),
          ),
          _buildDrawerItem(
            icon: Icons.people,
            title: 'Patients',
            onTap: () => _navigateToIndex(2),
          ),
          _buildDrawerItem(
            icon: Icons.medication,
            title: 'Prescriptions',
            onTap: () => _navigateToScreen(const PrescriptionsScreen()),
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
            icon: Icons.mic,
            title: 'Voice Documentation',
            onTap: () => _navigateToScreen(const VoiceDocumentationScreen()),
          ),
          _buildDrawerItem(
            icon: Icons.psychology,
            title: 'AI Clinical Insights',
            onTap: () => _navigateToScreen(const AiInsightsScreen()),
          ),
          _buildDrawerItem(
            icon: Icons.message,
            title: 'Secure Messaging',
            onTap: () => _navigateToScreen(const MessagingScreen()),
          ),
          _buildDrawerItem(
            icon: Icons.analytics,
            title: 'Analytics & Reports',
            onTap: () => _navigateToScreen(const AnalyticsScreen()),
          ),
          _buildDrawerItem(
            icon: Icons.notification_important,
            title: 'Medication Alerts',
            onTap: () => _navigateToIndex(3),
          ),
          const Divider(),
          _buildDrawerItem(
            icon: Icons.help_outline,
            title: 'Clinical Guidelines',
            onTap: () => _showComingSoon(context, 'Clinical Guidelines'),
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

class _DashboardHome extends StatefulWidget {
  final Map<String, dynamic>? user;
  final VoidCallback? onNavigateToPatients;

  const _DashboardHome({this.user, this.onNavigateToPatients});

  @override
  State<_DashboardHome> createState() => _DashboardHomeState();
}

class _DashboardHomeState extends State<_DashboardHome> {
  Map<String, dynamic> _stats = {};
  List<dynamic> _todayAppointments = [];
  List<dynamic> _medicationAlerts = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadDashboardData();
  }

  Future<void> _loadDashboardData() async {
    try {
      final authService = AuthService();
      final headers = await authService.getAuthHeaders();
      
      // Load dashboard stats
      final statsResponse = await http.get(
        Uri.parse('${authService.baseUrl}/dashboard/doctor-stats'),
        headers: headers,
      );
      
      // Load today's appointments
      final appointmentsResponse = await http.get(
        Uri.parse('${authService.baseUrl}/appointments/today'),
        headers: headers,
      );
      
      // Load medication alerts
      final alertsResponse = await http.get(
        Uri.parse('${authService.baseUrl}/medication-alerts'),
        headers: headers,
      );

      if (statsResponse.statusCode == 200) {
        _stats = jsonDecode(statsResponse.body);
      }
      
      if (appointmentsResponse.statusCode == 200) {
        _todayAppointments = jsonDecode(appointmentsResponse.body);
      }
      
      if (alertsResponse.statusCode == 200) {
        _medicationAlerts = jsonDecode(alertsResponse.body);
      }

      setState(() => _isLoading = false);
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

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
                  'Dr. ${widget.user?['firstName'] ?? 'Doctor'}',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 16),
                const Text(
                  'Ready to provide exceptional patient care today.',
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
          if (_isLoading)
            const Center(child: CircularProgressIndicator())
          else
            Row(
              children: [
                Expanded(
                  child: _QuickStatCard(
                    icon: Icons.calendar_today,
                    title: 'Today\'s Appointments',
                    value: '${_todayAppointments.length}',
                    color: AppColors.primary,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _QuickStatCard(
                    icon: Icons.people,
                    title: 'Total Patients',
                    value: '${_stats['totalPatients'] ?? 0}',
                    color: AppColors.accent,
                    onTap: () {
                      print('Total Patients card tapped!');
                      widget.onNavigateToPatients?.call();
                    },
                  ),
                ),
              ],
            ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _QuickStatCard(
                  icon: Icons.notification_important,
                  title: 'Medication Alerts',
                  value: '${_medicationAlerts.length}',
                  color: AppColors.warning,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _QuickStatCard(
                  icon: Icons.check_circle,
                  title: 'Completed Today',
                  value: '${_stats['completedToday'] ?? 0}',
                  color: AppColors.accent,
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),

          // Today's Appointments
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Today\'s Appointments',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: AppColors.textDark,
                ),
              ),
              TextButton(
                onPressed: () => Navigator.push(
                  context,
                  MaterialPageRoute(builder: (context) => const AppointmentsScreen()),
                ),
                child: const Text('View All'),
              ),
            ],
          ),
          const SizedBox(height: 16),
          
          if (_todayAppointments.isEmpty)
            Container(
              padding: const EdgeInsets.all(32),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.border),
              ),
              child: const Center(
                child: Column(
                  children: [
                    Icon(
                      Icons.event_available,
                      size: 48,
                      color: AppColors.textMuted,
                    ),
                    SizedBox(height: 16),
                    Text(
                      'No appointments today',
                      style: TextStyle(
                        fontSize: 16,
                        color: AppColors.textLight,
                      ),
                    ),
                  ],
                ),
              ),
            )
          else
            Column(
              children: _todayAppointments.take(3).map((appointment) {
                return _AppointmentCard(appointment: appointment);
              }).toList(),
            ),
          
          const SizedBox(height: 24),

          // Medication Alerts
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Medication Alerts',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: AppColors.textDark,
                ),
              ),
              TextButton(
                onPressed: () => Navigator.push(
                  context,
                  MaterialPageRoute(builder: (context) => const MedicationAlertsScreen()),
                ),
                child: const Text('View All'),
              ),
            ],
          ),
          const SizedBox(height: 16),
          
          if (_medicationAlerts.isEmpty)
            Container(
              padding: const EdgeInsets.all(32),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.border),
              ),
              child: const Center(
                child: Column(
                  children: [
                    Icon(
                      Icons.medication,
                      size: 48,
                      color: AppColors.textMuted,
                    ),
                    SizedBox(height: 16),
                    Text(
                      'No medication alerts',
                      style: TextStyle(
                        fontSize: 16,
                        color: AppColors.textLight,
                      ),
                    ),
                  ],
                ),
              ),
            )
          else
            Column(
              children: _medicationAlerts.take(3).map((alert) {
                return _MedicationAlertCard(alert: alert);
              }).toList(),
            ),
        ],
      ),
    );
  }
}

class _QuickStatCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String value;
  final Color color;
  final VoidCallback? onTap;

  const _QuickStatCard({
    required this.icon,
    required this.title,
    required this.value,
    required this.color,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.border),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(icon, color: color, size: 24),
                  const Spacer(),
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
                style: const TextStyle(
                  fontSize: 12,
                  color: AppColors.textLight,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _AppointmentCard extends StatelessWidget {
  final Map<String, dynamic> appointment;

  const _AppointmentCard({required this.appointment});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
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
            child: const Icon(
              Icons.person,
              color: AppColors.primary,
              size: 20,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  appointment['patientName'] ?? 'Unknown Patient',
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textDark,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  appointment['type'] ?? 'Consultation',
                  style: const TextStyle(
                    fontSize: 14,
                    color: AppColors.textLight,
                  ),
                ),
              ],
            ),
          ),
          Text(
            appointment['time'] ?? '00:00',
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

class _MedicationAlertCard extends StatelessWidget {
  final Map<String, dynamic> alert;

  const _MedicationAlertCard({required this.alert});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.warning),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: AppColors.warning.withOpacity(0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: const Icon(
              Icons.warning,
              color: AppColors.warning,
              size: 20,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  alert['patientName'] ?? 'Unknown Patient',
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textDark,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  alert['message'] ?? 'Medication alert',
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
              color: AppColors.error.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text(
              alert['priority'] ?? 'High',
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w500,
                color: AppColors.error,
              ),
            ),
          ),
        ],
      ),
    );
  }
}