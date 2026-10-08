import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_theme.dart';
import '../../providers/booking_provider.dart';
import '../../providers/room_provider.dart';
import '../dashboard/widgets/quick_action_card.dart';
import '../dashboard/widgets/stat_card.dart';
import 'admin_bookings_screen.dart';
import 'admin_room_form_screen.dart';
import 'admin_room_list_screen.dart';

class AdminDashboardScreen extends StatefulWidget {
  final VoidCallback? onBack;
  final VoidCallback? onOpenDrawer;
  final bool hasGlobalHeader;

  const AdminDashboardScreen({
    super.key,
    this.onBack,
    this.onOpenDrawer,
    this.hasGlobalHeader = false,
  });

  @override
  State<AdminDashboardScreen> createState() => _AdminDashboardScreenState();
}

class _AdminDashboardScreenState extends State<AdminDashboardScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadAdminData();
    });
  }

  Future<void> _loadAdminData() async {
    final bookingProvider = Provider.of<BookingProvider>(context, listen: false);
    final roomProvider = Provider.of<RoomProvider>(context, listen: false);
    await Future.wait([
      bookingProvider.fetchStats(),
      roomProvider.fetchRooms(),
    ]);
  }

  @override
  Widget build(BuildContext context) {
    final bookingProvider = Provider.of<BookingProvider>(context);
    final roomProvider = Provider.of<RoomProvider>(context);
    final stats = bookingProvider.stats;
    final rooms = roomProvider.rooms;
    final activeRoomsCount = rooms.where((r) => r.isActive).length;
    final maintenanceRoomsCount = rooms.where((r) => !r.isActive).length;

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Admin Management Console'),
        leading: widget.onBack != null
            ? IconButton(
                icon: const Icon(Icons.arrow_back_rounded),
                tooltip: 'Back to Dashboard',
                onPressed: widget.onBack,
              )
            : (widget.onOpenDrawer != null
                ? IconButton(
                    icon: const Icon(Icons.menu_rounded),
                    tooltip: 'Navigation Menu',
                    onPressed: widget.onOpenDrawer,
                  )
                : null),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            tooltip: 'Refresh metrics',
            onPressed: _loadAdminData,
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _loadAdminData,
        color: AppTheme.primary,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 1000),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Admin Header Badge
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(18),
                    decoration: BoxDecoration(
                      color: AppTheme.surface,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: AppTheme.border),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.02),
                          blurRadius: 8,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: AppTheme.primaryDark,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: const Icon(Icons.admin_panel_settings_rounded, color: Colors.white, size: 28),
                        ),
                        const SizedBox(width: 14),
                        const Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Enterprise Operations',
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w800,
                                  color: AppTheme.textPrimary,
                                ),
                              ),
                              SizedBox(height: 2),
                              Text(
                                'Manage rooms, inventory, maintenance & reservations',
                                style: TextStyle(fontSize: 12, color: AppTheme.textSecondary),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),

                  // System KPI Metrics Grid
                  const Text(
                    'Enterprise Metrics',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: AppTheme.textPrimary),
                  ),
                  const SizedBox(height: 12),
                  LayoutBuilder(
                    builder: (context, constraints) {
                      final crossAxisCount = constraints.maxWidth >= 700 ? 4 : 2;
                      return GridView.count(
                        crossAxisCount: crossAxisCount,
                        crossAxisSpacing: 12,
                        mainAxisSpacing: 12,
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        childAspectRatio: crossAxisCount == 4 ? 1.4 : 1.35,
                        children: [
                          StatCard(
                            title: 'Total Spaces',
                            value: rooms.length.toString(),
                            icon: Icons.meeting_room_rounded,
                            color: AppTheme.primary,
                            backgroundColor: AppTheme.primaryLight,
                          ),
                          StatCard(
                            title: 'Under Maintenance',
                            value: maintenanceRoomsCount.toString(),
                            icon: Icons.build_circle_rounded,
                            color: AppTheme.error,
                            backgroundColor: AppTheme.errorLight,
                          ),
                          StatCard(
                            title: 'All Bookings',
                            value: stats.totalBookings.toString(),
                            icon: Icons.assignment_rounded,
                            color: AppTheme.accent,
                            backgroundColor: AppTheme.accentLight,
                          ),
                          StatCard(
                            title: 'Utilization Rate',
                            value: '${stats.utilizationRate.toStringAsFixed(1)}%',
                            icon: Icons.pie_chart_rounded,
                            color: AppTheme.success,
                            backgroundColor: AppTheme.successLight,
                          ),
                        ],
                      );
                    },
                  ),
                  const SizedBox(height: 24),

                  // Operational Management Actions
                  const Text(
                    'Operational Controls',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: AppTheme.textPrimary),
                  ),
                  const SizedBox(height: 12),
                  QuickActionCard(
                    title: 'Room Catalog Management',
                    subtitle: 'Manage all $activeRoomsCount active and $maintenanceRoomsCount maintenance rooms',
                    icon: Icons.meeting_room_rounded,
                    iconColor: AppTheme.primary,
                    iconBgColor: AppTheme.primaryLight,
                    onTap: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(builder: (_) => const AdminRoomListScreen()),
                      );
                    },
                  ),
                  const SizedBox(height: 10),
                  QuickActionCard(
                    title: 'Create New Meeting Room',
                    subtitle: 'Add a new space, set capacity, rate, and AV equipment',
                    icon: Icons.add_home_work_rounded,
                    iconColor: AppTheme.accent,
                    iconBgColor: AppTheme.accentLight,
                    onTap: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(builder: (_) => const AdminRoomFormScreen()),
                      );
                    },
                  ),
                  const SizedBox(height: 10),
                  QuickActionCard(
                    title: 'Enterprise Booking Manager',
                    subtitle: 'View, filter, and cancel reservations across all users',
                    icon: Icons.manage_search_rounded,
                    iconColor: AppTheme.success,
                    iconBgColor: AppTheme.successLight,
                    onTap: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(builder: (_) => const AdminBookingsScreen()),
                      );
                    },
                  ),
                  const SizedBox(height: 32),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
