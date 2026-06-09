import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:school_camera/app/theme.dart';
import 'package:school_camera/core/widgets/async_section.dart';
import 'package:school_camera/core/widgets/loading_skeleton.dart';
import 'package:school_camera/features/children/application/children_controller.dart';
import 'package:school_camera/features/children/domain/child.dart';
import 'package:school_camera/features/children/presentation/widgets/child_card.dart';
import 'package:school_camera/features/shell/presentation/parent_shell.dart';

class ChildrenPage extends ConsumerWidget {
  const ChildrenPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final children = ref.watch(childrenControllerProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Your children')),
      body: RefreshIndicator(
        onRefresh: () => ref.read(childrenControllerProvider.notifier).refresh(),
        child: ListView(
          padding: const EdgeInsets.all(AppSpacing.lg),
          physics: const AlwaysScrollableScrollPhysics(),
          children: [
            const SectionHeader('Your children'),
            AsyncSection<List<Child>>(
              asyncValue: children,
              onRetry: () => ref.read(childrenControllerProvider.notifier).refresh(),
              emptyMessage:
                  'No children are linked to your account yet.\nPlease contact the school.',
              loadingBuilder: () => const CardLoadingSkeleton(),
              dataBuilder: (list) => Column(
                children: [
                  for (final child in list) ...[
                    ChildCard(child: child),
                    const SizedBox(height: AppSpacing.sm),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
