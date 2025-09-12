class MedicalRecord {
  final int id;
  final int organizationId;
  final int patientId;
  final int providerId;
  final String type;
  final String title;
  final String? description;
  final String? diagnosis;
  final Map<String, dynamic>? treatment;
  final List<String> medications;
  final Map<String, dynamic>? vitals;
  final String? notes;
  final List<String> attachments;
  final String status;
  final DateTime recordDate;
  final DateTime createdAt;
  final DateTime? updatedAt;

  // Additional fields for display
  final String? providerName;

  MedicalRecord({
    required this.id,
    required this.organizationId,
    required this.patientId,
    required this.providerId,
    required this.type,
    required this.title,
    this.description,
    this.diagnosis,
    this.treatment,
    required this.medications,
    this.vitals,
    this.notes,
    required this.attachments,
    required this.status,
    required this.recordDate,
    required this.createdAt,
    this.updatedAt,
    this.providerName,
  });

  factory MedicalRecord.fromJson(Map<String, dynamic> json) {
    return MedicalRecord(
      id: json['id'],
      organizationId: json['organizationId'],
      patientId: json['patientId'],
      providerId: json['providerId'],
      type: json['type'],
      title: json['title'],
      description: json['description'],
      diagnosis: json['diagnosis'],
      treatment: json['treatment'],
      medications: (json['medications'] as List?)?.cast<String>() ?? [],
      vitals: json['vitals'],
      notes: json['notes'],
      attachments: (json['attachments'] as List?)?.cast<String>() ?? [],
      status: json['status'],
      recordDate: DateTime.parse(json['recordDate']),
      createdAt: DateTime.parse(json['createdAt']),
      updatedAt: json['updatedAt'] != null 
          ? DateTime.parse(json['updatedAt'])
          : null,
      providerName: json['providerName'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'organizationId': organizationId,
      'patientId': patientId,
      'providerId': providerId,
      'type': type,
      'title': title,
      'description': description,
      'diagnosis': diagnosis,
      'treatment': treatment,
      'medications': medications,
      'vitals': vitals,
      'notes': notes,
      'attachments': attachments,
      'status': status,
      'recordDate': recordDate.toIso8601String(),
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt?.toIso8601String(),
      'providerName': providerName,
    };
  }

  String get formattedDate {
    return '${recordDate.day}/${recordDate.month}/${recordDate.year}';
  }

  String get typeIcon {
    switch (type.toLowerCase()) {
      case 'consultation':
        return '👨‍⚕️';
      case 'lab_result':
        return '🧪';
      case 'prescription':
        return '💊';
      case 'imaging':
        return '📷';
      case 'surgery':
        return '⚕️';
      default:
        return '📋';
    }
  }

  bool get hasMedications {
    return medications.isNotEmpty;
  }

  bool get hasVitals {
    return vitals != null && vitals!.isNotEmpty;
  }

  bool get hasAttachments {
    return attachments.isNotEmpty;
  }
}