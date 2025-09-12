class AppNotification {
  final int id;
  final int organizationId;
  final int userId;
  final String type;
  final String title;
  final String message;
  final Map<String, dynamic> data;
  final bool isRead;
  final String priority;
  final DateTime createdAt;
  final DateTime? readAt;

  AppNotification({
    required this.id,
    required this.organizationId,
    required this.userId,
    required this.type,
    required this.title,
    required this.message,
    required this.data,
    required this.isRead,
    required this.priority,
    required this.createdAt,
    this.readAt,
  });

  factory AppNotification.fromJson(Map<String, dynamic> json) {
    return AppNotification(
      id: json['id'],
      organizationId: json['organizationId'],
      userId: json['userId'],
      type: json['type'],
      title: json['title'],
      message: json['message'],
      data: json['data'] ?? {},
      isRead: json['isRead'] ?? false,
      priority: json['priority'] ?? 'normal',
      createdAt: DateTime.parse(json['createdAt']),
      readAt: json['readAt'] != null 
          ? DateTime.parse(json['readAt'])
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'organizationId': organizationId,
      'userId': userId,
      'type': type,
      'title': title,
      'message': message,
      'data': data,
      'isRead': isRead,
      'priority': priority,
      'createdAt': createdAt.toIso8601String(),
      'readAt': readAt?.toIso8601String(),
    };
  }

  String get formattedDate {
    final now = DateTime.now();
    final difference = now.difference(createdAt);

    if (difference.inMinutes < 1) {
      return 'Just now';
    } else if (difference.inHours < 1) {
      return '${difference.inMinutes}m ago';
    } else if (difference.inDays < 1) {
      return '${difference.inHours}h ago';
    } else if (difference.inDays < 7) {
      return '${difference.inDays}d ago';
    } else {
      return '${createdAt.day}/${createdAt.month}/${createdAt.year}';
    }
  }

  String get typeIcon {
    switch (type.toLowerCase()) {
      case 'appointment':
        return '📅';
      case 'lab_result':
        return '🧪';
      case 'prescription':
        return '💊';
      case 'message':
        return '💬';
      case 'reminder':
        return '⏰';
      case 'alert':
        return '⚠️';
      case 'system':
        return '⚙️';
      default:
        return '🔔';
    }
  }

  String get priorityColor {
    switch (priority.toLowerCase()) {
      case 'high':
        return '0xFFF44336'; // Red
      case 'medium':
        return '0xFFFF9800'; // Orange
      case 'low':
        return '0xFF4CAF50'; // Green
      default:
        return '0xFF2196F3'; // Blue
    }
  }

  bool get isUnread {
    return !isRead;
  }

  bool get isToday {
    final now = DateTime.now();
    return createdAt.year == now.year &&
           createdAt.month == now.month &&
           createdAt.day == now.day;
  }

  bool get isRecent {
    final difference = DateTime.now().difference(createdAt);
    return difference.inHours < 24;
  }
}