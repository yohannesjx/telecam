import 'package:flutter/material.dart';
import 'package:school_camera/app/theme.dart';

class NotificationToggleTile extends StatelessWidget {
  const NotificationToggleTile({
    super.key,
    required this.title,
    required this.subtitle,
    required this.value,
    required this.onChanged,
    this.enabled = true,
  });

  final String title;
  final String subtitle;
  final bool value;
  final bool enabled;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    return SwitchListTile(
      contentPadding: EdgeInsets.zero,
      title: Text(title, style: Theme.of(context).textTheme.titleSmall),
      subtitle: Text(subtitle, style: Theme.of(context).textTheme.bodyMedium),
      value: value,
      onChanged: enabled ? onChanged : null,
      secondary: const Icon(Icons.notifications_none, color: AppColors.primary),
    );
  }
}
