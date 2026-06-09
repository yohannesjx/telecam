import 'dart:convert';

/// Authenticated user profile from the API.
class AuthUser {
  const AuthUser({
    required this.id,
    required this.email,
    required this.role,
    required this.status,
    this.name,
    this.forcePasswordChange = false,
  });

  final String id;
  final String email;
  final String role;
  final String status;
  final String? name;
  final bool forcePasswordChange;

  bool get isParent => role.toUpperCase() == 'PARENT';

  bool get isActive => status.toUpperCase() == 'ACTIVE';

  Map<String, dynamic> toJson() => {
        'id': id,
        'email': email,
        'role': role,
        'status': status,
        if (name != null) 'name': name,
        'force_password_change': forcePasswordChange,
      };

  factory AuthUser.fromJson(Map<String, dynamic> json) {
    return AuthUser(
      id: _string(json['id']) ?? '',
      email: _string(json['email']) ?? '',
      role: (_string(json['role']) ?? '').toUpperCase(),
      status: (_string(json['status']) ?? 'ACTIVE').toUpperCase(),
      name: _string(json['name']) ?? _string(json['full_name']) ?? _string(json['fullName']),
      forcePasswordChange:
          json['force_password_change'] == true || json['forcePasswordChange'] == true,
    );
  }

  static AuthUser? fromJsonString(String? raw) {
    if (raw == null || raw.isEmpty) return null;
    try {
      final decoded = jsonDecode(raw);
      if (decoded is Map<String, dynamic>) {
        return AuthUser.fromJson(decoded);
      }
    } catch (_) {}
    return null;
  }

  String toJsonString() => jsonEncode(toJson());

  static String? _string(dynamic value) {
    if (value is String && value.trim().isNotEmpty) return value.trim();
    return null;
  }
}
