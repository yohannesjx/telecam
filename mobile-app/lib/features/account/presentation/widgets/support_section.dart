import 'package:flutter/material.dart';
import 'package:school_camera/app/theme.dart';
import 'package:school_camera/core/config/support_links.dart';
import 'package:school_camera/core/widgets/app_card.dart';
import 'package:school_camera/core/widgets/link_tile.dart';

class SupportSection extends StatelessWidget {
  const SupportSection({super.key});

  @override
  Widget build(BuildContext context) {
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Support', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: AppSpacing.sm),
          LinkTile(
            title: 'Privacy Policy',
            uri: Uri.parse(SupportLinks.privacyPolicy),
            icon: Icons.privacy_tip_outlined,
          ),
          const Divider(height: 1),
          LinkTile(
            title: 'Terms of Use',
            uri: Uri.parse(SupportLinks.termsOfUse),
            icon: Icons.description_outlined,
          ),
          const Divider(height: 1),
          const EmailLinkTile(
            title: 'Contact School',
            email: SupportLinks.contactSchoolEmail,
            icon: Icons.school_outlined,
          ),
          const Divider(height: 1),
          const EmailLinkTile(
            title: 'Contact Support',
            email: SupportLinks.supportEmail,
            icon: Icons.support_agent_outlined,
          ),
        ],
      ),
    );
  }
}
