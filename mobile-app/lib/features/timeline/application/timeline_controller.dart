import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:school_camera/core/network/api_error.dart';
import 'package:school_camera/features/playback/application/recording_playback_error_mapper.dart';
import 'package:school_camera/features/timeline/data/timeline_repository.dart';
import 'package:school_camera/features/timeline/domain/timeline_block.dart';

enum TimelineLoadPhase { initial, loading, loaded, empty, error }

class TimelineState {
  const TimelineState({
    this.phase = TimelineLoadPhase.initial,
    this.selectedDate,
    this.result,
    this.error,
  });

  final TimelineLoadPhase phase;
  final DateTime? selectedDate;
  final TimelineDayResult? result;
  final AppError? error;

  TimelineState copyWith({
    TimelineLoadPhase? phase,
    DateTime? selectedDate,
    TimelineDayResult? result,
    AppError? error,
    bool clearError = false,
    bool clearResult = false,
  }) {
    return TimelineState(
      phase: phase ?? this.phase,
      selectedDate: selectedDate ?? this.selectedDate,
      result: clearResult ? null : (result ?? this.result),
      error: clearError ? null : (error ?? this.error),
    );
  }
}

final timelineControllerProvider = AutoDisposeNotifierProviderFamily<
    TimelineController, TimelineState, String>(TimelineController.new);

class TimelineController extends AutoDisposeFamilyNotifier<TimelineState, String> {
  @override
  TimelineState build(String cameraId) {
    final today = _dateOnly(DateTime.now());
    Future.microtask(() => loadTimeline(today));
    return TimelineState(selectedDate: today, phase: TimelineLoadPhase.loading);
  }

  String get cameraId => arg;

  Future<void> loadTimeline(DateTime date) async {
    final day = _dateOnly(date);
    state = state.copyWith(
      phase: TimelineLoadPhase.loading,
      selectedDate: day,
      clearError: true,
    );
    try {
      final result = await ref.read(timelineRepositoryProvider).getTimeline(
            cameraId: cameraId,
            date: day,
          );
      if (result.blocks.isEmpty) {
        state = state.copyWith(
          phase: TimelineLoadPhase.empty,
          result: result,
          clearError: true,
        );
      } else {
        state = state.copyWith(
          phase: TimelineLoadPhase.loaded,
          result: result,
          clearError: true,
        );
      }
    } catch (e) {
      state = state.copyWith(
        phase: TimelineLoadPhase.error,
        error: mapRecordingPlaybackError(e),
        clearResult: true,
      );
    }
  }

  Future<void> refreshTimeline() async {
    final date = state.selectedDate ?? _dateOnly(DateTime.now());
    await loadTimeline(date);
  }

  static DateTime _dateOnly(DateTime d) => DateTime(d.year, d.month, d.day);
}
