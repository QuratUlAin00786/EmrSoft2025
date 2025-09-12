class Patient {
  final int id;
  final int organizationId;
  final String patientId;
  final String firstName;
  final String lastName;
  final DateTime? dateOfBirth;
  final String? email;
  final String? phone;
  final String? nhsNumber;
  final Address? address;
  final EmergencyContact? emergencyContact;
  final MedicalHistory? medicalHistory;
  final String riskLevel;
  final bool isActive;
  final DateTime createdAt;
  final DateTime? updatedAt;

  Patient({
    required this.id,
    required this.organizationId,
    required this.patientId,
    required this.firstName,
    required this.lastName,
    this.dateOfBirth,
    this.email,
    this.phone,
    this.nhsNumber,
    this.address,
    this.emergencyContact,
    this.medicalHistory,
    required this.riskLevel,
    required this.isActive,
    required this.createdAt,
    this.updatedAt,
  });

  factory Patient.fromJson(Map<String, dynamic> json) {
    return Patient(
      id: json['id'],
      organizationId: json['organizationId'],
      patientId: json['patientId'],
      firstName: json['firstName'],
      lastName: json['lastName'],
      dateOfBirth: json['dateOfBirth'] != null 
          ? DateTime.parse(json['dateOfBirth'])
          : null,
      email: json['email'],
      phone: json['phone'],
      nhsNumber: json['nhsNumber'],
      address: json['address'] != null 
          ? Address.fromJson(json['address'])
          : null,
      emergencyContact: json['emergencyContact'] != null 
          ? EmergencyContact.fromJson(json['emergencyContact'])
          : null,
      medicalHistory: json['medicalHistory'] != null 
          ? MedicalHistory.fromJson(json['medicalHistory'])
          : null,
      riskLevel: json['riskLevel'] ?? 'low',
      isActive: json['isActive'] ?? true,
      createdAt: DateTime.parse(json['createdAt']),
      updatedAt: json['updatedAt'] != null 
          ? DateTime.parse(json['updatedAt'])
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'organizationId': organizationId,
      'patientId': patientId,
      'firstName': firstName,
      'lastName': lastName,
      'dateOfBirth': dateOfBirth?.toIso8601String(),
      'email': email,
      'phone': phone,
      'nhsNumber': nhsNumber,
      'address': address?.toJson(),
      'emergencyContact': emergencyContact?.toJson(),
      'medicalHistory': medicalHistory?.toJson(),
      'riskLevel': riskLevel,
      'isActive': isActive,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt?.toIso8601String(),
    };
  }

  String get fullName => '$firstName $lastName';
  
  int? get age {
    if (dateOfBirth == null) return null;
    final now = DateTime.now();
    final age = now.year - dateOfBirth!.year;
    if (now.month < dateOfBirth!.month || 
        (now.month == dateOfBirth!.month && now.day < dateOfBirth!.day)) {
      return age - 1;
    }
    return age;
  }
}

class Address {
  final String? street;
  final String? city;
  final String? state;
  final String? postcode;
  final String? country;

  Address({
    this.street,
    this.city,
    this.state,
    this.postcode,
    this.country,
  });

  factory Address.fromJson(Map<String, dynamic> json) {
    return Address(
      street: json['street'],
      city: json['city'],
      state: json['state'],
      postcode: json['postcode'],
      country: json['country'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'street': street,
      'city': city,
      'state': state,
      'postcode': postcode,
      'country': country,
    };
  }

  String get fullAddress {
    final parts = [street, city, state, postcode, country]
        .where((part) => part != null && part.isNotEmpty)
        .toList();
    return parts.join(', ');
  }
}

class EmergencyContact {
  final String? name;
  final String? relationship;
  final String? phone;

  EmergencyContact({
    this.name,
    this.relationship,
    this.phone,
  });

  factory EmergencyContact.fromJson(Map<String, dynamic> json) {
    return EmergencyContact(
      name: json['name'],
      relationship: json['relationship'],
      phone: json['phone'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'relationship': relationship,
      'phone': phone,
    };
  }
}

class MedicalHistory {
  final List<String> allergies;
  final List<String> chronicConditions;
  final List<String> medications;
  final SocialHistory? socialHistory;

  MedicalHistory({
    required this.allergies,
    required this.chronicConditions,
    required this.medications,
    this.socialHistory,
  });

  factory MedicalHistory.fromJson(Map<String, dynamic> json) {
    return MedicalHistory(
      allergies: (json['allergies'] as List?)?.cast<String>() ?? [],
      chronicConditions: (json['chronicConditions'] as List?)?.cast<String>() ?? [],
      medications: (json['medications'] as List?)?.cast<String>() ?? [],
      socialHistory: json['socialHistory'] != null
          ? SocialHistory.fromJson(json['socialHistory'])
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'allergies': allergies,
      'chronicConditions': chronicConditions,
      'medications': medications,
      'socialHistory': socialHistory?.toJson(),
    };
  }
}

class SocialHistory {
  final SmokingStatus? smoking;
  final AlcoholStatus? alcohol;
  final String? occupation;
  final String? maritalStatus;

  SocialHistory({
    this.smoking,
    this.alcohol,
    this.occupation,
    this.maritalStatus,
  });

  factory SocialHistory.fromJson(Map<String, dynamic> json) {
    return SocialHistory(
      smoking: json['smoking'] != null
          ? SmokingStatus.fromJson(json['smoking'])
          : null,
      alcohol: json['alcohol'] != null
          ? AlcoholStatus.fromJson(json['alcohol'])
          : null,
      occupation: json['occupation'],
      maritalStatus: json['maritalStatus'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'smoking': smoking?.toJson(),
      'alcohol': alcohol?.toJson(),
      'occupation': occupation,
      'maritalStatus': maritalStatus,
    };
  }
}

class SmokingStatus {
  final String status;

  SmokingStatus({required this.status});

  factory SmokingStatus.fromJson(Map<String, dynamic> json) {
    return SmokingStatus(status: json['status']);
  }

  Map<String, dynamic> toJson() {
    return {'status': status};
  }
}

class AlcoholStatus {
  final String status;

  AlcoholStatus({required this.status});

  factory AlcoholStatus.fromJson(Map<String, dynamic> json) {
    return AlcoholStatus(status: json['status']);
  }

  Map<String, dynamic> toJson() {
    return {'status': status};
  }
}