import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:school_camera/app/theme.dart';
import 'package:school_camera/core/network/api_error.dart';
import 'package:school_camera/core/widgets/app_button.dart';
import 'package:school_camera/core/widgets/app_card.dart';
import 'package:school_camera/core/widgets/loading_skeleton.dart';

/// Loading, error (with retry), empty, or content for async lists.
class AsyncSection<T> extends StatelessWidget {
  const AsyncSection({
    required this.asyncValue,
    required this.onRetry,
    required this.dataBuilder,
    this.loadingBuilder,
    this.emptyMessage,
    this.emptyBuilder,
    super.key,
  });

  final AsyncValue<T> asyncValue;
  final VoidCallback onRetry;
  final Widget Function(T data) dataBuilder;
  final Widget Function()? loadingBuilder;
  final String? emptyMessage;
  final Widget Function()? emptyBuilder;

  @override
  Widget build(BuildContext context) {
    return asyncValue.when(
      loading: () => loadingBuilder?.call() ?? const LoadingSkeleton(),
      error: (error, _) => _ErrorState(
        message: _messageFor(error),
        onRetry: onRetry,
      ),
      data: (data) {
        if (_isEmpty(data)) {
          return emptyBuilder?.call() ??
              _EmptyState(message: emptyMessage ?? 'Nothing to show yet.');
        }
        return dataBuilder(data);
      },
    );
  }

  bool _isEmpty(T data) {
    if (data is List) return data.isEmpty;
    return false;
  }

  String _messageFor(Object error) {
    if (error is AppError) return error.message;
    return 'Something went wrong. Please try again.';
  }
}

class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Icon(Icons.error_outline, color: Theme.of(context).colorScheme.error, size: 32),
          const SizedBox(height: AppSpacing.sm),
          Text(message, style: Theme.of(context).textTheme.bodyLarge),
          const SizedBox(height: AppSpacing.md),
          AppButton(label: 'Try again', onPressed: onRetry),
        ],
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      child: Row(
        children: [
          Icon(Icons.info_outline, color: Theme.of(context).colorScheme.primary),
          const SizedBox(width: AppSpacing.md),
          Expanded(child: Text(message, style: Theme.of(context).textTheme.bodyLarge)),
        ],
      ),
    );
  }
}
