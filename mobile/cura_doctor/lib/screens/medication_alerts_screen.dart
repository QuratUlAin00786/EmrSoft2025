import 'package:flutter/material.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import '../services/auth_service.dart';
import '../utils/app_colors.dart';
import 'package:intl/intl.dart';

class MedicationAlertsScreen extends StatefulWidget {
  const MedicationAlertsScreen({super.key});

  @override
  State<MedicationAlertsScreen> createState() => _MedicationAlertsScreenState();
}

class _MedicationAlertsScreenState extends State<MedicationAlertsScreen> {
  List<dynamic> _alerts = [];
  bool _isLoading = true;
  String _error = '';
  String _selectedFilter = 'all';

  @override
  void initState() {
    super.initState();
    _loadAlerts();
  }

  Future<void> _loadAlerts() async {
    try {
      final authService = AuthService();
      final headers = await authService.getAuthHeaders();
      
      final response = await http.get(
        Uri.parse('${authService.baseUrl}/medication-alerts'),
        headers: headers,
      );

      if (response.statusCode == 200) {
        setState(() {
          _alerts = jsonDecode(response.body);
          _isLoading = false;
        });
      } else {
        setState(() {
          _error = 'Failed to load medication alerts';
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

  Future<void> _markAsRead(String alertId) async {
    try {
      final authService = AuthService();
      final headers = await authService.getAuthHeaders();
      
      await http.patch(
        Uri.parse('${authService.baseUrl}/medication-alerts/$alertId/read'),
        headers: headers,
      );

      // Update local state
      setState(() {
        final index = _alerts.indexWhere((alert) => alert['id'].toString() == alertId);
        if (index != -1) {
          _alerts[index]['isRead'] = true;
        }
      });
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error: ${e.toString()}'),
          backgroundColor: AppColors.error,
        ),
      );
    }
  }

  Future<void> _resolveAlert(String alertId) async {
    try {
      final authService = AuthService();
      final headers = await authService.getAuthHeaders();
      
      await http.patch(
        Uri.parse('${authService.baseUrl}/medication-alerts/$alertId/resolve'),
        headers: headers,
      );

      // Update local state
      setState(() {
        final index = _alerts.indexWhere((alert) => alert['id'].toString() == alertId);
        if (index != -1) {
          _alerts[index]['status'] = 'resolved';
        }
      });

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Alert resolved successfully'),
          backgroundColor: AppColors.accent,
        ),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error: ${e.toString()}'),
          backgroundColor: AppColors.error,
        ),
      );
    }
  }

  List<dynamic> get _filteredAlerts {
    switch (_selectedFilter) {
      case 'unread':
        return _alerts.where((alert) => alert['isRead'] != true).toList();
      case 'high':
        return _alerts.where((alert) => alert['priority']?.toLowerCase() == 'high').toList();
      case 'medium':
        return _alerts.where((alert) => alert['priority']?.toLowerCase() == 'medium').toList();
      case 'low':
        return _alerts.where((alert) => alert['priority']?.toLowerCase() == 'low').toList();
      default:
        return _alerts;
    }
  }

  @override
  Widget build(BuildContext context) {
    final filteredAlerts = _filteredAlerts;
    final unreadCount = _alerts.where((alert) => alert['isRead'] != true).length;

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Medication Alerts'),
            if (unreadCount > 0)
              Text(
                '$unreadCount unread alerts',
                style: const TextStyle(
                  fontSize: 12,
                  color: AppColors.textLight,
                ),
              ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
              setState(() => _isLoading = true);
              _loadAlerts();
            },
          ),
          PopupMenuButton<String>(
            icon: const Icon(Icons.filter_list),
            onSelected: (value) {
              setState(() => _selectedFilter = value);
            },
            itemBuilder: (context) => [
              const PopupMenuItem(value: 'all', child: Text('All Alerts')),
              const PopupMenuItem(value: 'unread', child: Text('Unread Only')),
              const PopupMenuDivider(),
              const PopupMenuItem(value: 'high', child: Text('High Priority')),
              const PopupMenuItem(value: 'medium', child: Text('Medium Priority')),
              const PopupMenuItem(value: 'low', child: Text('Low Priority')),
            ],
          ),
        ],
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
                          _loadAlerts();
                        },
                        child: const Text('Retry'),
                      ),
                    ],
                  ),
                )
              : filteredAlerts.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.medication_outlined,
                            size: 64,
                            color: AppColors.textMuted,
                          ),
                          const SizedBox(height: 16),
                          Text(
                            _selectedFilter == 'all'
                                ? 'No medication alerts'
                                : 'No alerts matching the filter',
                            style: const TextStyle(
                              fontSize: 16,
                              color: AppColors.textLight,
                            ),
                          ),
                        ],
                      ),
                    )
                  : Column(
                      children: [
                        // Filter Chips
                        Container(
                          height: 60,
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          child: ListView(
                            scrollDirection: Axis.horizontal,
                            children: [
                              _FilterChip('all', 'All', _selectedFilter == 'all'),
                              _FilterChip('unread', 'Unread', _selectedFilter == 'unread'),
                              _FilterChip('high', 'High', _selectedFilter == 'high'),
                              _FilterChip('medium', 'Medium', _selectedFilter == 'medium'),
                              _FilterChip('low', 'Low', _selectedFilter == 'low'),
                            ],
                          ),
                        ),
                        // Alerts List
                        Expanded(
                          child: RefreshIndicator(
                            onRefresh: () async {
                              setState(() => _isLoading = true);
                              await _loadAlerts();
                            },
                            child: ListView.builder(
                              padding: const EdgeInsets.all(16),
                              itemCount: filteredAlerts.length,
                              itemBuilder: (context, index) {
                                final alert = filteredAlerts[index];
                                return _MedicationAlertCard(
                                  alert: alert,
                                  onMarkAsRead: () => _markAsRead(alert['id'].toString()),
                                  onResolve: () => _resolveAlert(alert['id'].toString()),
                                );
                              },
                            ),
                          ),
                        ),
                      ],
                    ),
    );
  }

  Widget _FilterChip(String value, String label, bool isSelected) {
    return Container(
      margin: const EdgeInsets.only(right: 8),
      child: FilterChip(
        label: Text(label),
        selected: isSelected,
        onSelected: (selected) {
          setState(() => _selectedFilter = value);
        },
        selectedColor: AppColors.primary.withOpacity(0.2),
        checkmarkColor: AppColors.primary,
      ),
    );
  }
}

class _MedicationAlertCard extends StatelessWidget {
  final Map<String, dynamic> alert;
  final VoidCallback onMarkAsRead;
  final VoidCallback onResolve;

  const _MedicationAlertCard({
    required this.alert,
    required this.onMarkAsRead,
    required this.onResolve,
  });

  @override
  Widget build(BuildContext context) {
    final isRead = alert['isRead'] == true;
    final priority = alert['priority']?.toLowerCase() ?? 'medium';
    final status = alert['status']?.toLowerCase() ?? 'active';
    final createdAt = DateTime.parse(alert['createdAt'] ?? DateTime.now().toIso8601String());
    final timeAgo = _getTimeAgo(createdAt);

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isRead ? Colors.white : AppColors.primary.withOpacity(0.05),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: _getPriorityColor(priority).withOpacity(0.3),
          width: status == 'resolved' ? 1 : 2,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: _getPriorityColor(priority).withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(
                  _getAlertIcon(alert['type']),
                  color: _getPriorityColor(priority),
                  size: 20,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            alert['patientName'] ?? 'Unknown Patient',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: isRead ? FontWeight.w500 : FontWeight.w600,
                              color: AppColors.textDark,
                            ),
                          ),
                        ),
                        if (!isRead)
                          Container(
                            width: 8,
                            height: 8,
                            decoration: BoxDecoration(
                              color: _getPriorityColor(priority),
                              shape: BoxShape.circle,
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      alert['medicationName'] ?? 'Unknown Medication',
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                        color: AppColors.textLight,
                      ),
                    ),
                    if (alert['message'] != null) ...[
                      const SizedBox(height: 8),
                      Text(
                        alert['message'],
                        style: TextStyle(
                          fontSize: 14,
                          color: isRead ? AppColors.textLight : AppColors.textDark,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: _getPriorityColor(priority).withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  '${priority.toUpperCase()} PRIORITY',
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w600,
                    color: _getPriorityColor(priority),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: status == 'resolved' 
                      ? AppColors.accent.withOpacity(0.1) 
                      : AppColors.warning.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  status.toUpperCase(),
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w600,
                    color: status == 'resolved' ? AppColors.accent : AppColors.warning,
                  ),
                ),
              ),
              const Spacer(),
              Text(
                timeAgo,
                style: const TextStyle(
                  fontSize: 12,
                  color: AppColors.textMuted,
                ),
              ),
            ],
          ),
          if (status != 'resolved') ...[
            const SizedBox(height: 16),
            Row(
              children: [
                if (!isRead)
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: onMarkAsRead,
                      icon: const Icon(Icons.mark_email_read, size: 16),
                      label: const Text('Mark Read'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppColors.primary,
                        side: const BorderSide(color: AppColors.primary),
                        padding: const EdgeInsets.symmetric(vertical: 8),
                      ),
                    ),
                  ),
                if (!isRead) const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: onResolve,
                    icon: const Icon(Icons.check_circle, size: 16),
                    label: const Text('Resolve'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.accent,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 8),
                    ),
                  ),
                ),
              ],
            ),
          ] else ...[
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.accent.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  Icon(
                    Icons.check_circle,
                    color: AppColors.accent,
                    size: 16,
                  ),
                  const SizedBox(width: 8),
                  const Text(
                    'Alert resolved',
                    style: TextStyle(
                      fontSize: 12,
                      color: AppColors.accent,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  IconData _getAlertIcon(String? type) {
    switch (type?.toLowerCase()) {
      case 'refill_request':
        return Icons.refresh;
      case 'drug_interaction':
        return Icons.warning;
      case 'dosage_change':
        return Icons.edit;
      case 'side_effect':
        return Icons.report_problem;
      case 'adherence':
        return Icons.schedule;
      default:
        return Icons.medication;
    }
  }

  Color _getPriorityColor(String priority) {
    switch (priority.toLowerCase()) {
      case 'high':
        return AppColors.error;
      case 'medium':
        return AppColors.warning;
      case 'low':
        return AppColors.accent;
      default:
        return AppColors.textLight;
    }
  }

  String _getTimeAgo(DateTime dateTime) {
    final now = DateTime.now();
    final difference = now.difference(dateTime);

    if (difference.inDays > 7) {
      return DateFormat('MMM dd').format(dateTime);
    } else if (difference.inDays > 0) {
      return '${difference.inDays}d ago';
    } else if (difference.inHours > 0) {
      return '${difference.inHours}h ago';
    } else if (difference.inMinutes > 0) {
      return '${difference.inMinutes}m ago';
    } else {
      return 'Just now';
    }
  }
}