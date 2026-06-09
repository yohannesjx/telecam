import 'package:flutter/material.dart';
import 'package:school_camera/app/theme.dart';
import 'package:school_camera/core/widgets/app_card.dart';

class PrivacySafetyPage extends StatelessWidget {
  const PrivacySafetyPage({super.key});

  static const _points = [
    'Live video is delayed for safety.',
    'Live viewing is available only during school hours.',
    'Access is limited to authorized parents.',
    'Video links are temporary and protected.',
    'Screens may include a watermark for child safety.',
    'Do not share recordings or screenshots.',
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Privacy & safety')),
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.lg),
        children: [
          Text(
            'How we keep viewing safe for families',
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: AppSpacing.md),
          AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                for (var i = 0; i < _points.length; i++) ...[
                  if (i > 0) const SizedBox(height: AppSpacing.md),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Icon(Icons.check_circle_outline, color: AppColors.primary, size: 22),
                      const SizedBox(width: AppSpacing.md),
                      Expanded(
                        child: Text(
                          _points[i],
                          style: Theme.of(context).textTheme.bodyLarge,
                        ),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}
