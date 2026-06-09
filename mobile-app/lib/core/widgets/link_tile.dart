import 'package:flutter/material.dart';
import 'package:school_camera/app/theme.dart';
import 'package:url_launcher/url_launcher.dart';

class LinkTile extends StatelessWidget {
  const LinkTile({
    super.key,
    required this.title,
    required this.uri,
    this.subtitle,
    this.icon = Icons.open_in_new,
  });

  final String title;
  final Uri uri;
  final String? subtitle;
  final IconData icon;

  Future<void> _open(BuildContext context) async {
    if (!await launchUrl(uri, mode: LaunchMode.externalApplication)) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Could not open $title')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return ListTile(
      contentPadding: EdgeInsets.zero,
      leading: Icon(icon, color: AppColors.primary),
      title: Text(title),
      subtitle: subtitle != null ? Text(subtitle!) : null,
      trailing: const Icon(Icons.chevron_right),
      onTap: () => _open(context),
    );
  }
}

class EmailLinkTile extends StatelessWidget {
  const EmailLinkTile({
    super.key,
    required this.title,
    required this.email,
    this.icon = Icons.email_outlined,
  });

  final String title;
  final String email;
  final IconData icon;

  Future<void> _open(BuildContext context) async {
    final uri = Uri(scheme: 'mailto', path: email);
    if (!await launchUrl(uri)) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Could not open email for $title')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return ListTile(
      contentPadding: EdgeInsets.zero,
      leading: Icon(icon, color: AppColors.primary),
      title: Text(title),
      subtitle: Text(email),
      trailing: const Icon(Icons.chevron_right),
      onTap: () => _open(context),
    );
  }
}
