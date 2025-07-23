import 'package:flutter/material.dart';
import '../../services/api_service.dart';
import '../../theme/app_theme.dart';
import '../../utils/app_colors.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  bool _isLoading = true;
  List<Map<String, dynamic>> _notifications = [];
  int _unreadCount = 0;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    _loadNotifications();
  }

  Future<void> _loadNotifications() async {
    try {
      final notifications = await ApiService.getDoctorNotifications();
      setState(() {
        _notifications = List<Map<String, dynamic>>.from(notifications);
        _unreadCount = _notifications.where((n) => !n['isRead']).length;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to load notifications: $e'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    }
  }

  List<Map<String, dynamic>> get _allNotifications => _notifications;
  List<Map<String, dynamic>> get _unreadNotifications => 
      _notifications.where((n) => !n['isRead']).toList();
  List<Map<String, dynamic>> get _emergencyNotifications => 
      _notifications.where((n) => n['priority'] == 'high' || n['type'] == 'emergency').toList();
  List<Map<String, dynamic>> get _appointmentNotifications => 
      _notifications.where((n) => n['type'] == 'appointment').toList();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Row(
          children: [
            const Text('Notifications'),
            if (_unreadCount > 0) ...[
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: AppColors.error,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  _unreadCount.toString(),
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ],
        ),
        backgroundColor: Colors.white,
        foregroundColor: AppColors.textPrimary,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.mark_email_read),
            onPressed: _markAllAsRead,
            tooltip: 'Mark all as read',
          ),
          PopupMenuButton(
            icon: const Icon(Icons.more_vert),
            itemBuilder: (context) => [
              const PopupMenuItem(
                value: 'settings',
                child: Row(
                  children: [
                    Icon(Icons.settings),
                    SizedBox(width: 8),
                    Text('Notification Settings'),
                  ],
                ),
              ),
              const PopupMenuItem(
                value: 'clear',
                child: Row(
                  children: [
                    Icon(Icons.clear_all),
                    SizedBox(width: 8),
                    Text('Clear All'),
                  ],
                ),
              ),
            ],
            onSelected: (value) {
              if (value == 'settings') {
                _showNotificationSettings();
              } else if (value == 'clear') {
                _clearAllNotifications();
              }
            },
          ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(49),
          child: Container(
            color: Colors.white,
            child: TabBar(
              controller: _tabController,
              isScrollable: true,
              labelColor: AppColors.primary,
              unselectedLabelColor: AppColors.textSecondary,
              indicatorColor: AppColors.primary,
              tabs: [
                Tab(text: 'All (${_allNotifications.length})'),
                Tab(text: 'Unread (${_unreadNotifications.length})'),
                Tab(text: 'Emergency (${_emergencyNotifications.length})'),
                Tab(text: 'Appointments (${_appointmentNotifications.length})'),
              ],
            ),
          ),
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : TabBarView(
              controller: _tabController,
              children: [
                _buildNotificationsList(_allNotifications, 'No notifications'),
                _buildNotificationsList(_unreadNotifications, 'No unread notifications'),
                _buildNotificationsList(_emergencyNotifications, 'No emergency notifications'),
                _buildNotificationsList(_appointmentNotifications, 'No appointment notifications'),
              ],
            ),
    );
  }

  Widget _buildNotificationsList(List<Map<String, dynamic>> notifications, String emptyMessage) {
    if (notifications.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.notifications_none,
              size: 64,
              color: AppColors.textSecondary,
            ),
            const SizedBox(height: 16),
            Text(
              emptyMessage,
              style: TextStyle(
                fontSize: 16,
                color: AppColors.textSecondary,
              ),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadNotifications,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: notifications.length,
        itemBuilder: (context, index) {
          final notification = notifications[index];
          return _buildNotificationCard(notification);
        },
      ),
    );
  }

  Widget _buildNotificationCard(Map<String, dynamic> notification) {
    final isRead = notification['isRead'] ?? false;
    final priority = notification['priority'] ?? 'normal';
    final type = notification['type'] ?? 'general';
    final createdAt = DateTime.parse(notification['createdAt']);

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
        border: !isRead
            ? Border.all(color: AppColors.primary.withOpacity(0.3), width: 1)
            : null,
      ),
      child: InkWell(
        onTap: () => _markAsRead(notification),
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Row(
                children: [
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: _getTypeColor(type).withOpacity(0.1),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Icon(
                      _getTypeIcon(type),
                      color: _getTypeColor(type),
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
                                notification['title'] ?? 'Notification',
                                style: TextStyle(
                                  fontWeight: isRead ? FontWeight.w500 : FontWeight.bold,
                                  fontSize: 16,
                                ),
                              ),
                            ),
                            if (priority == 'high')
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: AppColors.error,
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: const Text(
                                  'URGENT',
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontSize: 8,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(
                          _formatTimeAgo(createdAt),
                          style: TextStyle(
                            color: AppColors.textSecondary,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ),
                  if (!isRead)
                    Container(
                      width: 8,
                      height: 8,
                      decoration: BoxDecoration(
                        color: AppColors.primary,
                        borderRadius: BorderRadius.circular(4),
                      ),
                    ),
                ],
              ),

              const SizedBox(height: 12),

              // Message
              Text(
                notification['message'] ?? 'No message content',
                style: TextStyle(
                  color: isRead ? AppColors.textSecondary : AppColors.textPrimary,
                  fontSize: 14,
                  height: 1.4,
                ),
              ),

              // Additional data
              if (notification['patientName'] != null ||
                  notification['appointmentTime'] != null ||
                  notification['medicationName'] != null) ...[
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.background,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (notification['patientName'] != null)
                        _buildInfoRow('Patient', notification['patientName']),
                      if (notification['appointmentTime'] != null)
                        _buildInfoRow('Time', notification['appointmentTime']),
                      if (notification['medicationName'] != null)
                        _buildInfoRow('Medication', notification['medicationName']),
                      if (notification['labTestName'] != null)
                        _buildInfoRow('Lab Test', notification['labTestName']),
                    ],
                  ),
                ),
              ],

              // Action buttons
              if (notification['actionRequired'] == true) ...[
                const SizedBox(height: 12),
                Row(
                  children: [
                    ElevatedButton.icon(
                      onPressed: () => _handleNotificationAction(notification),
                      icon: const Icon(Icons.check, size: 16),
                      label: Text(_getActionLabel(type)),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        minimumSize: Size.zero,
                        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                        textStyle: const TextStyle(fontSize: 12),
                      ),
                    ),
                    const SizedBox(width: 8),
                    OutlinedButton.icon(
                      onPressed: () => _dismissNotification(notification),
                      icon: const Icon(Icons.close, size: 16),
                      label: const Text('Dismiss'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppColors.textSecondary,
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        minimumSize: Size.zero,
                        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                        textStyle: const TextStyle(fontSize: 12),
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

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Row(
        children: [
          Text(
            '$label: ',
            style: TextStyle(
              color: AppColors.textSecondary,
              fontSize: 12,
              fontWeight: FontWeight.w500,
            ),
          ),
          Text(
            value,
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  Color _getTypeColor(String type) {
    switch (type.toLowerCase()) {
      case 'emergency':
        return AppColors.error;
      case 'appointment':
        return AppColors.primary;
      case 'medication':
        return Colors.orange;
      case 'lab_result':
        return Colors.purple;
      case 'system':
        return Colors.grey;
      default:
        return AppColors.primary;
    }
  }

  IconData _getTypeIcon(String type) {
    switch (type.toLowerCase()) {
      case 'emergency':
        return Icons.emergency;
      case 'appointment':
        return Icons.calendar_today;
      case 'medication':
        return Icons.medication;
      case 'lab_result':
        return Icons.science;
      case 'system':
        return Icons.settings;
      case 'message':
        return Icons.message;
      default:
        return Icons.notifications;
    }
  }

  String _getActionLabel(String type) {
    switch (type.toLowerCase()) {
      case 'appointment':
        return 'View Appointment';
      case 'medication':
        return 'Review Medication';
      case 'lab_result':
        return 'View Results';
      case 'emergency':
        return 'Respond';
      default:
        return 'Take Action';
    }
  }

  String _formatTimeAgo(DateTime dateTime) {
    final now = DateTime.now();
    final difference = now.difference(dateTime);

    if (difference.inMinutes < 1) {
      return 'Just now';
    } else if (difference.inMinutes < 60) {
      return '${difference.inMinutes}m ago';
    } else if (difference.inHours < 24) {
      return '${difference.inHours}h ago';
    } else if (difference.inDays < 7) {
      return '${difference.inDays}d ago';
    } else {
      return '${dateTime.day}/${dateTime.month}/${dateTime.year}';
    }
  }

  void _markAsRead(Map<String, dynamic> notification) async {
    if (notification['isRead'] == true) return;

    try {
      await ApiService.markNotificationAsRead(notification['id']);
      setState(() {
        notification['isRead'] = true;
        _unreadCount = _notifications.where((n) => !n['isRead']).length;
      });
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed to mark as read: $e'),
          backgroundColor: AppColors.error,
        ),
      );
    }
  }

  void _markAllAsRead() async {
    try {
      await ApiService.markAllNotificationsAsRead();
      setState(() {
        for (var notification in _notifications) {
          notification['isRead'] = true;
        }
        _unreadCount = 0;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('All notifications marked as read'),
          backgroundColor: AppColors.success,
        ),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed to mark all as read: $e'),
          backgroundColor: AppColors.error,
        ),
      );
    }
  }

  void _handleNotificationAction(Map<String, dynamic> notification) {
    final type = notification['type'];
    
    switch (type) {
      case 'appointment':
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Opening appointment details...')),
        );
        break;
      case 'medication':
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Opening medication review...')),
        );
        break;
      case 'lab_result':
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Opening lab results...')),
        );
        break;
      case 'emergency':
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Opening emergency response...')),
        );
        break;
      default:
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Action feature coming soon')),
        );
    }
  }

  void _dismissNotification(Map<String, dynamic> notification) async {
    try {
      await ApiService.dismissNotification(notification['id']);
      setState(() {
        _notifications.remove(notification);
        _unreadCount = _notifications.where((n) => !n['isRead']).length;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Notification dismissed'),
          backgroundColor: AppColors.success,
        ),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed to dismiss notification: $e'),
          backgroundColor: AppColors.error,
        ),
      );
    }
  }

  void _showNotificationSettings() {
    showModalBottomSheet(
      context: context,
      builder: (context) => Container(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Notification Settings',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 24),
            SwitchListTile(
              title: const Text('Push Notifications'),
              subtitle: const Text('Receive push notifications on your device'),
              value: true,
              onChanged: (value) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Settings saved')),
                );
              },
            ),
            SwitchListTile(
              title: const Text('Email Notifications'),
              subtitle: const Text('Receive notifications via email'),
              value: false,
              onChanged: (value) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Settings saved')),
                );
              },
            ),
            SwitchListTile(
              title: const Text('Emergency Alerts'),
              subtitle: const Text('High priority emergency notifications'),
              value: true,
              onChanged: (value) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Settings saved')),
                );
              },
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Done'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _clearAllNotifications() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Clear All Notifications'),
        content: const Text('Are you sure you want to clear all notifications? This action cannot be undone.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () async {
              Navigator.pop(context);
              try {
                await ApiService.clearAllNotifications();
                setState(() {
                  _notifications.clear();
                  _unreadCount = 0;
                });
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: const Text('All notifications cleared'),
                    backgroundColor: AppColors.success,
                  ),
                );
              } catch (e) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text('Failed to clear notifications: $e'),
                    backgroundColor: AppColors.error,
                  ),
                );
              }
            },
            child: Text(
              'Clear All',
              style: TextStyle(color: AppColors.error),
            ),
          ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }
}