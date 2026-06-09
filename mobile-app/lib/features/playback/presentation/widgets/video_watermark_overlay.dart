import 'dart:async';

import 'package:flutter/material.dart';
import 'package:school_camera/app/theme.dart';
import 'package:school_camera/features/playback/domain/watermark_formatter.dart';

class VideoWatermarkOverlay extends StatefulWidget {
  const VideoWatermarkOverlay({
    required this.parentLabel,
    this.childName,
    this.classroomName,
    this.cameraName,
    this.recordingRange,
    this.compact = false,
    super.key,
  });

  final String parentLabel;
  final String? childName;
  final String? classroomName;
  final String? cameraName;
  final String? recordingRange;
  final bool compact;

  @override
  State<VideoWatermarkOverlay> createState() => _VideoWatermarkOverlayState();
}

class _VideoWatermarkOverlayState extends State<VideoWatermarkOverlay> {
  Timer? _timer;
  DateTime _now = DateTime.now();

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(seconds: 45), (_) {
      if (mounted) setState(() => _now = DateTime.now());
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final line1 = WatermarkFormatter.parentLine(
      parentLabel: widget.parentLabel,
      at: _now,
    );
    final line2 = WatermarkFormatter.detailLine(
      childName: widget.childName,
      classroomName: widget.classroomName,
      cameraName: widget.cameraName,
      recordingRange: widget.recordingRange,
    );

    final style = TextStyle(
      color: Colors.white.withValues(alpha: 0.72),
      fontSize: widget.compact ? 10 : 11,
      fontWeight: FontWeight.w500,
      shadows: const [
        Shadow(color: Colors.black54, blurRadius: 4, offset: Offset(0, 1)),
      ],
    );

    return IgnorePointer(
      child: Stack(
        children: [
          Positioned(
            left: AppSpacing.sm,
            bottom: AppSpacing.sm,
            right: widget.compact ? null : AppSpacing.xl,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(line1, style: style),
                if (line2.isNotEmpty) ...[
                  const SizedBox(height: 2),
                  Text(line2, style: style),
                ],
              ],
            ),
          ),
          if (!widget.compact)
            Positioned(
              right: -40,
              top: 40,
              child: Transform.rotate(
                angle: -0.4,
                child: Opacity(
                  opacity: 0.12,
                  child: Text(
                    widget.parentLabel,
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 22,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
