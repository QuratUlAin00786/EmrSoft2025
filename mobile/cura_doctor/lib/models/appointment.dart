class Appointment {
  final int id;
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
  final String? patientName;
  final String? providerName;

  Appointment({
    required this.id,
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
    this.patientName,
    this.providerName,
  });

  String get statusDisplay {
    switch (status.toLowerCase()) {
      case 'scheduled':
        return 'Scheduled';
      case 'confirmed':
        return 'Confirmed';
      case 'in_progress':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      case 'no_show':
        return 'No Show';
      default:
        return status;
    }
  }

  factory Appointment.fromJson(Map<String, dynamic> json) {
    return Appointment(
      id: json['id'] ?? 0,
      patientId: json['patientId'] ?? 0,
      providerId: json['providerId'] ?? 0,
      title: json['title'] ?? '',
      description: json['description'],
      scheduledAt: DateTime.parse(json['scheduledAt'] ?? DateTime.now().toIso8601String()),
      duration: json['duration'] ?? 30,
      status: json['status'] ?? 'scheduled',
      type: json['type'] ?? 'consultation',
      location: json['location'],
      isVirtual: json['isVirtual'] ?? false,
      createdAt: DateTime.parse(json['createdAt'] ?? DateTime.now().toIso8601String()),
      patientName: json['patientName'],
      providerName: json['providerName'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
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
      'patientName': patientName,
      'providerName': providerName,
    };
  }
}