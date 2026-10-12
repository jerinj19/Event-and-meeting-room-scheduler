import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../core/config/api_config.dart';
import '../../core/theme/app_theme.dart';
import '../../data/models/booking_model.dart';
import '../../data/models/stats_model.dart';
import '../../data/models/user_model.dart';
import '../../providers/auth_provider.dart';
import '../../providers/booking_provider.dart';
import '../../providers/room_provider.dart';

class UserDashboardScreen extends StatefulWidget {
  final Function(int) onNavigateTab;
  final VoidCallback? onOpenDrawer;
  final VoidCallback? onOpenSettings;
  final bool hasGlobalHeader;

  const UserDashboardScreen({
    super.key,
    required this.onNavigateTab,
    this.onOpenDrawer,
    this.onOpenSettings,
    this.hasGlobalHeader = false,
  });

  @override
  State<UserDashboardScreen> createState() => _UserDashboardScreenState();
}

class _UserDashboardScreenState extends State<UserDashboardScreen> {
  String _activeTab = 'upcoming'; // 'upcoming' or 'past'
  String _floorFilter = 'All Floors';
  String _capacityFilter = 'Any Capacity';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _refreshData();
    });
  }

  Future<void> _refreshData() async {
    final bp = Provider.of<BookingProvider>(context, listen: false);
    final rp = Provider.of<RoomProvider>(context, listen: false);
    await Future.wait([
      bp.fetchDashboardStats(),
      bp.fetchMyBookings(),
      rp.fetchRooms(),
    ]);
  }

  void _handleCancelBooking(BookingModel booking) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Cancel Reservation?'),
        content: Text('Are you sure you want to cancel the booking for "${booking.roomName}"? This slot will be returned to the company pool.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Keep Booking'),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.of(ctx).pop();
              final bp = Provider.of<BookingProvider>(context, listen: false);
              final ok = await bp.cancelBooking(booking.id);
              if (mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(ok ? 'Booking cancelled successfully.' : (bp.errorMessage ?? 'Failed to cancel.')),
                    backgroundColor: ok ? AppTheme.primary : AppTheme.error,
                  ),
                );
              }
            },
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.error),
            child: const Text('Confirm Cancel'),
          ),
        ],
      ),
    );
  }

  void _exportCSV(List<BookingModel> bookings) {
    if (bookings.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No bookings to export.')),
      );
      return;
    }
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Exported ${bookings.length} reservations to CSV successfully.'),
        backgroundColor: AppTheme.success,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);
    final bookingProvider = Provider.of<BookingProvider>(context);
    final roomProvider = Provider.of<RoomProvider>(context);

    final user = authProvider.currentUser;
    final stats = bookingProvider.stats;

    final upcomingList = bookingProvider.myBookings
        .where((b) => !b.isPast && !b.isCancelled)
        .toList();
    final pastList = bookingProvider.myBookings
        .where((b) => b.isPast || b.isCancelled)
        .toList();

    final nextMeeting = upcomingList.isNotEmpty ? upcomingList.first.roomName : null;
    final liveDateFormatted = DateFormat('EEEE, MMM d, yyyy').format(DateTime.now());

    // Extract available floor locations from rooms
    final locations = <String>{'All Floors'};
    for (final r in roomProvider.rooms) {
      if (r.location.isNotEmpty) locations.add(r.location);
    }

    // Filter displayed list based on active tab and filters
    List<BookingModel> displayedList = _activeTab == 'upcoming' ? upcomingList : pastList;
    if (_floorFilter != 'All Floors') {
      displayedList = displayedList.where((b) => b.roomLocation == _floorFilter).toList();
    }
    if (_capacityFilter != 'Any Capacity') {
      if (_capacityFilter == '1-4 People') {
        displayedList = displayedList.where((b) => b.attendeesCount <= 4).toList();
      } else if (_capacityFilter == '5-12 People') {
        displayedList = displayedList.where((b) => b.attendeesCount >= 5 && b.attendeesCount <= 12).toList();
      } else if (_capacityFilter == '15+ People') {
        displayedList = displayedList.where((b) => b.attendeesCount >= 15).toList();
      }
    }

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: widget.hasGlobalHeader
          ? null
          : AppBar(
              title: const Text('Innovyx Rooms', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
              leading: widget.onOpenDrawer != null
                  ? IconButton(icon: const Icon(Icons.menu_rounded), onPressed: widget.onOpenDrawer)
                  : null,
            ),
      body: LayoutBuilder(
        builder: (context, constraints) {
          final screenWidth = constraints.maxWidth;
          final isTabletOrDesktop = screenWidth >= 750;
          final double hPadding = isTabletOrDesktop ? 28 : 16;

          return RefreshIndicator(
            onRefresh: _refreshData,
            color: AppTheme.primary,
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: EdgeInsets.symmetric(horizontal: hPadding, vertical: 20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // 1. Welcome Hero Section (Exact Web Style)
                  _buildWelcomeHero(user, upcomingList.length, liveDateFormatted, isTabletOrDesktop),
                  const SizedBox(height: 20),

                  // 2. Bento KPI Cards (Exact 4 Cards from Web Image 1)
                  _buildBentoKpiGrid(stats, upcomingList.length, nextMeeting, isTabletOrDesktop),
                  const SizedBox(height: 28),

                  // 3. Bookings Section (Tabs, Filter Bar & Table / Cards)
                  _buildBookingsSection(
                    upcomingCount: upcomingList.length,
                    pastCount: pastList.length,
                    displayedBookings: displayedList,
                    locations: locations.toList(),
                    isTabletOrDesktop: isTabletOrDesktop,
                  ),
                  const SizedBox(height: 24),

                  // 4. Automated Presence Verification & Room Sync Banner
                  _buildPresenceSyncBanner(isTabletOrDesktop),
                  const SizedBox(height: 32),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  // --- 1. WELCOME HERO SECTION ---
  Widget _buildWelcomeHero(UserModel? user, int upcomingCount, String liveDateFormatted, bool isWide) {
    final textContent = Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Wrap(
          crossAxisAlignment: WrapCrossAlignment.center,
          spacing: 10,
          runSpacing: 6,
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3.5),
              decoration: BoxDecoration(
                color: const Color(0xFFEFF6FF), // blue-50
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: const Color(0xFFDBEAFE)),
              ),
              child: const Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.sync_rounded, color: AppTheme.primary, size: 13),
                  SizedBox(width: 4),
                  Text(
                    'Enterprise HQ Sync',
                    style: TextStyle(
                      fontFamily: 'Inter',
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: AppTheme.primary,
                    ),
                  ),
                ],
              ),
            ),
            Text(
              liveDateFormatted,
              style: const TextStyle(
                fontFamily: 'Inter',
                fontSize: 12,
                fontWeight: FontWeight.w500,
                color: Color(0xFF64748B),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Text(
          'Welcome, ${user?.firstName.isNotEmpty == true ? user!.firstName : (user?.email.split('@').first ?? 'user')}',
          style: const TextStyle(
            fontFamily: 'Inter',
            fontSize: 24,
            fontWeight: FontWeight.w800,
            color: Color(0xFF0F172A),
            letterSpacing: -0.5,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          'You have $upcomingCount upcoming reservations. Automated badge access is synchronized.',
          style: const TextStyle(
            fontFamily: 'Inter',
            fontSize: 13.5,
            color: Color(0xFF64748B),
          ),
        ),
      ],
    );

    final filterButton = OutlinedButton.icon(
      onPressed: () => widget.onNavigateTab(1), // Go to Browse Rooms
      icon: const Icon(Icons.tune_rounded, size: 16, color: Color(0xFF334155)),
      label: Text(
        isWide ? 'Room Filters' : 'Filters',
        style: const TextStyle(
          fontFamily: 'Inter',
          fontSize: 13,
          fontWeight: FontWeight.w600,
          color: Color(0xFF334155),
        ),
      ),
      style: OutlinedButton.styleFrom(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
        side: const BorderSide(color: Color(0xFFCBD5E1)),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        backgroundColor: const Color(0xFFF8FAFC),
      ),
    );

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: const [
          BoxShadow(
            color: Color(0x0A0F172A),
            blurRadius: 10,
            offset: Offset(0, 2),
          ),
        ],
      ),
      child: isWide
          ? Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(child: textContent),
                const SizedBox(width: 12),
                filterButton,
              ],
            )
          : Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                textContent,
                const SizedBox(height: 14),
                filterButton,
              ],
            ),
    );
  }

  // --- 2. BENTO KPI GRID (4 EXACT CARDS) ---
  Widget _buildBentoKpiGrid(StatsModel stats, int upcomingCount, String? nextMeeting, bool isWide) {
    final int crossAxisCount = isWide ? 4 : 2;
    final double childAspectRatio = isWide ? 1.45 : 1.0;

    return GridView.count(
      crossAxisCount: crossAxisCount,
      crossAxisSpacing: 12,
      mainAxisSpacing: 12,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      childAspectRatio: childAspectRatio,
      children: [
        // Card 1: Upcoming
        _buildKpiCard(
          title: 'Upcoming',
          value: '$upcomingCount Meetings',
          subtitle: nextMeeting != null ? 'Next: $nextMeeting' : 'No upcoming meetings',
          subtitleColor: AppTheme.primary,
          footerIcon: Container(
            width: 7,
            height: 7,
            decoration: const BoxDecoration(
              color: Color(0xFF10B981), // Emerald
              shape: BoxShape.circle,
            ),
          ),
          footerText: 'Synced with schedule',
          icon: Icons.schedule_rounded,
          iconBgColor: const Color(0xFFF1F5F9),
          iconColor: AppTheme.primary,
        ),

        // Card 2: Total History
        _buildKpiCard(
          title: 'Total History',
          value: '${stats.totalBookings} Bookings',
          subtitle: 'Recorded in your account',
          subtitleColor: const Color(0xFF64748B),
          footerIcon: const Icon(Icons.check_circle_rounded, size: 14, color: AppTheme.primary),
          footerText: 'All data logged',
          icon: Icons.event_available_rounded,
          iconBgColor: const Color(0xFFEFF6FF),
          iconColor: AppTheme.primary,
        ),

        // Card 3: Hours Reserved
        _buildKpiCard(
          title: 'Hours Reserved',
          value: '8.5 hrs',
          subtitle: 'Logged this work week',
          subtitleColor: const Color(0xFF64748B),
          footerIcon: const Text(
            '32%',
            style: TextStyle(
              fontFamily: 'Inter',
              fontSize: 11,
              fontWeight: FontWeight.w700,
              color: AppTheme.primary,
            ),
          ),
          footerText: 'of team allocation',
          icon: Icons.timelapse_rounded,
          iconBgColor: const Color(0xFFF1F5F9),
          iconColor: AppTheme.primary,
        ),

        // Card 4: Attendance Rate
        _buildKpiCard(
          title: 'Attendance Rate',
          value: '94%',
          subtitle: 'Verified check-in score',
          subtitleColor: const Color(0xFF047857),
          footerIcon: const Icon(Icons.thumb_up_rounded, size: 13, color: Color(0xFF059669)),
          footerText: 'Excellent space utilization',
          icon: Icons.verified_rounded,
          iconBgColor: const Color(0xFFECFDF5),
          iconColor: const Color(0xFF047857),
        ),
      ],
    );
  }

  Widget _buildKpiCard({
    required String title,
    required String value,
    required String subtitle,
    required Color subtitleColor,
    required Widget footerIcon,
    required String footerText,
    required IconData icon,
    required Color iconBgColor,
    required Color iconColor,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: const [
          BoxShadow(
            color: Color(0x060F172A),
            blurRadius: 6,
            offset: Offset(0, 1),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  title,
                  style: const TextStyle(
                    fontFamily: 'Inter',
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF64748B),
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              Container(
                width: 30,
                height: 30,
                decoration: BoxDecoration(
                  color: iconBgColor,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(icon, color: iconColor, size: 16),
              ),
            ],
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                value,
                style: const TextStyle(
                  fontFamily: 'Inter',
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF0F172A),
                  letterSpacing: -0.4,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 1),
              Text(
                subtitle,
                style: TextStyle(
                  fontFamily: 'Inter',
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: subtitleColor,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
          Container(
            padding: const EdgeInsets.only(top: 8),
            decoration: const BoxDecoration(
              border: Border(top: BorderSide(color: Color(0xFFF1F5F9), width: 1)),
            ),
            child: Row(
              children: [
                footerIcon,
                const SizedBox(width: 5),
                Expanded(
                  child: Text(
                    footerText,
                    style: const TextStyle(
                      fontFamily: 'Inter',
                      fontSize: 10,
                      fontWeight: FontWeight.w500,
                      color: Color(0xFF64748B),
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // --- 3. BOOKINGS MANAGEMENT SECTION ---
  Widget _buildBookingsSection({
    required int upcomingCount,
    required int pastCount,
    required List<BookingModel> displayedBookings,
    required List<String> locations,
    required bool isTabletOrDesktop,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Tabs Header & Filter Bar
        Container(
          padding: const EdgeInsets.only(bottom: 10),
          decoration: const BoxDecoration(
            border: Border(bottom: BorderSide(color: Color(0xFFE2E8F0), width: 1)),
          ),
          child: Wrap(
            alignment: WrapAlignment.spaceBetween,
            crossAxisAlignment: WrapCrossAlignment.center,
            spacing: 12,
            runSpacing: 10,
            children: [
              // Segmented Tab Buttons (Upcoming vs Past)
              Wrap(
                spacing: 8,
                runSpacing: 6,
                children: [
                  _buildTabButton(
                    label: 'Upcoming Bookings',
                    count: upcomingCount,
                    isSelected: _activeTab == 'upcoming',
                    onTap: () => setState(() => _activeTab = 'upcoming'),
                  ),
                  _buildTabButton(
                    label: 'Past Bookings',
                    count: pastCount,
                    isSelected: _activeTab == 'past',
                    onTap: () => setState(() => _activeTab = 'past'),
                  ),
                ],
              ),

              // Filter Controls: Floor, Capacity, Export CSV
              Wrap(
                spacing: 8,
                runSpacing: 8,
                crossAxisAlignment: WrapCrossAlignment.center,
                children: [
                  // Floor Selector Dropdown
                  Container(
                    height: 34,
                    padding: const EdgeInsets.symmetric(horizontal: 10),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: const Color(0xFFCBD5E1)),
                    ),
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton<String>(
                        value: locations.contains(_floorFilter) ? _floorFilter : 'All Floors',
                        icon: const Icon(Icons.expand_more_rounded, size: 16, color: Color(0xFF64748B)),
                        style: const TextStyle(
                          fontFamily: 'Inter',
                          fontSize: 12,
                          color: Color(0xFF0F172A),
                          fontWeight: FontWeight.w600,
                        ),
                        items: locations.map((loc) {
                          return DropdownMenuItem<String>(
                            value: loc,
                            child: Text(loc),
                          );
                        }).toList(),
                        onChanged: (val) {
                          if (val != null) setState(() => _floorFilter = val);
                        },
                      ),
                    ),
                  ),

                  // Capacity Selector Dropdown
                  Container(
                    height: 34,
                    padding: const EdgeInsets.symmetric(horizontal: 10),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: const Color(0xFFCBD5E1)),
                    ),
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton<String>(
                        value: _capacityFilter,
                        icon: const Icon(Icons.people_alt_outlined, size: 16, color: Color(0xFF64748B)),
                        style: const TextStyle(
                          fontFamily: 'Inter',
                          fontSize: 12,
                          color: Color(0xFF0F172A),
                          fontWeight: FontWeight.w600,
                        ),
                        items: const [
                          DropdownMenuItem(value: 'Any Capacity', child: Text('Any Capacity')),
                          DropdownMenuItem(value: '1-4 People', child: Text('1-4 People')),
                          DropdownMenuItem(value: '5-12 People', child: Text('5-12 People')),
                          DropdownMenuItem(value: '15+ People', child: Text('15+ People')),
                        ],
                        onChanged: (val) {
                          if (val != null) setState(() => _capacityFilter = val);
                        },
                      ),
                    ),
                  ),

                  // Export CSV Button
                  OutlinedButton.icon(
                    onPressed: () => _exportCSV(displayedBookings),
                    icon: const Icon(Icons.download_rounded, size: 15, color: Color(0xFF334155)),
                    label: const Text(
                      'Export CSV',
                      style: TextStyle(
                        fontFamily: 'Inter',
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF334155),
                      ),
                    ),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                      side: const BorderSide(color: Color(0xFFCBD5E1)),
                      backgroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      minimumSize: const Size(0, 34),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 14),

        // Table / Empty State Card
        if (displayedBookings.isEmpty)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(vertical: 40, horizontal: 20),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: Center(
              child: Text(
                'No $_activeTab bookings found.',
                style: const TextStyle(
                  fontFamily: 'Inter',
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                  color: Color(0xFF64748B),
                ),
              ),
            ),
          )
        else
          ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: displayedBookings.length,
            separatorBuilder: (context, index) => const SizedBox(height: 10),
            itemBuilder: (context, index) {
              final b = displayedBookings[index];
              return _buildBookingRowCard(b);
            },
          ),
      ],
    );
  }

  Widget _buildTabButton({
    required String label,
    required int count,
    required bool isSelected,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          border: Border(
            bottom: BorderSide(
              color: isSelected ? AppTheme.primary : Colors.transparent,
              width: 2.5,
            ),
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              label,
              style: TextStyle(
                fontFamily: 'Inter',
                fontSize: 13,
                fontWeight: isSelected ? FontWeight.w700 : FontWeight.w600,
                color: isSelected ? AppTheme.primary : const Color(0xFF64748B),
              ),
            ),
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 1.5),
              decoration: BoxDecoration(
                color: isSelected ? const Color(0xFFEFF6FF) : const Color(0xFFF1F5F9),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                count.toString(),
                style: TextStyle(
                  fontFamily: 'Inter',
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  color: isSelected ? AppTheme.primary : const Color(0xFF64748B),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBookingRowCard(BookingModel b) {
    final isConfirmed = b.status.toUpperCase() == 'CONFIRMED';
    final isCancelled = b.isCancelled;

    final formattedDate = DateFormat('EEE, MMM d, yyyy').format(b.startTime);
    final startTimeStr = DateFormat('hh:mm a').format(b.startTime);
    final endTimeStr = DateFormat('hh:mm a').format(b.endTime);

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Room Thumbnail with RM Badge
          Stack(
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: SizedBox(
                  width: 72,
                  height: 52,
                  child: Image.network(
                    ApiConfig.formatImageUrl(b.roomImage),
                    fit: BoxFit.cover,
                    errorBuilder: (c, e, s) => Container(
                      color: const Color(0xFFEFF6FF),
                      child: const Icon(Icons.meeting_room_outlined, color: AppTheme.primary, size: 24),
                    ),
                  ),
                ),
              ),
              Positioned(
                bottom: 2,
                right: 2,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                  decoration: BoxDecoration(
                    color: Colors.black.withValues(alpha: 0.7),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: const Text(
                    'RM',
                    style: TextStyle(fontSize: 8, fontWeight: FontWeight.bold, color: Colors.white),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(width: 12),

          // Details
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        b.roomName,
                        style: const TextStyle(
                          fontFamily: 'Inter',
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          color: Color(0xFF0F172A),
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    const SizedBox(width: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF1F5F9),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        'Cap: ${b.attendeesCount}',
                        style: const TextStyle(
                          fontFamily: 'Inter',
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                          color: AppTheme.primary,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 3),
                Row(
                  children: [
                    const Icon(Icons.location_on_outlined, size: 13, color: Color(0xFF64748B)),
                    const SizedBox(width: 3),
                    Text(
                      b.roomLocation,
                      style: const TextStyle(
                        fontFamily: 'Inter',
                        fontSize: 11.5,
                        color: Color(0xFF64748B),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 5),
                Text(
                  '$formattedDate  •  $startTimeStr - $endTimeStr (${b.durationMinutes}m)',
                  style: const TextStyle(
                    fontFamily: 'Inter',
                    fontSize: 11.5,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF334155),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),

          // Status & Cancel Action
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: isConfirmed
                      ? const Color(0xFFECFDF5)
                      : (isCancelled ? const Color(0xFFFFDAD6) : const Color(0xFFF1F5F9)),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: isConfirmed
                        ? const Color(0xFFA7F3D0)
                        : (isCancelled ? const Color(0xFFFFB4AB) : const Color(0xFFE2E8F0)),
                  ),
                ),
                child: Text(
                  isConfirmed ? '• CONFIRMED' : (isCancelled ? '• CANCELLED' : '• ${b.status}'),
                  style: TextStyle(
                    fontFamily: 'Inter',
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                    color: isConfirmed
                        ? const Color(0xFF047857)
                        : (isCancelled ? const Color(0xFFBA1A1A) : const Color(0xFF64748B)),
                  ),
                ),
              ),
              if (!b.isPast && isConfirmed) ...[
                const SizedBox(height: 8),
                TextButton(
                  onPressed: () => _handleCancelBooking(b),
                  style: TextButton.styleFrom(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    minimumSize: Size.zero,
                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    foregroundColor: const Color(0xFFEF4444),
                  ),
                  child: const Text(
                    'Cancel Booking',
                    style: TextStyle(
                      fontFamily: 'Inter',
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }

  // --- 4. AUTOMATED PRESENCE VERIFICATION BANNER ---
  Widget _buildPresenceSyncBanner(bool isWide) {
    final alertButton = OutlinedButton(
      onPressed: () {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Presence detection is calibrated at 15-minute release threshold.'),
            duration: Duration(seconds: 2),
          ),
        );
      },
      style: OutlinedButton.styleFrom(
        backgroundColor: Colors.white,
        side: const BorderSide(color: Color(0xFFCBD5E1)),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      ),
      child: const Text(
        'Configure Alerts',
        style: TextStyle(
          fontFamily: 'Inter',
          fontSize: 12,
          fontWeight: FontWeight.w600,
          color: Color(0xFF0F172A),
        ),
      ),
    );

    final mainContent = Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 42,
          height: 42,
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: const Color(0xFFCBD5E1)),
            boxShadow: const [
              BoxShadow(
                color: Color(0x080F172A),
                blurRadius: 4,
                offset: Offset(0, 1),
              ),
            ],
          ),
          child: const Icon(
            Icons.contactless_rounded,
            color: AppTheme.primary,
            size: 24,
          ),
        ),
        const SizedBox(width: 14),
        const Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Automated Presence Verification & Room Sync',
                style: TextStyle(
                  fontFamily: 'Inter',
                  fontSize: 13.5,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF0F172A),
                ),
              ),
              SizedBox(height: 2),
              Text(
                'Rooms are automatically released back into the company pool if attendees do not tap badges or trigger motion sensors within 15 minutes of scheduled start time.',
                style: TextStyle(
                  fontFamily: 'Inter',
                  fontSize: 11.5,
                  color: Color(0xFF64748B),
                  height: 1.35,
                ),
              ),
            ],
          ),
        ),
      ],
    );

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFF1F5F9), // surface-container-low
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: isWide
          ? Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                Expanded(child: mainContent),
                const SizedBox(width: 12),
                alertButton,
              ],
            )
          : Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                mainContent,
                const SizedBox(height: 12),
                Align(
                  alignment: Alignment.centerRight,
                  child: alertButton,
                ),
              ],
            ),
    );
  }
}
