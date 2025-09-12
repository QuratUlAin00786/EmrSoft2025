class LabResult {
  final int id;
  final int organizationId;
  final int patientId;
  final String testId;
  final String testType;
  final int orderedBy;
  final DateTime orderedAt;
  final DateTime? collectedAt;
  final DateTime? completedAt;
  final String status;
  final String priority;
  final Map<String, dynamic> results;
  final String? notes;
  final bool criticalValues;
  final String? doctorName;
  final String? mainSpecialty;
  final String? subSpecialty;
  final DateTime createdAt;
  final DateTime? updatedAt;

  // Additional fields for display
  final String? patientName;

  LabResult({
    required this.id,
    required this.organizationId,
    required this.patientId,
    required this.testId,
    required this.testType,
    required this.orderedBy,
    required this.orderedAt,
    this.collectedAt,
    this.completedAt,
    required this.status,
    required this.priority,
    required this.results,
    this.notes,
    required this.criticalValues,
    this.doctorName,
    this.mainSpecialty,
    this.subSpecialty,
    required this.createdAt,
    this.updatedAt,
    this.patientName,
  });

  factory LabResult.fromJson(Map<String, dynamic> json) {
    return LabResult(
      id: json['id'],
      organizationId: json['organizationId'],
      patientId: json['patientId'],
      testId: json['testId'],
      testType: json['testType'],
      orderedBy: json['orderedBy'],
      orderedAt: DateTime.parse(json['orderedAt']),
      collectedAt: json['collectedAt'] != null 
          ? DateTime.parse(json['collectedAt'])
          : null,
      completedAt: json['completedAt'] != null 
          ? DateTime.parse(json['completedAt'])
          : null,
      status: json['status'],
      priority: json['priority'],
      results: json['results'] ?? {},
      notes: json['notes'],
      criticalValues: json['criticalValues'] ?? false,
      doctorName: json['doctorName'],
      mainSpecialty: json['mainSpecialty'],
      subSpecialty: json['subSpecialty'],
      createdAt: DateTime.parse(json['createdAt']),
      updatedAt: json['updatedAt'] != null 
          ? DateTime.parse(json['updatedAt'])
          : null,
      patientName: json['patientName'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'organizationId': organizationId,
      'patientId': patientId,
      'testId': testId,
      'testType': testType,
      'orderedBy': orderedBy,
      'orderedAt': orderedAt.toIso8601String(),
      'collectedAt': collectedAt?.toIso8601String(),
      'completedAt': completedAt?.toIso8601String(),
      'status': status,
      'priority': priority,
      'results': results,
      'notes': notes,
      'criticalValues': criticalValues,
      'doctorName': doctorName,
      'mainSpecialty': mainSpecialty,
      'subSpecialty': subSpecialty,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt?.toIso8601String(),
      'patientName': patientName,
    };
  }

  String get formattedOrderedDate {
    return '${orderedAt.day}/${orderedAt.month}/${orderedAt.year}';
  }

  String get formattedCompletedDate {
    if (completedAt == null) return 'Not completed';
    return '${completedAt!.day}/${completedAt!.month}/${completedAt!.year}';
  }

  String get statusColor {
    switch (status.toLowerCase()) {
      case 'pending':
        return '0xFFFF9800'; // Orange
      case 'collected':
        return '0xFF2196F3'; // Blue
      case 'processing':
        return '0xFF9C27B0'; // Purple
      case 'completed':
        return '0xFF4CAF50'; // Green
      case 'cancelled':
        return '0xFFF44336'; // Red
      default:
        return '0xFF757575'; // Default grey
    }
  }

  String get priorityColor {
    switch (priority.toLowerCase()) {
      case 'urgent':
        return '0xFFF44336'; // Red
      case 'high':
        return '0xFFFF5722'; // Deep Orange
      case 'routine':
        return '0xFF4CAF50'; // Green
      case 'low':
        return '0xFF9E9E9E'; // Grey
      default:
        return '0xFF757575'; // Default grey
    }
  }

  bool get isCompleted {
    return status.toLowerCase() == 'completed';
  }

  bool get isPending {
    return status.toLowerCase() == 'pending';
  }

  bool get hasResults {
    return results.isNotEmpty;
  }

  String get testIcon {
    if (testType.toLowerCase().contains('blood')) return '🩸';
    if (testType.toLowerCase().contains('urine')) return '🥤';
    if (testType.toLowerCase().contains('x-ray') || 
        testType.toLowerCase().contains('imaging')) return '📷';
    if (testType.toLowerCase().contains('ecg') || 
        testType.toLowerCase().contains('ekg')) return '💓';
    return '🧪';
  }
}