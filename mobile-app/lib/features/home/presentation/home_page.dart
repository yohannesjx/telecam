import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:school_camera/app/router.dart';
import 'package:school_camera/app/theme.dart';
import 'package:school_camera/core/widgets/async_section.dart';
import 'package:school_camera/core/widgets/loading_skeleton.dart';
import 'package:school_camera/features/auth/application/auth_providers.dart';
import 'package:school_camera/features/cameras/application/parent_cameras_controller.dart';
import 'package:school_camera/features/cameras/domain/parent_camera.dart';
import 'package:school_camera/features/children/application/children_controller.dart';
import 'package:school_camera/features/children/domain/child.dart';
import 'package:school_camera/features/home/application/home_refresh.dart';
import 'package:school_camera/features/home/presentation/widgets/home_app_logo.dart';
import 'package:school_camera/features/home/presentation/widgets/home_camera_hero_card.dart';
import 'package:school_camera/features/home/presentation/widgets/home_child_card.dart';
import 'package:school_camera/features/home/presentation/widgets/home_decorations.dart';
import 'package:school_camera/features/home/presentation/widgets/home_subscription_banner.dart';
import 'package:school_camera/features/notifications/presentation/widgets/notification_permission_banner.dart';
import 'package:school_camera/features/playback/presentation/live_navigation.dart';
import 'package:school_camera/features/subscription/application/subscription_controller.dart';
import 'package:school_camera/features/subscription/domain/parent_subscription.dart';

class HomePage extends ConsumerWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authControllerProvider);
    final children = ref.watch(childrenControllerProvider);
    final cameras = ref.watch(parentCamerasControllerProvider);
    final subscriptions = ref.watch(subscriptionControllerProvider);

    final name = auth.user?.name ?? auth.user?.email.split('@').first ?? 'Parent';

    return Scaffold(
      backgroundColor: HomeDecorations.pageBackground,
      body: SafeArea(
        child: RefreshIndicator(
          color: AppColors.primary,
          onRefresh: () => refreshParentHomeData(ref),
          child: CustomScrollView(
            physics: const AlwaysScrollableScrollPhysics(
              parent: BouncingScrollPhysics(),
            ),
            slivers: [
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(
                    AppSpacing.lg,
                    AppSpacing.md,
                    AppSpacing.lg,
                    AppSpacing.sm,
                  ),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Welcome back',
                              style: HomeDecorations.pageTitle(context),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'Hello, $name',
                              style: HomeDecorations.subtitle(context),
                            ),
                          ],
                        ),
                      ),
                      const HomeAppLogo(),
                    ],
                  ),
                ),
              ),
              const SliverToBoxAdapter(
                child: Padding(
                  padding: EdgeInsets.symmetric(horizontal: AppSpacing.lg),
                  child: NotificationPermissionBanner(),
                ),
              ),
              SliverToBoxAdapter(
                child: _Section(
                  title: 'Your children',
                  child: AsyncSection<List<Child>>(
                    asyncValue: children,
                    onRetry: () =>
                        ref.read(childrenControllerProvider.notifier).refresh(),
                    emptyMessage:
                        'No children are linked to your account yet. Please contact the school.',
                    loadingBuilder: () => const CardLoadingSkeleton(),
                    dataBuilder: (list) => Column(
                      children: [
                        for (var i = 0; i < list.length; i++) ...[
                          if (i > 0) const SizedBox(height: AppSpacing.sm),
                          HomeChildCard(child: list[i]),
                        ],
                      ],
                    ),
                  ),
                ),
              ),
              SliverToBoxAdapter(
                child: _Section(
                  title: 'Cameras',
                  action: TextButton(
                    onPressed: () => context.go(AppRoutes.cameras),
                    child: const Text('See all'),
                  ),
                  child: AsyncSection<List<ParentCamera>>(
                    asyncValue: cameras,
                    onRetry: () =>
                        ref.read(parentCamerasControllerProvider.notifier).refresh(),
                    emptyMessage: 'No cameras are available for your account yet.',
                    loadingBuilder: () => const CardLoadingSkeleton(),
                    dataBuilder: (list) {
                      if (list.isEmpty) return const SizedBox.shrink();
                      return Column(
                        children: [
                          HomeCameraHeroCard(camera: list.first),
                          if (list.length > 1) ...[
                            const SizedBox(height: AppSpacing.sm),
                            for (final cam in list.skip(1).take(3)) ...[
                              HomeCameraListTile(
                                camera: cam,
                                onTap: () =>
                                    openLivePlayerFromCamera(context, ref, cam),
                              ),
                              const SizedBox(height: AppSpacing.sm),
                            ],
                          ],
                        ],
                      );
                    },
                  ),
                ),
              ),
              SliverToBoxAdapter(
                child: _Section(
                  title: 'Subscription',
                  child: AsyncSection<List<ParentSubscription>>(
                    asyncValue: subscriptions,
                    onRetry: () =>
                        ref.read(subscriptionControllerProvider.notifier).refresh(),
                    emptyMessage: 'Subscription status unavailable.',
                    loadingBuilder: () => const CardLoadingSkeleton(),
                    dataBuilder: (list) => HomeSubscriptionBanner(
                      summary: ParentSubscriptionSummary(subscriptions: list),
                    ),
                  ),
                ),
              ),
              const SliverToBoxAdapter(child: SizedBox(height: AppSpacing.xl)),
            ],
          ),
        ),
      ),
    );
  }
}

class _Section extends StatelessWidget {
  const _Section({
    required this.title,
    required this.child,
    this.action,
  });

  final String title;
  final Widget child;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.lg,
        AppSpacing.lg,
        AppSpacing.lg,
        0,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  title,
                  style: HomeDecorations.sectionTitle(context),
                ),
              ),
              if (action != null) action!,
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          child,
        ],
      ),
    );
  }
}
