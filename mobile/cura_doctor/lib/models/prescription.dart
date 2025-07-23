class Prescription {
  final int id;
  final int patientId;
  final int doctorId;
  final String medicationName;
  final String dosage;
  final String frequency;
  final String duration;
  final String instructions;
  final String status;
  final DateTime createdAt;
  final DateTime? updatedAt;
  final String? patientName;
  final String? doctorName;

  Prescription({
    required this.id,
    required this.patientId,
    required this.doctorId,
    required this.medicationName,
    required this.dosage,
    required this.frequency,
    required this.duration,
    required this.instructions,
    required this.status,
    required this.createdAt,
    this.updatedAt,
    this.patientName,
    this.doctorName,
  });

  String get statusDisplay {
    switch (status.toLowerCase()) {
      case 'active':
        return 'Active';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      case 'expired':
        return 'Expired';
      case 'on_hold':
        return 'On Hold';
      default:
        return status;
    }
  }

  factory Prescription.fromJson(Map<String, dynamic> json) {
    return Prescription(
      id: json['id'] ?? 0,
      patientId: json['patientId'] ?? 0,
      doctorId: json['doctorId'] ?? 0,
      medicationName: json['medicationName'] ?? '',
      dosage: json['dosage'] ?? '',
      frequency: json['frequency'] ?? '',
      duration: json['duration'] ?? '',
      instructions: json['instructions'] ?? '',
      status: json['status'] ?? 'active',
      createdAt: DateTime.parse(json['createdAt'] ?? DateTime.now().toIso8601String()),
      updatedAt: json['updatedAt'] != null 
          ? DateTime.parse(json['updatedAt']) 
          : null,
      patientName: json['patientName'],
      doctorName: json['doctorName'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'patientId': patientId,
      'doctorId': doctorId,
      'medicationName': medicationName,
      'dosage': dosage,
      'frequency': frequency,
      'duration': duration,
      'instructions': instructions,
      'status': status,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt?.toIso8601String(),
      'patientName': patientName,
      'doctorName': doctorName,
    };
  }
}