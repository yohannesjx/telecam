import 'package:flutter/material.dart';
import 'package:school_camera/app/theme.dart';
import 'package:school_camera/core/widgets/app_button.dart';
import 'package:school_camera/core/widgets/app_text_field.dart';

class ChangePasswordForm extends StatefulWidget {
  const ChangePasswordForm({
    super.key,
    required this.onSubmit,
    required this.isLoading,
    this.errorMessage,
  });

  final Future<void> Function(
    String currentPassword,
    String newPassword,
  ) onSubmit;
  final bool isLoading;
  final String? errorMessage;

  @override
  State<ChangePasswordForm> createState() => _ChangePasswordFormState();
}

class _ChangePasswordFormState extends State<ChangePasswordForm> {
  final _currentController = TextEditingController();
  final _newController = TextEditingController();
  final _confirmController = TextEditingController();
  bool _obscureCurrent = true;
  bool _obscureNew = true;
  bool _obscureConfirm = true;
  String? _currentError;
  String? _newError;
  String? _confirmError;

  @override
  void dispose() {
    _currentController.dispose();
    _newController.dispose();
    _confirmController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final current = _currentController.text;
    final newPassword = _newController.text;
    final confirm = _confirmController.text;

    setState(() {
      _currentError = current.isEmpty ? 'Current password is required' : null;
      _newError = newPassword.isEmpty
          ? 'New password is required'
          : (newPassword.length < 8
              ? 'Password must be at least 8 characters'
              : (newPassword == current
                  ? 'New password must be different from your current password'
                  : null));
      _confirmError = confirm.isEmpty
          ? 'Please confirm your new password'
          : (confirm != newPassword ? 'Passwords do not match' : null);
    });

    if (_currentError != null || _newError != null || _confirmError != null) {
      return;
    }

    await widget.onSubmit(current, newPassword);
  }

  Widget _passwordField({
    required String label,
    required TextEditingController controller,
    required bool obscure,
    required VoidCallback onToggle,
    String? error,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        AppTextField(
          label: label,
          controller: controller,
          obscureText: obscure,
          prefixIcon: Icons.lock_outline,
          enabled: !widget.isLoading,
        ),
        if (error != null) ...[
          const SizedBox(height: AppSpacing.xs),
          Text(error, style: const TextStyle(color: AppColors.error, fontSize: 13)),
        ],
        Align(
          alignment: Alignment.centerRight,
          child: TextButton(
            onPressed: widget.isLoading ? null : onToggle,
            child: Text(obscure ? 'Show password' : 'Hide password'),
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _passwordField(
          label: 'Current password',
          controller: _currentController,
          obscure: _obscureCurrent,
          error: _currentError,
          onToggle: () => setState(() => _obscureCurrent = !_obscureCurrent),
        ),
        const SizedBox(height: AppSpacing.sm),
        _passwordField(
          label: 'New password',
          controller: _newController,
          obscure: _obscureNew,
          error: _newError,
          onToggle: () => setState(() => _obscureNew = !_obscureNew),
        ),
        const SizedBox(height: AppSpacing.sm),
        _passwordField(
          label: 'Confirm new password',
          controller: _confirmController,
          obscure: _obscureConfirm,
          error: _confirmError,
          onToggle: () => setState(() => _obscureConfirm = !_obscureConfirm),
        ),
        if (widget.errorMessage != null) ...[
          const SizedBox(height: AppSpacing.sm),
          Container(
            padding: const EdgeInsets.all(AppSpacing.md),
            decoration: BoxDecoration(
              color: const Color(0xFFFEE2E2),
              borderRadius: BorderRadius.circular(AppRadius.md),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(Icons.error_outline, color: AppColors.error, size: 20),
                const SizedBox(width: AppSpacing.sm),
                Expanded(
                  child: Text(
                    widget.errorMessage!,
                    style: const TextStyle(color: AppColors.error, fontSize: 14),
                  ),
                ),
              ],
            ),
          ),
        ],
        const SizedBox(height: AppSpacing.lg),
        AppButton(
          label: 'Update password',
          loading: widget.isLoading,
          onPressed: widget.isLoading ? null : _submit,
        ),
      ],
    );
  }
}
