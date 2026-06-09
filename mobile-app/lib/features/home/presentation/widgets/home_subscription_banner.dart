import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:school_camera/app/router.dart';
import 'package:school_camera/app/theme.dart';
import 'package:school_camera/features/home/presentation/widgets/home_decorations.dart';
import 'package:school_camera/features/subscription/domain/parent_subscription.dart';

class HomeSubscriptionBanner extends StatelessWidget {
  const HomeSubscriptionBanner({required this.summary, super.key});

  final ParentSubscriptionSummary summary;

  @override
  Widget build(BuildContext context) {
    final primary = summary.primarySubscription;
    final statusLine = _homeStatusLine(primary);

    return LayoutBuilder(
      builder: (context, constraints) {
        final stackButton = constraints.maxWidth < 340;

        return Container(
          width: double.infinity,
          decoration: HomeDecorations.subscriptionCard,
          padding: const EdgeInsets.all(AppSpacing.lg),
          child: stackButton
              ? Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _Copy(statusLine: statusLine),
                    const SizedBox(height: AppSpacing.md),
                    _ViewPlansButton(compact: true),
                  ],
                )
              : Row(
                  children: [
                    Expanded(child: _Copy(statusLine: statusLine)),
                    const SizedBox(width: AppSpacing.md),
                    const _ViewPlansButton(compact: false),
                  ],
                ),
        );
      },
    );
  }

  String _homeStatusLine(ParentSubscription? sub) {
    if (sub == null) return 'Status unavailable';
    switch (sub.status.toUpperCase()) {
      case 'TRIAL':
        return 'Active trial access';
      case 'ACTIVE':
        return 'Active subscription';
      case 'EXPIRED':
      case 'PAST_DUE':
        return 'Renewal required';
      default:
        return sub.statusLabel;
    }
  }
}

class _Copy extends StatelessWidget {
  const _Copy({required this.statusLine});

  final String statusLine;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Subscription',
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                color: Colors.white,
                fontWeight: FontWeight.w600,
              ),
        ),
        const SizedBox(height: 4),
        Text(
          statusLine,
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: Colors.white.withValues(alpha: 0.9),
              ),
        ),
      ],
    );
  }
}

class _ViewPlansButton extends StatelessWidget {
  const _ViewPlansButton({required this.compact});

  final bool compact;

  @override
  Widget build(BuildContext context) {
    final button = FilledButton(
      onPressed: () => context.go(AppRoutes.subscription),
      style: FilledButton.styleFrom(
        backgroundColor: Colors.white,
        foregroundColor: AppColors.primary,
        elevation: 0,
        padding: EdgeInsets.symmetric(
          horizontal: compact ? AppSpacing.lg : AppSpacing.md,
          vertical: AppSpacing.sm + 2,
        ),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(10),
        ),
      ),
      child: const Text(
        'View plans',
        style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
      ),
    );

    if (compact) {
      return SizedBox(width: double.infinity, child: button);
    }
    return button;
  }
}
