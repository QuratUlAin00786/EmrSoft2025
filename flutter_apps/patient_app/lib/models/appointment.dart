class Appointment {
  final int id;
  final int organizationId;
  final int patientId;
  final int providerId;
  final String title;
  final String? description;
  final DateTime scheduledAt;
  final int duration;
  final String status;
  final String type;
  final String? location;
  final bool isVirtual;
  final DateTime createdAt;

  // Additional fields for display
  final String? providerName;
  final String? patientName;

  Appointment({
    required this.id,
    required this.organizationId,
    required this.patientId,
    required this.providerId,
    required this.title,
    this.description,
    required this.scheduledAt,
    required this.duration,
    required this.status,
    required this.type,
    this.location,
    required this.isVirtual,
    required this.createdAt,
    this.providerName,
    this.patientName,
  });

  factory Appointment.fromJson(Map<String, dynamic> json) {
    return Appointment(
      id: json['id'],
      organizationId: json['organizationId'],
      patientId: json['patientId'],
      providerId: json['providerId'],
      title: json['title'],
      description: json['description'],
      scheduledAt: DateTime.parse(json['scheduledAt']),
      duration: json['duration'],
      status: json['status'],
      type: json['type'],
      location: json['location'],
      isVirtual: json['isVirtual'] ?? false,
      createdAt: DateTime.parse(json['createdAt']),
      providerName: json['providerName'],
      patientName: json['patientName'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'organizationId': organizationId,
      'patientId': patientId,
      'providerId': providerId,
      'title': title,
      'description': description,
      'scheduledAt': scheduledAt.toIso8601String(),
      'duration': duration,
      'status': status,
      'type': type,
      'location': location,
      'isVirtual': isVirtual,
      'createdAt': createdAt.toIso8601String(),
      'providerName': providerName,
      'patientName': patientName,
    };
  }

  String get formattedDate {
    return '${scheduledAt.day}/${scheduledAt.month}/${scheduledAt.year}';
  }

  String get formattedTime {
    final hour = scheduledAt.hour.toString().padLeft(2, '0');
    final minute = scheduledAt.minute.toString().padLeft(2, '0');
    return '$hour:$minute';
  }

  String get formattedDateTime {
    return '$formattedDate at $formattedTime';
  }

  String get statusColor {
    switch (status.toLowerCase()) {
      case 'scheduled':
        return '0xFF2196F3'; // Blue
      case 'confirmed':
        return '0xFF4CAF50'; // Green
      case 'cancelled':
        return '0xFFF44336'; // Red
      case 'completed':
        return '0xFF9E9E9E'; // Grey
      default:
        return '0xFF757575'; // Default grey
    }
  }

  bool get isPast {
    return scheduledAt.isBefore(DateTime.now());
  }

  bool get isToday {
    final now = DateTime.now();
    return scheduledAt.year == now.year &&
           scheduledAt.month == now.month &&
           scheduledAt.day == now.day;
  }

  bool get isUpcoming {
    return scheduledAt.isAfter(DateTime.now());
  }
}