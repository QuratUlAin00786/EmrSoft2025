class User {
  final int id;
  final String email;
  final String firstName;
  final String lastName;
  final String role;
  final String? department;
  final String? phone;
  final String? specialization;
  final bool isActive;

  User({
    required this.id,
    required this.email,
    required this.firstName,
    required this.lastName,
    required this.role,
    this.department,
    this.phone,
    this.specialization,
    this.isActive = true,
  });

  String get fullName => '$firstName $lastName';
  String get displayName => role == 'doctor' ? 'Dr. $fullName' : fullName;

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'] ?? 0,
      email: json['email'] ?? '',
      firstName: json['firstName'] ?? '',
      lastName: json['lastName'] ?? '',
      role: json['role'] ?? '',
      department: json['department'],
      phone: json['phone'],
      specialization: json['specialization'],
      isActive: json['isActive'] ?? true,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'firstName': firstName,
      'lastName': lastName,
      'role': role,
      'department': department,
      'phone': phone,
      'specialization': specialization,
      'isActive': isActive,
    };
  }
}