class User {
  final int id;
  final int organizationId;
  final String email;
  final String username;
  final String firstName;
  final String lastName;
  final String role;
  final String? department;
  final String? medicalSpecialtyCategory;
  final String? subSpecialty;
  final List<String>? workingDays;
  final WorkingHours? workingHours;
  final bool isActive;
  final DateTime createdAt;

  User({
    required this.id,
    required this.organizationId,
    required this.email,
    required this.username,
    required this.firstName,
    required this.lastName,
    required this.role,
    this.department,
    this.medicalSpecialtyCategory,
    this.subSpecialty,
    this.workingDays,
    this.workingHours,
    required this.isActive,
    required this.createdAt,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'],
      organizationId: json['organizationId'],
      email: json['email'],
      username: json['username'],
      firstName: json['firstName'],
      lastName: json['lastName'],
      role: json['role'],
      department: json['department'],
      medicalSpecialtyCategory: json['medicalSpecialtyCategory'],
      subSpecialty: json['subSpecialty'],
      workingDays: json['workingDays']?.cast<String>(),
      workingHours: json['workingHours'] != null 
          ? WorkingHours.fromJson(json['workingHours'])
          : null,
      isActive: json['isActive'],
      createdAt: DateTime.parse(json['createdAt']),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'organizationId': organizationId,
      'email': email,
      'username': username,
      'firstName': firstName,
      'lastName': lastName,
      'role': role,
      'department': department,
      'medicalSpecialtyCategory': medicalSpecialtyCategory,
      'subSpecialty': subSpecialty,
      'workingDays': workingDays,
      'workingHours': workingHours?.toJson(),
      'isActive': isActive,
      'createdAt': createdAt.toIso8601String(),
    };
  }

  String get fullName => '$firstName $lastName';
}

class WorkingHours {
  final String start;
  final String end;

  WorkingHours({required this.start, required this.end});

  factory WorkingHours.fromJson(Map<String, dynamic> json) {
    return WorkingHours(
      start: json['start'],
      end: json['end'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'start': start,
      'end': end,
    };
  }
}