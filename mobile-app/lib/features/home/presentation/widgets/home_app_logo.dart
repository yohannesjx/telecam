import 'package:flutter/material.dart';
import 'package:school_camera/app/theme.dart';

/// Small brand mark for the home header.
class HomeAppLogo extends StatelessWidget {
  const HomeAppLogo({super.key, this.size = 36});

  final double size;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: AppColors.primaryLight,
        borderRadius: BorderRadius.circular(10),
      ),
      child: const Icon(
        Icons.videocam_rounded,
        size: 20,
        color: AppColors.primary,
      ),
    );
  }
}
