import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:school_camera/app/router.dart';
import 'package:school_camera/app/theme.dart';
import 'package:school_camera/core/session/logout_helper.dart';
import 'package:school_camera/core/utils/account_formatters.dart';
import 'package:school_camera/core/widgets/app_button.dart';
import 'package:school_camera/features/account/presentation/widgets/device_section.dart';
import 'package:school_camera/features/account/presentation/widgets/notifications_section.dart';
import 'package:school_camera/features/account/presentation/widgets/privacy_safety_section.dart';
import 'package:school_camera/features/account/presentation/widgets/profile_section.dart';
import 'package:school_camera/features/account/presentation/widgets/security_section.dart';
import 'package:school_camera/features/account/presentation/widgets/support_section.dart';
import 'package:school_camera/features/auth/application/auth_providers.dart';
import 'package:school_camera/features/security/application/security_providers.dart';

class AccountPage extends ConsumerStatefulWidget {
  const AccountPage({super.key});

  @override
  ConsumerState<AccountPage> createState() => _AccountPageState();
}

class _AccountPageState extends ConsumerState<AccountPage> {
  String _deviceName = '—';
  String _platform = '—';
  String _appVersion = '—';
  bool _biometricAvailable = false;

  @override
  void initState() {
    super.initState();
    _loadDeviceInfo();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(authControllerProvider.notifier).refreshProfile();
    });
  }

  Future<void> _loadDeviceInfo() async {
    final deviceInfo = ref.read(deviceInfoServiceProvider);
    final biometric = ref.read(biometricServiceProvider);
    final name = await deviceInfo.getDeviceName();
    final platform = await deviceInfo.getPlatformLabel();
    final version = await deviceInfo.getAppVersionLabel();
    final available = await biometric.isBiometricAvailable();
    if (!mounted) return;
    setState(() {
      _deviceName = name;
      _platform = platform;
      _appVersion = version;
      _biometricAvailable = available;
    });
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authControllerProvider);
    final user = auth.user;

    ref.listen(authControllerProvider, (prev, next) {
      if (prev?.isAuthenticated == true && !next.isAuthenticated && context.mounted) {
        context.go(AppRoutes.login);
      }
    });

    if (user != null && !user.isActive) {
      WidgetsBinding.instance.addPostFrameCallback((_) async {
        await performLogout(ref);
      });
    }

    return Scaffold(
      appBar: AppBar(title: const Text('Account')),
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.lg),
        children: [
          if (user != null)
            ProfileSection(
              user: user,
              showWarning: !AccountFormatters.isActiveStatus(user.status),
            )
          else
            const Center(child: CircularProgressIndicator()),
          const SizedBox(height: AppSpacing.lg),
          const SecuritySection(),
          const SizedBox(height: AppSpacing.lg),
          const NotificationsSection(),
          const SizedBox(height: AppSpacing.lg),
          DeviceSection(
            deviceName: _deviceName,
            platform: _platform,
            appVersion: _appVersion,
            biometricAvailable: _biometricAvailable,
          ),
          const SizedBox(height: AppSpacing.lg),
          const PrivacySafetySection(),
          const SizedBox(height: AppSpacing.lg),
          const SupportSection(),
          const SizedBox(height: AppSpacing.xl),
          AppButton(
            label: 'Sign out',
            variant: AppButtonVariant.secondary,
            loading: auth.isLoading,
            onPressed: auth.isLoading
                ? null
                : () async {
                    await performLogout(ref);
                    if (context.mounted) context.go(AppRoutes.login);
                  },
          ),
        ],
      ),
    );
  }
}
