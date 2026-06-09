import 'package:flutter/material.dart';
import 'package:school_camera/app/theme.dart';
import 'package:school_camera/core/network/api_error.dart';
import 'package:school_camera/core/widgets/app_button.dart';

class LiveErrorState extends StatelessWidget {
  const LiveErrorState({
    required this.error,
    required this.onRetry,
    this.showRetry = true,
    super.key,
  });

  final AppError error;
  final VoidCallback? onRetry;
  final bool showRetry;

  @override
  Widget build(BuildContext context) {
    final icon = switch (error.code) {
      AppErrorCode.liveOutsideSchoolHours => Icons.schedule,
      AppErrorCode.subscriptionRequired => Icons.card_membership_outlined,
      AppErrorCode.cameraOffline => Icons.videocam_off_outlined,
      AppErrorCode.deviceBlocked => Icons.phonelink_erase,
      AppErrorCode.network => Icons.wifi_off,
      _ => Icons.error_outline,
    };

    final canRetry = showRetry &&
        onRetry != null &&
        error.code != AppErrorCode.liveOutsideSchoolHours &&
        error.code != AppErrorCode.deviceBlocked;

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.lg),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 48, color: Colors.white70),
            const SizedBox(height: AppSpacing.md),
            Text(
              error.message,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    color: Colors.white,
                  ),
            ),
            if (canRetry) ...[
              const SizedBox(height: AppSpacing.lg),
              AppButton(
                label: 'Try again',
                fullWidth: false,
                onPressed: onRetry,
              ),
            ],
          ],
        ),
      ),
    );
  }
}
