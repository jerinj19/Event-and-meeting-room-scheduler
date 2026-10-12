import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
import '../../data/models/user_model.dart';

class AppSidebar extends StatelessWidget {
  final int currentIndex;
  final Function(int) onSelectTab;
  final UserModel? user;
  final VoidCallback onLogout;
  final VoidCallback onOpenSettings;
  final VoidCallback? onCloseDrawer;

  const AppSidebar({
    super.key,
    required this.currentIndex,
    required this.onSelectTab,
    required this.user,
    required this.onLogout,
    required this.onOpenSettings,
    this.onCloseDrawer,
  });

  @override
  Widget build(BuildContext context) {
    final isStaff = user?.isStaff ?? false;

    return Container(
      width: 240,
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(
          right: BorderSide(color: Color(0xFFE2E8F0), width: 1),
        ),
      ),
      child: SafeArea(
        child: Column(
          children: [
            // Mobile Drawer Header
            if (onCloseDrawer != null)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                decoration: const BoxDecoration(
                  border: Border(bottom: BorderSide(color: Color(0xFFF1F5F9), width: 1)),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Navigation',
                      style: TextStyle(
                        fontFamily: 'Inter',
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF0F172A),
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close_rounded, size: 20, color: Color(0xFF64748B)),
                      onPressed: onCloseDrawer,
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                    ),
                  ],
                ),
              ),

            // Primary Navigation Links (Exact Web Sidebar.jsx & AdminSidebar.jsx)
            Expanded(
              child: Material(
                color: Colors.transparent,
                child: ListView(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 12),
                  children: [
                    if (isStaff) ...[
                      _buildNavTile(
                        index: 4,
                        icon: Icons.dashboard_outlined,
                        label: 'Admin Dashboard',
                      ),
                      const SizedBox(height: 4),
                      _buildNavTile(
                        index: 5,
                        icon: Icons.list_alt_rounded,
                        label: 'All Bookings',
                      ),
                      const SizedBox(height: 4),
                      _buildNavTile(
                        index: 6,
                        icon: Icons.meeting_room_outlined,
                        label: 'Manage Rooms',
                      ),
                      const SizedBox(height: 4),
                      _buildNavTile(
                        index: 7,
                        icon: Icons.group_outlined,
                        label: 'User & Admin Directory',
                      ),
                      const SizedBox(height: 4),
                      _buildNavTile(
                        index: 8,
                        icon: Icons.schedule_rounded,
                        label: 'Time Slots',
                      ),
                      const SizedBox(height: 4),
                      _buildNavTile(
                        index: 9,
                        icon: Icons.analytics_outlined,
                        label: 'System Reports',
                      ),
                    ] else ...[
                      _buildNavTile(
                        index: 0,
                        icon: Icons.dashboard_rounded,
                        label: 'Welcome Dashboard',
                      ),
                      const SizedBox(height: 4),
                      _buildNavTile(
                        index: 1,
                        icon: Icons.meeting_room_outlined,
                        label: 'Browse Rooms',
                      ),
                      const SizedBox(height: 4),
                      _buildNavTile(
                        index: 3, // Book a slot navigates to booking or quick book
                        icon: Icons.schedule_rounded,
                        label: 'Book a Slot',
                        badge: 'Live',
                      ),
                      const SizedBox(height: 4),
                      _buildNavTile(
                        index: 2,
                        icon: Icons.calendar_month_outlined,
                        label: 'My Bookings',
                      ),
                    ],
                  ],
                ),
              ),
            ),

            // Bottom Footer Section (Settings & Sign Out)
            Container(
              decoration: const BoxDecoration(
                border: Border(top: BorderSide(color: Color(0xFFE2E8F0), width: 1)),
              ),
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 12),
              child: Column(
                children: [
                  _buildFooterTile(
                    icon: Icons.tune_rounded,
                    label: 'Settings',
                    color: const Color(0xFF64748B),
                    onTap: onOpenSettings,
                  ),
                  const SizedBox(height: 4),
                  _buildFooterTile(
                    icon: Icons.logout_rounded,
                    label: 'Sign Out',
                    color: const Color(0xFFF43F5E), // Rose red from web
                    onTap: onLogout,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildNavTile({
    required int index,
    required IconData icon,
    required String label,
    String? badge,
  }) {
    final isSelected = currentIndex == index;

    return InkWell(
      onTap: () => onSelectTab(index),
      borderRadius: BorderRadius.circular(10),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFFEFF6FF) : Colors.transparent, // blue-50/80
          borderRadius: BorderRadius.circular(10),
          border: isSelected
              ? const Border(
                  left: BorderSide(color: AppTheme.primary, width: 4),
                )
              : null,
        ),
        child: Row(
          children: [
            Icon(
              icon,
              size: 20,
              color: isSelected ? AppTheme.primary : const Color(0xFF64748B),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                label,
                style: TextStyle(
                  fontFamily: 'Inter',
                  fontSize: 13,
                  fontWeight: isSelected ? FontWeight.w700 : FontWeight.w600,
                  color: isSelected ? AppTheme.primary : const Color(0xFF334155),
                ),
              ),
            ),
            if (badge != null)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                decoration: BoxDecoration(
                  color: const Color(0xFFDBEAFE), // blue-100
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  badge,
                  style: const TextStyle(
                    fontFamily: 'Inter',
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF1D4ED8), // blue-700
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildFooterTile({
    required IconData icon,
    required String label,
    required Color color,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
        child: Row(
          children: [
            Icon(icon, size: 18, color: color),
            const SizedBox(width: 12),
            Text(
              label,
              style: TextStyle(
                fontFamily: 'Inter',
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: color,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
