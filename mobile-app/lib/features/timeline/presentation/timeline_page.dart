import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:school_camera/app/theme.dart';
import 'package:school_camera/core/widgets/app_button.dart';
import 'package:school_camera/core/widgets/app_card.dart';
import 'package:school_camera/features/playback/presentation/recording_playback_navigation.dart';
import 'package:school_camera/features/timeline/application/timeline_camera_context_provider.dart';
import 'package:school_camera/features/timeline/application/timeline_controller.dart';
import 'package:school_camera/features/timeline/domain/timeline_camera_context.dart';
import 'package:school_camera/features/timeline/presentation/widgets/timeline_blocks.dart';
import 'package:school_camera/features/timeline/presentation/widgets/timeline_date_picker.dart';
import 'package:school_camera/features/timeline/presentation/widgets/timeline_empty_state.dart';
import 'package:school_camera/features/timeline/presentation/widgets/timeline_gap_warning.dart';

class TimelinePage extends ConsumerWidget {
  const TimelinePage({required this.cameraId, super.key});

  final String cameraId;

  TimelineCameraContext _context(WidgetRef ref, TimelineState state) {
    final routeCtx = ref.watch(timelineCameraContextProvider);
    final result = state.result;
    return TimelineCameraContext(
      cameraId: cameraId,
      cameraName: routeCtx?.cameraName ?? result?.cameraName,
      schoolName: routeCtx?.schoolName,
      classroomName: routeCtx?.classroomName,
      childName: routeCtx?.childName,
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final timeline = ref.watch(timelineControllerProvider(cameraId));
    final notifier = ref.read(timelineControllerProvider(cameraId).notifier);
    final ctx = _context(ref, timeline);
    final title = ctx.cameraName ?? 'Recordings';

    return Scaffold(
      appBar: AppBar(
        title: Text(title),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => notifier.refreshTimeline(),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => notifier.refreshTimeline(),
        child: ListView(
          padding: const EdgeInsets.all(AppSpacing.lg),
          physics: const AlwaysScrollableScrollPhysics(),
          children: [
            _CameraInfoCard(context: ctx),
            const SizedBox(height: AppSpacing.lg),
            TimelineDatePicker(
              selectedDate: timeline.selectedDate ?? DateTime.now(),
              onDateSelected: notifier.loadTimeline,
            ),
            const SizedBox(height: AppSpacing.lg),
            switch (timeline.phase) {
              TimelineLoadPhase.loading || TimelineLoadPhase.initial =>
                const Center(child: Padding(
                  padding: EdgeInsets.all(AppSpacing.xxl),
                  child: CircularProgressIndicator(),
                )),
              TimelineLoadPhase.error => Column(
                  children: [
                    AppCard(
                      child: Column(
                        children: [
                          Text(
                            timeline.error?.message ??
                                'Something went wrong. Please try again.',
                            textAlign: TextAlign.center,
                          ),
                          const SizedBox(height: AppSpacing.md),
                          AppButton(
                            label: 'Try again',
                            onPressed: () => notifier.refreshTimeline(),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              TimelineLoadPhase.empty => const TimelineEmptyState(),
              TimelineLoadPhase.loaded => TimelineBlocks(
                  blocks: timeline.result!.blocks,
                  onPlayBlock: (block) =>
                      openRecordingPlayback(context, cameraContext: ctx, block: block),
                ),
            },
            if (timeline.phase == TimelineLoadPhase.loaded &&
                timeline.result!.blocks.any((b) => b.hasGaps)) ...[
              const SizedBox(height: AppSpacing.lg),
              const TimelineGapWarning(),
            ],
          ],
        ),
      ),
    );
  }
}

class _CameraInfoCard extends StatelessWidget {
  const _CameraInfoCard({required this.context});

  final TimelineCameraContext context;

  @override
  Widget build(BuildContext context) {
    final ctx = this.context;
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (ctx.childName != null && ctx.childName!.isNotEmpty)
            Text('Child: ${ctx.childName}'),
          if (ctx.classroomName != null && ctx.classroomName!.isNotEmpty)
            Text('Classroom: ${ctx.classroomName}'),
          if (ctx.schoolName != null && ctx.schoolName!.isNotEmpty)
            Text('School: ${ctx.schoolName}'),
        ],
      ),
    );
  }
}
