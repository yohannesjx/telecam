import 'package:flutter/material.dart';
import 'package:school_camera/app/theme.dart';
import 'package:school_camera/core/widgets/app_button.dart';
import 'package:school_camera/core/widgets/app_text_field.dart';

class LoginForm extends StatefulWidget {
  const LoginForm({
    super.key,
    required this.onSubmit,
    required this.isLoading,
    this.errorMessage,
  });

  final Future<void> Function(String email, String password) onSubmit;
  final bool isLoading;
  final String? errorMessage;

  @override
  State<LoginForm> createState() => _LoginFormState();
}

class _LoginFormState extends State<LoginForm> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscurePassword = true;
  String? _emailError;
  String? _passwordError;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  bool _isValidEmail(String value) {
    return RegExp(r'^[^@]+@[^@]+\.[^@]+').hasMatch(value.trim());
  }

  Future<void> _submit() async {
    final email = _emailController.text.trim();
    final password = _passwordController.text;

    setState(() {
      _emailError = email.isEmpty
          ? 'Email is required'
          : (!_isValidEmail(email) ? 'Enter a valid email' : null);
      _passwordError = password.isEmpty ? 'Password is required' : null;
    });

    if (_emailError != null || _passwordError != null) return;

    await widget.onSubmit(email, password);
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        AppTextField(
          label: 'Email',
          hint: 'you@email.com',
          controller: _emailController,
          keyboardType: TextInputType.emailAddress,
          prefixIcon: Icons.email_outlined,
          enabled: !widget.isLoading,
        ),
        if (_emailError != null) ...[
          const SizedBox(height: AppSpacing.xs),
          Text(_emailError!, style: TextStyle(color: AppColors.error, fontSize: 13)),
        ],
        const SizedBox(height: AppSpacing.md),
        AppTextField(
          label: 'Password',
          hint: '••••••••',
          controller: _passwordController,
          obscureText: _obscurePassword,
          prefixIcon: Icons.lock_outline,
          enabled: !widget.isLoading,
        ),
        if (_passwordError != null) ...[
          const SizedBox(height: AppSpacing.xs),
          Text(_passwordError!, style: TextStyle(color: AppColors.error, fontSize: 13)),
        ],
        Align(
          alignment: Alignment.centerRight,
          child: TextButton(
            onPressed: widget.isLoading ? null : () {
              setState(() => _obscurePassword = !_obscurePassword);
            },
            child: Text(_obscurePassword ? 'Show password' : 'Hide password'),
          ),
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
          label: 'Sign in',
          onPressed: widget.isLoading ? null : _submit,
          loading: widget.isLoading,
        ),
      ],
    );
  }
}
