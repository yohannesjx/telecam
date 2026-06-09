/// Parent-friendly labels for account fields.
class AccountFormatters {
  AccountFormatters._();

  static String roleLabel(String role) {
    switch (role.toUpperCase()) {
      case 'PARENT':
        return 'Parent';
      default:
        return role;
    }
  }

  static String statusLabel(String status) {
    switch (status.toUpperCase()) {
      case 'ACTIVE':
        return 'Active';
      case 'BLOCKED':
        return 'Blocked';
      case 'DISABLED':
        return 'Disabled';
      default:
        return status;
    }
  }

  static bool isActiveStatus(String status) => status.toUpperCase() == 'ACTIVE';
}
