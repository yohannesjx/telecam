import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:school_camera/app/theme.dart';

class ParentShell extends StatelessWidget {
  const ParentShell({required this.navigationShell, super.key});

  final StatefulNavigationShell navigationShell;

  void _onTap(int index) {
    navigationShell.goBranch(
      index,
      initialLocation: index == navigationShell.currentIndex,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: navigationShell,
      bottomNavigationBar: NavigationBarTheme(
        data: NavigationBarThemeData(
          height: 64,
          backgroundColor: AppColors.surface,
          indicatorColor: AppColors.primaryLight,
          surfaceTintColor: Colors.transparent,
          shadowColor: Colors.black26,
          elevation: 8,
          labelTextStyle: WidgetStateProperty.resolveWith((states) {
            final selected = states.contains(WidgetState.selected);
            return TextStyle(
              fontSize: 11,
              fontWeight: selected ? FontWeight.w600 : FontWeight.w500,
              color: selected ? AppColors.primary : AppColors.textSecondary,
            );
          }),
          iconTheme: WidgetStateProperty.resolveWith((states) {
            final selected = states.contains(WidgetState.selected);
            return IconThemeData(
              size: 22,
              color: selected ? AppColors.primary : AppColors.textSecondary,
            );
          }),
        ),
        child: NavigationBar(
          selectedIndex: navigationShell.currentIndex,
          onDestinationSelected: _onTap,
          labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
          destinations: const [
            NavigationDestination(
              icon: Icon(Icons.home_outlined),
              selectedIcon: Icon(Icons.home_rounded),
              label: 'Home',
            ),
            NavigationDestination(
              icon: Icon(Icons.videocam_outlined),
              selectedIcon: Icon(Icons.videocam_rounded),
              label: 'Live',
            ),
            NavigationDestination(
              icon: Icon(Icons.history_outlined),
              selectedIcon: Icon(Icons.history_rounded),
              label: 'Timeline',
            ),
            NavigationDestination(
              icon: Icon(Icons.card_membership_outlined),
              selectedIcon: Icon(Icons.card_membership_rounded),
              label: 'Plans',
            ),
            NavigationDestination(
              icon: Icon(Icons.person_outline),
              selectedIcon: Icon(Icons.person_rounded),
              label: 'Account',
            ),
          ],
        ),
      ),
    );
  }
}

/// Section title used across parent screens.
class SectionHeader extends StatelessWidget {
  const SectionHeader(this.title, {this.action, this.style, super.key});

  final String title;
  final Widget? action;
  final TextStyle? style;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
      child: Row(
        children: [
          Expanded(
            child: Text(
              title,
              style: style ??
                  Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
            ),
          ),
          if (action != null) action!,
        ],
      ),
    );
  }
}
