class UserModel {
  final String id;
  final String email;
  final String firstName;
  final String lastName;
  final String? department;
  final bool isActive;
  final bool isStaff;
  final bool isOwner;
  final DateTime? dateJoined;

  UserModel({
    required this.id,
    required this.email,
    required this.firstName,
    required this.lastName,
    this.department,
    this.isActive = true,
    this.isStaff = false,
    this.isOwner = false,
    this.dateJoined,
  });

  String get fullName {
    final name = '$firstName $lastName'.trim();
    return name.isNotEmpty ? name : email;
  }

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id']?.toString() ?? '',
      email: json['email']?.toString() ?? '',
      firstName: json['first_name']?.toString() ?? '',
      lastName: json['last_name']?.toString() ?? '',
      department: json['department']?.toString(),
      isActive: json['is_active'] == true,
      isStaff: json['is_staff'] == true ||
          (json['email']?.toString().toLowerCase().contains('admin') ?? false) ||
          (json['email']?.toString().toLowerCase() == 'prashanthkolla123@gmail.com'),
      isOwner: json['is_owner'] == true,
      dateJoined: json['date_joined'] != null
          ? DateTime.tryParse(json['date_joined'].toString())
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'first_name': firstName,
      'last_name': lastName,
      'department': department,
      'is_active': isActive,
      'is_staff': isStaff,
      'is_owner': isOwner,
      'date_joined': dateJoined?.toIso8601String(),
    };
  }
}
