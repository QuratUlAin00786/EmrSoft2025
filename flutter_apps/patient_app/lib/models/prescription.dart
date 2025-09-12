class Prescription {
  final int id;
  final int organizationId;
  final int patientId;
  final int prescriberId;
  final String medicationName;
  final String dosage;
  final String frequency;
  final String duration;
  final String? instructions;
  final String status;
  final DateTime prescribedDate;
  final DateTime? startDate;
  final DateTime? endDate;
  final int refillsRemaining;
  final Map<String, dynamic>? pharmacyInfo;
  final String? notes;
  final DateTime createdAt;
  final DateTime? updatedAt;

  // Additional fields for display
  final String? prescriberName;
  final String? patientName;

  Prescription({
    required this.id,
    required this.organizationId,
    required this.patientId,
    required this.prescriberId,
    required this.medicationName,
    required this.dosage,
    required this.frequency,
    required this.duration,
    this.instructions,
    required this.status,
    required this.prescribedDate,
    this.startDate,
    this.endDate,
    required this.refillsRemaining,
    this.pharmacyInfo,
    this.notes,
    required this.createdAt,
    this.updatedAt,
    this.prescriberName,
    this.patientName,
  });

  factory Prescription.fromJson(Map<String, dynamic> json) {
    return Prescription(
      id: json['id'],
      organizationId: json['organizationId'],
      patientId: json['patientId'],
      prescriberId: json['prescriberId'],
      medicationName: json['medicationName'],
      dosage: json['dosage'],
      frequency: json['frequency'],
      duration: json['duration'],
      instructions: json['instructions'],
      status: json['status'],
      prescribedDate: DateTime.parse(json['prescribedDate']),
      startDate: json['startDate'] != null 
          ? DateTime.parse(json['startDate'])
          : null,
      endDate: json['endDate'] != null 
          ? DateTime.parse(json['endDate'])
          : null,
      refillsRemaining: json['refillsRemaining'] ?? 0,
      pharmacyInfo: json['pharmacyInfo'],
      notes: json['notes'],
      createdAt: DateTime.parse(json['createdAt']),
      updatedAt: json['updatedAt'] != null 
          ? DateTime.parse(json['updatedAt'])
          : null,
      prescriberName: json['prescriberName'],
      patientName: json['patientName'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'organizationId': organizationId,
      'patientId': patientId,
      'prescriberId': prescriberId,
      'medicationName': medicationName,
      'dosage': dosage,
      'frequency': frequency,
      'duration': duration,
      'instructions': instructions,
      'status': status,
      'prescribedDate': prescribedDate.toIso8601String(),
      'startDate': startDate?.toIso8601String(),
      'endDate': endDate?.toIso8601String(),
      'refillsRemaining': refillsRemaining,
      'pharmacyInfo': pharmacyInfo,
      'notes': notes,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt?.toIso8601String(),
      'prescriberName': prescriberName,
      'patientName': patientName,
    };
  }

  String get formattedPrescribedDate {
    return '${prescribedDate.day}/${prescribedDate.month}/${prescribedDate.year}';
  }

  String get formattedStartDate {
    if (startDate == null) return 'Not started';
    return '${startDate!.day}/${startDate!.month}/${startDate!.year}';
  }

  String get formattedEndDate {
    if (endDate == null) return 'Ongoing';
    return '${endDate!.day}/${endDate!.month}/${endDate!.year}';
  }

  String get statusColor {
    switch (status.toLowerCase()) {
      case 'active':
        return '0xFF4CAF50'; // Green
      case 'completed':
        return '0xFF9E9E9E'; // Grey
      case 'cancelled':
        return '0xFFF44336'; // Red
      case 'paused':
        return '0xFFFF9800'; // Orange
      default:
        return '0xFF757575'; // Default grey
    }
  }

  bool get isActive {
    return status.toLowerCase() == 'active';
  }

  bool get isExpired {
    if (endDate == null) return false;
    return endDate!.isBefore(DateTime.now());
  }

  bool get needsRefill {
    return refillsRemaining <= 1 && isActive;
  }

  String get medicationIcon {
    final med = medicationName.toLowerCase();
    if (med.contains('insulin')) return '💉';
    if (med.contains('vitamin')) return '🌞';
    if (med.contains('antibiotic')) return '🦠';
    if (med.contains('pain') || med.contains('ibuprofen') || med.contains('acetaminophen')) return '🩹';
    return '💊';
  }

  String get frequencyDescription {
    switch (frequency.toLowerCase()) {
      case 'once daily':
      case '1x daily':
        return 'Once a day';
      case 'twice daily':
      case '2x daily':
        return 'Twice a day';
      case 'three times daily':
      case '3x daily':
        return 'Three times a day';
      case 'four times daily':
      case '4x daily':
        return 'Four times a day';
      case 'as needed':
        return 'As needed';
      default:
        return frequency;
    }
  }
}