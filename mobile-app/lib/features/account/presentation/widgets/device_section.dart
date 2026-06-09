import 'package:flutter/material.dart';
import 'package:school_camera/app/theme.dart';
import 'package:school_camera/core/widgets/app_card.dart';

class DeviceSection extends StatelessWidget {
  const DeviceSection({
    super.key,
    required this.deviceName,
    required this.platform,
    required this.appVersion,
    required this.biometricAvailable,
    this.deviceStatusLabel = 'Current device',
  });

  final String deviceName;
  final String platform;
  final String appVersion;
  final bool biometricAvailable;
  final String deviceStatusLabel;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Device', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: AppSpacing.md),
          _line(context, 'Device', deviceName),
          _line(context, 'Platform', platform),
          _line(context, 'App version', appVersion),
          _line(
            context,
            'Biometrics',
            biometricAvailable ? 'Available' : 'Not available',
          ),
          _line(context, 'Device status', deviceStatusLabel),
        ],
      ),
    );
  }

  Widget _line(BuildContext context, String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 110,
            child: Text(label, style: Theme.of(context).textTheme.bodyMedium),
          ),
          Expanded(
            child: Text(value, style: Theme.of(context).textTheme.bodyLarge),
          ),
        ],
      ),
    );
  }
}
