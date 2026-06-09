import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:school_camera/app/router.dart';
import 'package:school_camera/app/theme.dart';
import 'package:school_camera/core/network/api_error.dart';
import 'package:school_camera/core/session/logout_helper.dart';
import 'package:school_camera/features/auth/application/auth_controller.dart';
import 'package:school_camera/features/auth/application/auth_providers.dart';
import 'package:school_camera/features/auth/presentation/widgets/change_password_form.dart';

class ChangePasswordPage extends ConsumerStatefulWidget {
  const ChangePasswordPage({super.key});

  @override
  ConsumerState<ChangePasswordPage> createState() => _ChangePasswordPageState();
}

class _ChangePasswordPageState extends ConsumerState<ChangePasswordPage> {
  bool _loading = false;
  String? _errorMessage;

  Future<void> _submit(String current, String newPassword) async {
    setState(() {
      _loading = true;
      _errorMessage = null;
    });

    try {
      final result = await ref.read(authControllerProvider.notifier).changePassword(
            currentPassword: current,
            newPassword: newPassword,
          );

      if (!mounted) return;

      if (result == ChangePasswordResult.sessionEnded) {
        await performLogout(ref);
        if (!mounted) return;
        context.go(
          '${AppRoutes.login}?message=${Uri.encodeComponent('Please log in again with your new password.')}',
        );
        return;
      }

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Password changed successfully.')),
      );
      context.go(AppRoutes.account);
    } on AppError catch (e) {
      setState(() => _errorMessage = e.message);
    } catch (_) {
      setState(() => _errorMessage = 'Could not change password. Please try again.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Change password')),
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.lg),
        children: [
          Text(
            'Choose a strong password you do not use elsewhere.',
            style: Theme.of(context).textTheme.bodyMedium,
          ),
          const SizedBox(height: AppSpacing.lg),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(AppSpacing.lg),
              child: ChangePasswordForm(
                isLoading: _loading,
                errorMessage: _errorMessage,
                onSubmit: _submit,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
