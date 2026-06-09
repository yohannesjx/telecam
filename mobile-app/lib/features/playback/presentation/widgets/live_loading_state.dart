import 'package:flutter/material.dart';
import 'package:school_camera/app/theme.dart';

class LiveLoadingState extends StatelessWidget {
  const LiveLoadingState({this.message = 'Preparing live video…', super.key});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const CircularProgressIndicator(color: Colors.white70),
          const SizedBox(height: AppSpacing.md),
          Text(
            message,
            style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                  color: Colors.white70,
                ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}
