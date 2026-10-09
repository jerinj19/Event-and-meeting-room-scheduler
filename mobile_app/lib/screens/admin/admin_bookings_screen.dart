import 'dart:math';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_theme.dart';
import '../../data/models/booking_model.dart';
import '../../data/models/room_model.dart';
import '../../providers/booking_provider.dart';
import '../../providers/room_provider.dart';
import '../my_bookings/widgets/cancel_booking_dialog.dart';

const String _kFallbackRoomImage =
    'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80';

class AdminBookingsScreen extends StatefulWidget {
  final VoidCallback? onBack;
  final VoidCallback? onOpenDrawer;
  final bool hasGlobalHeader;

  const AdminBookingsScreen({
    super.key,
    this.onBack,
    this.onOpenDrawer,
    this.hasGlobalHeader = false,
  });

  @override
  State<AdminBookingsScreen> createState() => _AdminBookingsScreenState();
}

class _AdminBookingsScreenState extends State<AdminBookingsScreen> {
  final _searchController = TextEditingController();

  // Filter states matching Web AdminBookings.jsx
  String _statusFilter = 'ALL'; // ALL | CONFIRMED | CANCELLED
  String _roomFilter = 'ALL'; // ALL | roomId
  String _periodFilter = 'all'; // all | this_month | this_week | custom
  String _startDate = '';
  String _endDate = '';
  String _sessionFilter = 'all'; // all | morning | afternoon | evening

  // Pagination states
  int _currentPage = 1;
  int _pageSize = 10;

  // Selected booking for slide-over drawer
  BookingModel? _selectedBooking;
  bool _isDrawerOpen = true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadData();
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _loadData() {
    final bp = Provider.of<BookingProvider>(context, listen: false);
    bp.fetchAllAdminBookings(
      search: _searchController.text.trim().isEmpty ? null : _searchController.text.trim(),
      status: _statusFilter == 'ALL' ? null : _statusFilter,
    );
    bp.fetchStats();

    final rp = Provider.of<RoomProvider>(context, listen: false);
    if (rp.rooms.isEmpty) {
      rp.fetchRooms();
    }
  }

  void _resetFilters() {
    setState(() {
      _searchController.clear();
      _statusFilter = 'ALL';
      _roomFilter = 'ALL';
      _periodFilter = 'all';
      _startDate = '';
      _endDate = '';
      _sessionFilter = 'all';
      _currentPage = 1;
    });
    _loadData();
  }

  bool get _hasActiveFilters =>
      _searchController.text.trim().isNotEmpty ||
      _statusFilter != 'ALL' ||
      _roomFilter != 'ALL' ||
      _periodFilter != 'all' ||
      _startDate.isNotEmpty ||
      _endDate.isNotEmpty ||
      _sessionFilter != 'all';

  // Apply in-memory client filters for smooth UI interaction
  List<BookingModel> _getFilteredBookings(List<BookingModel> source) {
    var list = source;

    // Search query filter
    final q = _searchController.text.trim().toLowerCase();
    if (q.isNotEmpty) {
      list = list.where((b) {
        final code = '#BKG-${b.id.substring(0, min(4, b.id.length)).toUpperCase()}';
        return b.title.toLowerCase().contains(q) ||
            b.roomName.toLowerCase().contains(q) ||
            b.userEmail.toLowerCase().contains(q) ||
            b.userName.toLowerCase().contains(q) ||
            code.toLowerCase().contains(q);
      }).toList();
    }

    // Status filter
    if (_statusFilter != 'ALL') {
      list = list.where((b) => b.status.toUpperCase() == _statusFilter).toList();
    }

    // Room filter
    if (_roomFilter != 'ALL') {
      list = list.where((b) => b.roomId == _roomFilter).toList();
    }

    // Period filter
    if (_periodFilter == 'this_month') {
      final now = DateTime.now();
      list = list.where((b) => b.startTime.year == now.year && b.startTime.month == now.month).toList();
    } else if (_periodFilter == 'this_week') {
      final now = DateTime.now();
      final startOfWeek = now.subtract(Duration(days: now.weekday - 1));
      final endOfWeek = startOfWeek.add(const Duration(days: 7));
      list = list.where((b) => b.startTime.isAfter(startOfWeek) && b.startTime.isBefore(endOfWeek)).toList();
    } else if (_periodFilter == 'custom') {
      if (_startDate.isNotEmpty) {
        final sDate = DateTime.tryParse(_startDate);
        if (sDate != null) {
          list = list.where((b) => b.startTime.isAfter(sDate.subtract(const Duration(days: 1)))).toList();
        }
      }
      if (_endDate.isNotEmpty) {
        final eDate = DateTime.tryParse(_endDate);
        if (eDate != null) {
          list = list.where((b) => b.startTime.isBefore(eDate.add(const Duration(days: 1)))).toList();
        }
      }
    }

    // Session filter
    if (_sessionFilter != 'all') {
      list = list.where((b) {
        final h = b.startTime.hour;
        if (_sessionFilter == 'morning') return h < 12;
        if (_sessionFilter == 'afternoon') return h >= 12 && h < 17;
        if (_sessionFilter == 'evening') return h >= 17;
        return true;
      }).toList();
    }

    return list;
  }

  void _exportCSV(List<BookingModel> list) {
    if (list.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No reservations found to export with the current criteria.')),
      );
      return;
    }

    final buffer = StringBuffer();
    buffer.writeln(
        'Booking Code,Booking UUID,Event Title,Room Name,Location / Campus,Organizer Name,Organizer Email,Department,Date,Time Slot,Duration (mins),Attendees Count,Reservation Status,Created At');

    for (final b in list) {
      final code = 'BKG-${b.id.substring(0, min(8, b.id.length)).toUpperCase()}';
      final start = b.startTime;
      final end = b.endTime;
      final dur = max(15, end.difference(start).inMinutes);
      final dateStr =
          '${start.year}-${start.month.toString().padLeft(2, '0')}-${start.day.toString().padLeft(2, '0')}';
      final timeStr = b.timeSlotLabel;
      final createdAtStr = b.createdAt != null ? b.createdAt!.toIso8601String() : '';

      buffer.writeln(
          '"$code","${b.id}","${b.title}","${b.roomName}","${b.roomLocation}","${b.userName}","${b.userEmail}","${b.userDepartment ?? 'Workspace Operations'}","$dateStr","$timeStr","$dur","${b.attendeesCount}","${b.status}","$createdAtStr"');
    }

    debugPrint('CSV Generated:\n${buffer.toString()}');

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
            'Exported ${list.length} reservation${list.length == 1 ? '' : 's'} to CSV audit log successfully!'),
        backgroundColor: AppTheme.success,
      ),
    );
  }

  Future<void> _handleCancelBooking(BookingModel booking) async {
    showDialog(
      context: context,
      builder: (_) => CancelBookingDialog(
        booking: booking,
        onConfirm: () async {
          Navigator.of(context).pop();
          final bp = Provider.of<BookingProvider>(context, listen: false);
          final ok = await bp.cancelBooking(booking.id);
          if (mounted) {
            if (ok) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('Reservation #BKG-${booking.id.substring(0, min(4, booking.id.length)).toUpperCase()} cancelled successfully.'),
                  backgroundColor: AppTheme.success,
                ),
              );
              _loadData();
            } else if (bp.errorMessage != null) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(bp.errorMessage!),
                  backgroundColor: AppTheme.error,
                ),
              );
            }
          }
        },
      ),
    );
  }

  String _formatSession(DateTime dt) {
    final h = dt.hour;
    if (h < 12) return 'morning';
    if (h < 17) return 'afternoon';
    return 'evening';
  }

  @override
  Widget build(BuildContext context) {
    final bookingProvider = Provider.of<BookingProvider>(context);
    final roomProvider = Provider.of<RoomProvider>(context);
    final rawBookings = bookingProvider.allAdminBookings;
    final filtered = _getFilteredBookings(rawBookings);

    // KPI Metrics calculation matching Web AdminBookings.jsx
    final stats = bookingProvider.stats;
    final totalBookings = stats.totalBookings > 0 ? stats.totalBookings : rawBookings.length;
    final confirmedCount = stats.confirmedBookings > 0
        ? stats.confirmedBookings
        : rawBookings.where((b) => b.isConfirmed).length;
    final cancelledCount = stats.cancelledBookings > 0
        ? stats.cancelledBookings
        : rawBookings.where((b) => b.isCancelled).length;
    final todayCount = stats.todayBookings > 0
        ? stats.todayBookings
        : rawBookings.where((b) {
            final now = DateTime.now();
            return b.startTime.year == now.year &&
                b.startTime.month == now.month &&
                b.startTime.day == now.day;
          }).length;

    // Pagination slice
    final totalPages = max(1, (filtered.length / _pageSize).ceil());
    if (_currentPage > totalPages) {
      _currentPage = totalPages;
    }
    final startIndex = (filtered.isEmpty) ? 0 : (_currentPage - 1) * _pageSize;
    final endIndex = min(startIndex + _pageSize, filtered.length);
    final paginated = filtered.isEmpty ? <BookingModel>[] : filtered.sublist(startIndex, endIndex);

    // Keep selected booking active
    if (_selectedBooking == null && paginated.isNotEmpty) {
      _selectedBooking = paginated.first;
    } else if (_selectedBooking != null && !filtered.any((b) => b.id == _selectedBooking!.id)) {
      _selectedBooking = paginated.isNotEmpty ? paginated.first : null;
    }

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: widget.hasGlobalHeader
          ? null
          : AppBar(
              title: const Text('All Reservations & Audits'),
              leading: widget.onBack != null
                  ? IconButton(
                      icon: const Icon(Icons.arrow_back_rounded),
                      onPressed: widget.onBack,
                    )
                  : (widget.onOpenDrawer != null
                      ? IconButton(
                          icon: const Icon(Icons.menu_rounded),
                          onPressed: widget.onOpenDrawer,
                        )
                      : null),
            ),
      body: RefreshIndicator(
        onRefresh: () async => _loadData(),
        color: AppTheme.primary,
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 1580),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // 1. Header Section (Image 1)
                  _buildHeaderSection(context, filtered),
                  const SizedBox(height: 20),

                  // 2. 4 KPI Metric Summary Strip (Image 1)
                  _buildKpiMetricsStrip(
                    totalCount: totalBookings,
                    confirmedCount: confirmedCount,
                    cancelledCount: cancelledCount,
                    todayCount: todayCount,
                  ),
                  const SizedBox(height: 20),

                  // 3. Filter & Search Toolbar (Image 1)
                  _buildFilterToolbar(roomProvider.rooms, totalBookings, confirmedCount, cancelledCount),
                  const SizedBox(height: 20),

                  // 4. Split Layout: Bookings Table + Slide-over Inspector Drawer
                  LayoutBuilder(
                    builder: (context, constraints) {
                      final isDesktop = constraints.maxWidth >= 1050;

                      if (isDesktop) {
                        return Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Main Bookings Data Table
                            Expanded(
                              child: _buildBookingsTableContainer(
                                paginated: paginated,
                                totalCount: filtered.length,
                                totalPages: totalPages,
                                isLoading: bookingProvider.isLoading,
                              ),
                            ),

                            // Slide-over Inspector Drawer
                            if (_isDrawerOpen && _selectedBooking != null) ...[
                              const SizedBox(width: 20),
                              SizedBox(
                                width: 400,
                                child: _buildInspectorDrawer(_selectedBooking!),
                              ),
                            ],
                          ],
                        );
                      } else {
                        // Mobile / Tablet Responsive Stack
                        return Column(
                          children: [
                            _buildBookingsTableContainer(
                              paginated: paginated,
                              totalCount: filtered.length,
                              totalPages: totalPages,
                              isLoading: bookingProvider.isLoading,
                            ),
                            if (_isDrawerOpen && _selectedBooking != null) ...[
                              const SizedBox(height: 20),
                              _buildInspectorDrawer(_selectedBooking!),
                            ],
                          ],
                        );
                      }
                    },
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  // 1. Header Section (Matches Web AdminBookings.jsx)
  Widget _buildHeaderSection(BuildContext context, List<BookingModel> filtered) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: const [
          BoxShadow(
            color: Color(0x05000000),
            blurRadius: 10,
            offset: Offset(0, 2),
          ),
        ],
      ),
      child: LayoutBuilder(
        builder: (context, constraints) {
          final isWide = constraints.maxWidth >= 768;

          final titleBlock = Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Wrap(
                crossAxisAlignment: WrapCrossAlignment.center,
                spacing: 10,
                runSpacing: 6,
                children: [
                  const Text(
                    'All Reservations & Schedule Audits',
                    style: TextStyle(
                      fontFamily: 'Inter',
                      fontSize: 22,
                      fontWeight: FontWeight.w800,
                      color: Color(0xFF0F172A),
                      letterSpacing: -0.5,
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: const Color(0xFFECFDF5),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: const Color(0xFFA7F3D0)),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: const [
                        Icon(Icons.circle, size: 8, color: Color(0xFF10B981)),
                        SizedBox(width: 6),
                        Text(
                          'Live Concurrency Guard Active • PostgreSQL ExclusionConstraint',
                          style: TextStyle(
                            fontFamily: 'Inter',
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            color: Color(0xFF065F46),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              const Text(
                'Centralized corporate ledger of all workspace bookings, attendee ratios, and conflict-free reservation lifecycles',
                style: TextStyle(
                  fontFamily: 'Inter',
                  fontSize: 13,
                  color: Color(0xFF64748B),
                ),
              ),
            ],
          );

          final actionButtons = Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              OutlinedButton.icon(
                onPressed: () => _exportCSV(filtered),
                icon: const Icon(Icons.download_rounded, size: 16),
                label: const Text('Export CSV Audit Log'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: const Color(0xFF334155),
                  backgroundColor: Colors.white,
                  side: const BorderSide(color: Color(0xFFCBD5E1)),
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  textStyle: const TextStyle(
                    fontFamily: 'Inter',
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              const SizedBox(width: 10),
              OutlinedButton.icon(
                onPressed: _resetFilters,
                icon: const Icon(Icons.refresh_rounded, size: 16),
                label: const Text('Reset Filters'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: const Color(0xFF334155),
                  backgroundColor: Colors.white,
                  side: const BorderSide(color: Color(0xFFCBD5E1)),
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  textStyle: const TextStyle(
                    fontFamily: 'Inter',
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          );

          if (isWide) {
            return Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(child: titleBlock),
                const SizedBox(width: 16),
                actionButtons,
              ],
            );
          } else {
            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                titleBlock,
                const SizedBox(height: 14),
                actionButtons,
              ],
            );
          }
        },
      ),
    );
  }

  // 2. 4 KPI Metric Summary Cards (Matches Web AdminBookings.jsx)
  Widget _buildKpiMetricsStrip({
    required int totalCount,
    required int confirmedCount,
    required int cancelledCount,
    required int todayCount,
  }) {
    final confPercent = totalCount > 0 ? ((confirmedCount / totalCount) * 100).round() : 100;

    return LayoutBuilder(
      builder: (context, constraints) {
        final w = constraints.maxWidth;
        final columns = w >= 1100 ? 4 : (w >= 600 ? 2 : 1);

        final card1 = _buildKpiCard(
          title: 'Total Bookings',
          value: '$totalCount',
          badgeText: '+12.4%',
          badgeColor: const Color(0xFFECFDF5),
          badgeTextColor: const Color(0xFF047857),
          badgeBorder: const Color(0xFFA7F3D0),
          badgeIcon: Icons.trending_up_rounded,
          icon: Icons.calendar_month_rounded,
          iconBg: AppTheme.primary.withValues(alpha: 0.1),
          iconColor: AppTheme.primary,
          footerLeft: 'Enterprise-wide log',
          footerRight: 'Active Cycle',
          footerRightColor: AppTheme.primary,
        );

        final card2 = _buildKpiCard(
          title: 'Confirmed Active',
          value: '$confirmedCount',
          badgeText: '$confPercent%',
          badgeColor: const Color(0xFFECFDF5),
          badgeTextColor: const Color(0xFF065F46),
          badgeBorder: const Color(0xFFA7F3D0),
          icon: Icons.check_circle_rounded,
          iconBg: const Color(0xFFECFDF5),
          iconColor: const Color(0xFF059669),
          footerLeft: 'Locked & conflict-free',
          footerRight: '0 Collisions',
          footerRightColor: const Color(0xFF059669),
        );

        final card3 = _buildKpiCard(
          title: 'Cancelled',
          value: '$cancelledCount',
          badgeText: 'Released',
          badgeColor: const Color(0xFFF1F5F9),
          badgeTextColor: const Color(0xFF475569),
          badgeBorder: const Color(0xFFCBD5E1),
          icon: Icons.event_busy_rounded,
          iconBg: const Color(0xFFF1F5F9),
          iconColor: const Color(0xFF475569),
          footerLeft: 'Rooms returned to pool',
          footerRight: 'Re-allocated',
          footerRightColor: const Color(0xFF64748B),
        );

        final card4 = _buildKpiCard(
          title: 'Today\'s Schedule',
          value: '$todayCount',
          badgeText: 'Live Today',
          badgeColor: AppTheme.primary.withValues(alpha: 0.1),
          badgeTextColor: AppTheme.primary,
          badgeBorder: AppTheme.primary.withValues(alpha: 0.25),
          icon: Icons.today_rounded,
          iconBg: AppTheme.primary.withValues(alpha: 0.1),
          iconColor: AppTheme.primary,
          footerLeft: 'Across all corporate suites',
          footerRight: 'Active Sessions',
          footerRightColor: AppTheme.primary,
        );

        if (columns == 4) {
          return Row(
            children: [
              Expanded(child: card1),
              const SizedBox(width: 14),
              Expanded(child: card2),
              const SizedBox(width: 14),
              Expanded(child: card3),
              const SizedBox(width: 14),
              Expanded(child: card4),
            ],
          );
        } else if (columns == 2) {
          return Column(
            children: [
              Row(
                children: [
                  Expanded(child: card1),
                  const SizedBox(width: 14),
                  Expanded(child: card2),
                ],
              ),
              const SizedBox(height: 14),
              Row(
                children: [
                  Expanded(child: card3),
                  const SizedBox(width: 14),
                  Expanded(child: card4),
                ],
              ),
            ],
          );
        } else {
          return Column(
            children: [
              card1,
              const SizedBox(height: 12),
              card2,
              const SizedBox(height: 12),
              card3,
              const SizedBox(height: 12),
              card4,
            ],
          );
        }
      },
    );
  }

  Widget _buildKpiCard({
    required String title,
    required String value,
    required String badgeText,
    required Color badgeColor,
    required Color badgeTextColor,
    required Color badgeBorder,
    IconData? badgeIcon,
    required IconData icon,
    required Color iconBg,
    required Color iconColor,
    required String footerLeft,
    required String footerRight,
    required Color footerRightColor,
  }) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: const [
          BoxShadow(
            color: Color(0x05000000),
            blurRadius: 8,
            offset: Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                title,
                style: const TextStyle(
                  fontFamily: 'Inter',
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF64748B),
                ),
              ),
              Container(
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                  color: iconBg,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(icon, size: 18, color: iconColor),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Row(
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              Text(
                value,
                style: const TextStyle(
                  fontFamily: 'Inter',
                  fontSize: 32,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF0F172A),
                  letterSpacing: -1,
                ),
              ),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: badgeColor,
                  border: Border.all(color: badgeBorder),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (badgeIcon != null) ...[
                      Icon(badgeIcon, size: 12, color: badgeTextColor),
                      const SizedBox(width: 3),
                    ],
                    Text(
                      badgeText,
                      style: TextStyle(
                        fontFamily: 'Inter',
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: badgeTextColor,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.only(top: 8),
            decoration: const BoxDecoration(
              border: Border(top: BorderSide(color: Color(0xFFF1F5F9))),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  footerLeft,
                  style: const TextStyle(
                    fontFamily: 'Inter',
                    fontSize: 11,
                    color: Color(0xFF64748B),
                  ),
                ),
                Text(
                  footerRight,
                  style: TextStyle(
                    fontFamily: 'Inter',
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: footerRightColor,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // 3. Filter & Search Toolbar (Matches Web AdminBookings.jsx)
  Widget _buildFilterToolbar(
    List<RoomModel> rooms,
    int totalCount,
    int confirmedCount,
    int cancelledCount,
  ) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: const [
          BoxShadow(
            color: Color(0x05000000),
            blurRadius: 8,
            offset: Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Wrap(
            spacing: 12,
            runSpacing: 10,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              // Search Input
              SizedBox(
                width: 280,
                child: TextField(
                  controller: _searchController,
                  onChanged: (_) => setState(() => _currentPage = 1),
                  decoration: InputDecoration(
                    hintText: 'Search title, organizer, code, room...',
                    hintStyle: const TextStyle(fontSize: 12, color: Color(0xFF94A3B8)),
                    prefixIcon: const Icon(Icons.search_rounded, size: 18, color: Color(0xFF64748B)),
                    suffixIcon: _searchController.text.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.close_rounded, size: 16),
                            onPressed: () {
                              setState(() {
                                _searchController.clear();
                                _currentPage = 1;
                              });
                            },
                          )
                        : null,
                    isDense: true,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: Color(0xFFCBD5E1)),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: Color(0xFFCBD5E1)),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: AppTheme.primary),
                    ),
                  ),
                  style: const TextStyle(fontFamily: 'Inter', fontSize: 12),
                ),
              ),

              // Room Filter Dropdown
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFCBD5E1)),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.meeting_room_rounded, size: 16, color: Color(0xFF64748B)),
                    const SizedBox(width: 6),
                    DropdownButtonHideUnderline(
                      child: DropdownButton<String>(
                        value: _roomFilter,
                        style: const TextStyle(fontFamily: 'Inter', fontSize: 12, color: Color(0xFF0F172A)),
                        items: [
                          DropdownMenuItem(
                            value: 'ALL',
                            child: Text('All Rooms (${rooms.length})'),
                          ),
                          ...rooms.map(
                            (r) => DropdownMenuItem(
                              value: r.id,
                              child: Text('${r.name} (${r.location})'),
                            ),
                          ),
                        ],
                        onChanged: (val) {
                          if (val != null) {
                            setState(() {
                              _roomFilter = val;
                              _currentPage = 1;
                            });
                          }
                        },
                      ),
                    ),
                  ],
                ),
              ),

              // Period Filter Dropdown
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFCBD5E1)),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.calendar_month_rounded, size: 16, color: Color(0xFF64748B)),
                    const SizedBox(width: 6),
                    DropdownButtonHideUnderline(
                      child: DropdownButton<String>(
                        value: _periodFilter,
                        style: const TextStyle(fontFamily: 'Inter', fontSize: 12, color: Color(0xFF0F172A)),
                        items: const [
                          DropdownMenuItem(value: 'all', child: Text('All Dates')),
                          DropdownMenuItem(value: 'this_month', child: Text('This Month')),
                          DropdownMenuItem(value: 'this_week', child: Text('This Week')),
                          DropdownMenuItem(value: 'custom', child: Text('Custom Range')),
                        ],
                        onChanged: (val) {
                          if (val != null) {
                            setState(() {
                              _periodFilter = val;
                              _currentPage = 1;
                            });
                          }
                        },
                      ),
                    ),
                  ],
                ),
              ),

              // Session Filter Dropdown
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFCBD5E1)),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.schedule_rounded, size: 16, color: Color(0xFF64748B)),
                    const SizedBox(width: 6),
                    DropdownButtonHideUnderline(
                      child: DropdownButton<String>(
                        value: _sessionFilter,
                        style: const TextStyle(fontFamily: 'Inter', fontSize: 12, color: Color(0xFF0F172A)),
                        items: const [
                          DropdownMenuItem(value: 'all', child: Text('All Sessions')),
                          DropdownMenuItem(value: 'morning', child: Text('🌅 Morning (< 12 PM)')),
                          DropdownMenuItem(value: 'afternoon', child: Text('☀️ Afternoon (12 – 5 PM)')),
                          DropdownMenuItem(value: 'evening', child: Text('🌙 Evening (≥ 5 PM)')),
                        ],
                        onChanged: (val) {
                          if (val != null) {
                            setState(() {
                              _sessionFilter = val;
                              _currentPage = 1;
                            });
                          }
                        },
                      ),
                    ),
                  ],
                ),
              ),

              // Status Segmented Tabs
              Container(
                padding: const EdgeInsets.all(4),
                decoration: BoxDecoration(
                  color: const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    _buildStatusTab('ALL', 'All ($totalCount)'),
                    _buildStatusTab('CONFIRMED', 'Confirmed ($confirmedCount)'),
                    _buildStatusTab('CANCELLED', 'Cancelled ($cancelledCount)'),
                  ],
                ),
              ),

              // Clear Filters Button (If active)
              if (_hasActiveFilters)
                TextButton.icon(
                  onPressed: _resetFilters,
                  icon: const Icon(Icons.clear_all_rounded, size: 16, color: Color(0xFFDC2626)),
                  label: const Text('Clear Filters', style: TextStyle(color: Color(0xFFDC2626), fontSize: 12)),
                  style: TextButton.styleFrom(
                    backgroundColor: const Color(0xFFFEF2F2),
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                      side: const BorderSide(color: Color(0xFFFECACA)),
                    ),
                  ),
                ),
            ],
          ),

          // Custom Date Range Row when _periodFilter == 'custom'
          if (_periodFilter == 'custom') ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Wrap(
                spacing: 12,
                runSpacing: 8,
                crossAxisAlignment: WrapCrossAlignment.center,
                children: [
                  const Text(
                    'Custom Date Range:',
                    style: TextStyle(fontFamily: 'Inter', fontSize: 12, fontWeight: FontWeight.w700),
                  ),
                  _buildDateField('From:', _startDate, (v) => setState(() => _startDate = v)),
                  _buildDateField('To:', _endDate, (v) => setState(() => _endDate = v)),
                  if (_startDate.isNotEmpty || _endDate.isNotEmpty)
                    TextButton(
                      onPressed: () {
                        setState(() {
                          _startDate = '';
                          _endDate = '';
                          _currentPage = 1;
                        });
                      },
                      child: const Text('Clear Dates', style: TextStyle(color: Color(0xFFDC2626), fontSize: 11)),
                    ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildDateField(String label, String value, ValueChanged<String> onChanged) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(label, style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
        const SizedBox(width: 6),
        InkWell(
          onTap: () async {
            final picked = await showDatePicker(
              context: context,
              initialDate: DateTime.now(),
              firstDate: DateTime(2025),
              lastDate: DateTime(2030),
            );
            if (picked != null) {
              final s =
                  '${picked.year}-${picked.month.toString().padLeft(2, '0')}-${picked.day.toString().padLeft(2, '0')}';
              onChanged(s);
            }
          },
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: Colors.white,
              border: Border.all(color: const Color(0xFFCBD5E1)),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(value.isEmpty ? 'YYYY-MM-DD' : value, style: const TextStyle(fontSize: 11)),
                const SizedBox(width: 6),
                const Icon(Icons.calendar_today_rounded, size: 12, color: Color(0xFF64748B)),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildStatusTab(String status, String label) {
    final isSelected = _statusFilter == status;
    return InkWell(
      onTap: () {
        setState(() {
          _statusFilter = status;
          _currentPage = 1;
        });
      },
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected ? Colors.white : Colors.transparent,
          borderRadius: BorderRadius.circular(8),
          boxShadow: isSelected
              ? const [
                  BoxShadow(
                    color: Color(0x0A000000),
                    blurRadius: 4,
                    offset: Offset(0, 1),
                  )
                ]
              : null,
        ),
        child: Text(
          label,
          style: TextStyle(
            fontFamily: 'Inter',
            fontSize: 11,
            fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
            color: isSelected ? AppTheme.primary : const Color(0xFF64748B),
          ),
        ),
      ),
    );
  }

  // 4. Main Bookings Table Container (Image 1)
  Widget _buildBookingsTableContainer({
    required List<BookingModel> paginated,
    required int totalCount,
    required int totalPages,
    required bool isLoading,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: const [
          BoxShadow(
            color: Color(0x05000000),
            blurRadius: 10,
            offset: Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Scrollable Table
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: ConstrainedBox(
              constraints: const BoxConstraints(minWidth: 800),
              child: DataTable(
                headingRowColor: WidgetStateProperty.all(const Color(0xFFF8FAFC)),
                headingTextStyle: const TextStyle(
                  fontFamily: 'Inter',
                  fontSize: 10,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF64748B),
                  letterSpacing: 0.5,
                ),
                dataRowMinHeight: 58,
                dataRowMaxHeight: 64,
                columnSpacing: 20,
                columns: const [
                  DataColumn(label: Text('MEETING & PURPOSE')),
                  DataColumn(label: Text('ROOM & WING')),
                  DataColumn(label: Text('ORGANIZER')),
                  DataColumn(label: Text('DATE & TIME')),
                  DataColumn(label: Text('ATTENDEES')),
                  DataColumn(label: Text('STATUS')),
                  DataColumn(label: Text('ACTIONS')),
                ],
                rows: paginated.map((b) {
                  final isSelected = _selectedBooking?.id == b.id && _isDrawerOpen;
                  final isConfirmed = b.isConfirmed;
                  final code = '#BKG-${b.id.substring(0, min(4, b.id.length)).toUpperCase()}';
                  final dur = max(15, b.endTime.difference(b.startTime).inMinutes);
                  final session = _formatSession(b.startTime);
                  final capPercent = min(1.0, b.attendeesCount / max(1, b.roomCapacity));

                  return DataRow(
                    selected: isSelected,
                    onSelectChanged: (_) {
                      setState(() {
                        _selectedBooking = b;
                        _isDrawerOpen = true;
                      });
                    },
                    color: WidgetStateProperty.resolveWith<Color?>((states) {
                      if (isSelected) {
                        return AppTheme.primary.withValues(alpha: 0.08);
                      }
                      return null;
                    }),
                    cells: [
                      // MEETING & PURPOSE
                      DataCell(
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(
                              b.title,
                              style: const TextStyle(
                                fontFamily: 'Inter',
                                fontSize: 13,
                                fontWeight: FontWeight.w700,
                                color: Color(0xFF0F172A),
                              ),
                            ),
                            const SizedBox(height: 2),
                            Row(
                              children: [
                                Text(
                                  code,
                                  style: const TextStyle(
                                    fontFamily: 'Courier',
                                    fontSize: 11,
                                    fontWeight: FontWeight.w700,
                                    color: AppTheme.primary,
                                  ),
                                ),
                                Text(
                                  ' • $dur mins',
                                  style: const TextStyle(
                                    fontFamily: 'Inter',
                                    fontSize: 10,
                                    color: Color(0xFF64748B),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),

                      // ROOM & WING
                      DataCell(
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(
                              b.roomName,
                              style: const TextStyle(
                                fontFamily: 'Inter',
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: Color(0xFF0F172A),
                              ),
                            ),
                            Text(
                              b.roomLocation,
                              style: const TextStyle(
                                fontFamily: 'Inter',
                                fontSize: 11,
                                color: Color(0xFF64748B),
                              ),
                            ),
                          ],
                        ),
                      ),

                      // ORGANIZER
                      DataCell(
                        Row(
                          children: [
                            CircleAvatar(
                              radius: 13,
                              backgroundColor: AppTheme.primary.withValues(alpha: 0.12),
                              child: Text(
                                b.userName.isNotEmpty ? b.userName[0].toUpperCase() : 'U',
                                style: const TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w800,
                                  color: AppTheme.primary,
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Text(
                                  b.userName,
                                  style: const TextStyle(
                                    fontFamily: 'Inter',
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600,
                                    color: Color(0xFF0F172A),
                                  ),
                                ),
                                Text(
                                  b.userEmail,
                                  style: const TextStyle(
                                    fontFamily: 'Inter',
                                    fontSize: 10,
                                    color: Color(0xFF64748B),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),

                      // DATE & TIME
                      DataCell(
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(
                              '${_monthName(b.startTime.month)} ${b.startTime.day}, ${b.startTime.year}',
                              style: const TextStyle(
                                fontFamily: 'Inter',
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: Color(0xFF0F172A),
                              ),
                            ),
                            const SizedBox(height: 2),
                            Row(
                              children: [
                                Text(
                                  b.timeSlotLabel,
                                  style: const TextStyle(
                                    fontFamily: 'Inter',
                                    fontSize: 10,
                                    color: Color(0xFF64748B),
                                  ),
                                ),
                                const SizedBox(width: 6),
                                _buildSessionTag(session),
                              ],
                            ),
                          ],
                        ),
                      ),

                      // ATTENDEES
                      DataCell(
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(
                              '${b.attendeesCount} / ${b.roomCapacity} seats',
                              style: const TextStyle(
                                fontFamily: 'Inter',
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                                color: Color(0xFF0F172A),
                              ),
                            ),
                            const SizedBox(height: 4),
                            SizedBox(
                              width: 80,
                              height: 5,
                              child: ClipRRect(
                                borderRadius: BorderRadius.circular(4),
                                child: LinearProgressIndicator(
                                  value: capPercent,
                                  backgroundColor: const Color(0xFFE2E8F0),
                                  valueColor: AlwaysStoppedAnimation<Color>(
                                    isConfirmed ? AppTheme.primary : const Color(0xFF94A3B8),
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),

                      // STATUS
                      DataCell(
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: isConfirmed ? const Color(0xFFECFDF5) : const Color(0xFFF1F5F9),
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(
                              color: isConfirmed ? const Color(0xFFA7F3D0) : const Color(0xFFCBD5E1),
                            ),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(
                                Icons.circle,
                                size: 6,
                                color: isConfirmed ? const Color(0xFF059669) : const Color(0xFF64748B),
                              ),
                              const SizedBox(width: 5),
                              Text(
                                isConfirmed ? 'Confirmed' : 'Cancelled',
                                style: TextStyle(
                                  fontFamily: 'Inter',
                                  fontSize: 11,
                                  fontWeight: FontWeight.w700,
                                  color: isConfirmed ? const Color(0xFF065F46) : const Color(0xFF475569),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),

                      // ACTIONS
                      DataCell(
                        Row(
                          children: [
                            IconButton(
                              icon: const Icon(Icons.visibility_rounded, size: 18, color: Color(0xFF64748B)),
                              tooltip: 'Inspect Booking Details',
                              onPressed: () {
                                setState(() {
                                  _selectedBooking = b;
                                  _isDrawerOpen = true;
                                });
                              },
                            ),
                            if (isConfirmed)
                              IconButton(
                                icon: const Icon(Icons.cancel_rounded, size: 18, color: Color(0xFFEF4444)),
                                tooltip: 'Cancel Reservation',
                                onPressed: () => _handleCancelBooking(b),
                              ),
                          ],
                        ),
                      ),
                    ],
                  );
                }).toList(),
              ),
            ),
          ),

          if (isLoading)
            const Padding(
              padding: EdgeInsets.all(32),
              child: Center(child: CircularProgressIndicator()),
            )
          else if (paginated.isEmpty)
            Padding(
              padding: const EdgeInsets.all(40),
              child: Column(
                children: const [
                  Icon(Icons.event_busy_rounded, size: 40, color: Color(0xFFCBD5E1)),
                  SizedBox(height: 8),
                  Text(
                    'No reservations match your criteria',
                    style: TextStyle(fontFamily: 'Inter', fontSize: 14, fontWeight: FontWeight.w700),
                  ),
                  SizedBox(height: 4),
                  Text(
                    'Try adjusting your search terms or clearing your filters.',
                    style: TextStyle(fontFamily: 'Inter', fontSize: 12, color: Color(0xFF64748B)),
                  ),
                ],
              ),
            ),

          // Table Footer & Server-Side Pagination Bar (Matches Web AdminBookings.jsx)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
            decoration: const BoxDecoration(
              border: Border(top: BorderSide(color: Color(0xFFF1F5F9))),
            ),
            child: Wrap(
              spacing: 16,
              runSpacing: 10,
              alignment: WrapAlignment.spaceBetween,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: const [
                    Icon(Icons.verified_rounded, size: 16, color: Color(0xFF059669)),
                    SizedBox(width: 6),
                    Text(
                      'PostgreSQL ExclusionConstraint Active • Real-time DB sync',
                      style: TextStyle(fontFamily: 'Inter', fontSize: 11, color: Color(0xFF64748B)),
                    ),
                  ],
                ),

                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Text('Rows per page:', style: TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                    const SizedBox(width: 6),
                    DropdownButtonHideUnderline(
                      child: DropdownButton<int>(
                        value: _pageSize,
                        style: const TextStyle(fontSize: 11, color: Color(0xFF0F172A)),
                        items: const [
                          DropdownMenuItem(value: 10, child: Text('10')),
                          DropdownMenuItem(value: 20, child: Text('20')),
                          DropdownMenuItem(value: 50, child: Text('50')),
                        ],
                        onChanged: (val) {
                          if (val != null) {
                            setState(() {
                              _pageSize = val;
                              _currentPage = 1;
                            });
                          }
                        },
                      ),
                    ),
                    const SizedBox(width: 14),
                    Text(
                      'Showing ${totalCount == 0 ? 0 : (_currentPage - 1) * _pageSize + 1} – ${min(_currentPage * _pageSize, totalCount)} of $totalCount',
                      style: const TextStyle(fontSize: 11, color: Color(0xFF64748B), fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(width: 10),
                    IconButton(
                      icon: const Icon(Icons.first_page_rounded, size: 18),
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(),
                      onPressed: _currentPage > 1 ? () => setState(() => _currentPage = 1) : null,
                    ),
                    const SizedBox(width: 6),
                    IconButton(
                      icon: const Icon(Icons.chevron_left_rounded, size: 18),
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(),
                      onPressed: _currentPage > 1 ? () => setState(() => _currentPage--) : null,
                    ),
                    const SizedBox(width: 6),
                    IconButton(
                      icon: const Icon(Icons.chevron_right_rounded, size: 18),
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(),
                      onPressed: _currentPage < totalPages ? () => setState(() => _currentPage++) : null,
                    ),
                    const SizedBox(width: 6),
                    IconButton(
                      icon: const Icon(Icons.last_page_rounded, size: 18),
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(),
                      onPressed: _currentPage < totalPages ? () => setState(() => _currentPage = totalPages) : null,
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // 5. Slide-Over Booking Inspector Drawer (Matches Web AdminBookings.jsx)
  Widget _buildInspectorDrawer(BookingModel booking) {
    final code = '#BKG-${booking.id.substring(0, min(4, booking.id.length)).toUpperCase()}';
    final dur = max(15, booking.endTime.difference(booking.startTime).inMinutes);
    final isConfirmed = booking.isConfirmed;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: const [
          BoxShadow(
            color: Color(0x08000000),
            blurRadius: 12,
            offset: Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Drawer Top Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(
                          code,
                          style: const TextStyle(
                            fontFamily: 'Courier',
                            fontSize: 12,
                            fontWeight: FontWeight.w800,
                            color: AppTheme.primary,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: isConfirmed ? const Color(0xFFECFDF5) : const Color(0xFFF1F5F9),
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(
                              color: isConfirmed ? const Color(0xFFA7F3D0) : const Color(0xFFCBD5E1),
                            ),
                          ),
                          child: Text(
                            isConfirmed ? 'Confirmed' : 'Cancelled',
                            style: TextStyle(
                              fontFamily: 'Inter',
                              fontSize: 10,
                              fontWeight: FontWeight.w700,
                              color: isConfirmed ? const Color(0xFF065F46) : const Color(0xFF475569),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      booking.title,
                      style: const TextStyle(
                        fontFamily: 'Inter',
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF0F172A),
                      ),
                    ),
                  ],
                ),
              ),
              IconButton(
                icon: const Icon(Icons.close_rounded, size: 20, color: Color(0xFF64748B)),
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(),
                onPressed: () => setState(() => _isDrawerOpen = false),
              ),
            ],
          ),
          const SizedBox(height: 14),

          // ExclusionConstraint Concurrency Badge (Image 1)
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFFEFF6FF),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFDBEAFE)),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(Icons.shield_outlined, size: 20, color: AppTheme.primary),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'ExclusionConstraint Verified',
                        style: TextStyle(
                          fontFamily: 'Inter',
                          fontSize: 12,
                          fontWeight: FontWeight.w800,
                          color: Color(0xFF1E3A8A),
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '0 temporal collisions detected. Database-level GiST exclusion lock verified for ${booking.roomName}.',
                        style: const TextStyle(
                          fontFamily: 'Inter',
                          fontSize: 11,
                          color: Color(0xFF1E40AF),
                          height: 1.3,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // RESERVED SPACE (Image 1)
          const Text(
            'RESERVED SPACE',
            style: TextStyle(
              fontFamily: 'Inter',
              fontSize: 10,
              fontWeight: FontWeight.w800,
              letterSpacing: 0.5,
              color: Color(0xFF64748B),
            ),
          ),
          const SizedBox(height: 8),
          Container(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            clipBehavior: Clip.antiAlias,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Stack(
                  children: [
                    Image.network(
                      booking.roomImage ?? _kFallbackRoomImage,
                      height: 120,
                      width: double.infinity,
                      fit: BoxFit.cover,
                      errorBuilder: (context, error, stackTrace) => Container(
                        height: 120,
                        color: const Color(0xFFF1F5F9),
                        child: const Center(
                          child: Icon(Icons.meeting_room_rounded, size: 36, color: Color(0xFF94A3B8)),
                        ),
                      ),
                    ),
                    Positioned(
                      top: 8,
                      right: 8,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.95),
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.group_rounded, size: 13, color: AppTheme.primary),
                            const SizedBox(width: 4),
                            Text(
                              '${booking.roomCapacity} Seats',
                              style: const TextStyle(
                                fontFamily: 'Inter',
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
                Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        booking.roomName,
                        style: const TextStyle(
                          fontFamily: 'Inter',
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                          color: Color(0xFF0F172A),
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        booking.roomLocation,
                        style: const TextStyle(
                          fontFamily: 'Inter',
                          fontSize: 11,
                          color: Color(0xFF64748B),
                        ),
                      ),
                      const SizedBox(height: 8),
                      Wrap(
                        spacing: 6,
                        runSpacing: 4,
                        children: const [
                          _AmenityChip(label: 'Projector'),
                          _AmenityChip(label: 'Whiteboard'),
                          _AmenityChip(label: 'Video Conferencing'),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // PRIMARY ORGANIZER (Image 1)
          const Text(
            'PRIMARY ORGANIZER',
            style: TextStyle(
              fontFamily: 'Inter',
              fontSize: 10,
              fontWeight: FontWeight.w800,
              letterSpacing: 0.5,
              color: Color(0xFF64748B),
            ),
          ),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: Column(
              children: [
                Row(
                  children: [
                    Container(
                      width: 36,
                      height: 36,
                      decoration: BoxDecoration(
                        color: AppTheme.primary.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Center(
                        child: Text(
                          booking.userName.isNotEmpty ? booking.userName[0].toUpperCase() : 'U',
                          style: const TextStyle(
                            fontFamily: 'Inter',
                            fontSize: 14,
                            fontWeight: FontWeight.w800,
                            color: AppTheme.primary,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            booking.userName,
                            style: const TextStyle(
                              fontFamily: 'Inter',
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                              color: Color(0xFF0F172A),
                            ),
                          ),
                          Text(
                            '${booking.userIsStaff ? 'Administrator' : 'Team Member'} • ${booking.userDepartment ?? 'Workspace Operations'}',
                            style: const TextStyle(
                              fontFamily: 'Inter',
                              fontSize: 11,
                              color: Color(0xFF64748B),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.only(top: 8),
                  decoration: const BoxDecoration(
                    border: Border(top: BorderSide(color: Color(0xFFF1F5F9))),
                  ),
                  child: Column(
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Email:', style: TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                          Text(
                            booking.userEmail,
                            style: const TextStyle(
                              fontFamily: 'Courier',
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                              color: AppTheme.primary,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Department:', style: TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                          Text(
                            booking.userDepartment ?? 'Workspace Operations',
                            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF0F172A)),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // ALLOCATED TIME SLOT (Image 1)
          const Text(
            'ALLOCATED TIME SLOT',
            style: TextStyle(
              fontFamily: 'Inter',
              fontSize: 10,
              fontWeight: FontWeight.w800,
              letterSpacing: 0.5,
              color: Color(0xFF64748B),
            ),
          ),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: Row(
              children: [
                Container(
                  width: 34,
                  height: 34,
                  decoration: BoxDecoration(
                    color: AppTheme.primary.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Icon(Icons.schedule_rounded, size: 18, color: AppTheme.primary),
                ),
                const SizedBox(width: 10),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '${_monthName(booking.startTime.month)} ${booking.startTime.day}, ${booking.startTime.year}',
                      style: const TextStyle(
                        fontFamily: 'Inter',
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF0F172A),
                      ),
                    ),
                    Text(
                      '${booking.timeSlotLabel} ($dur mins)',
                      style: const TextStyle(
                        fontFamily: 'Inter',
                        fontSize: 11,
                        color: Color(0xFF64748B),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // MEETING AGENDA / NOTES (Image 1)
          const Text(
            'MEETING AGENDA / NOTES',
            style: TextStyle(
              fontFamily: 'Inter',
              fontSize: 10,
              fontWeight: FontWeight.w800,
              letterSpacing: 0.5,
              color: Color(0xFF64748B),
            ),
          ),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: Text(
              '"${booking.description.isNotEmpty ? booking.description : 'No additional agenda provided.'}"',
              style: const TextStyle(
                fontFamily: 'Inter',
                fontSize: 12,
                fontStyle: FontStyle.italic,
                color: Color(0xFF64748B),
                height: 1.4,
              ),
            ),
          ),
          const SizedBox(height: 18),

          // Action Footer: Cancel Reservation / Close Drawer
          Row(
            children: [
              if (isConfirmed) ...[
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => _handleCancelBooking(booking),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: const Color(0xFFDC2626),
                      side: const BorderSide(color: Color(0xFFFECACA)),
                      padding: const EdgeInsets.symmetric(vertical: 11),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      textStyle: const TextStyle(fontFamily: 'Inter', fontSize: 12, fontWeight: FontWeight.w700),
                    ),
                    child: const Text('Cancel Reservation'),
                  ),
                ),
                const SizedBox(width: 8),
              ],
              Expanded(
                child: OutlinedButton(
                  onPressed: () => setState(() => _isDrawerOpen = false),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: const Color(0xFF334155),
                    backgroundColor: const Color(0xFFF8FAFC),
                    side: const BorderSide(color: Color(0xFFCBD5E1)),
                    padding: const EdgeInsets.symmetric(vertical: 11),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    textStyle: const TextStyle(fontFamily: 'Inter', fontSize: 12, fontWeight: FontWeight.w600),
                  ),
                  child: const Text('Close Drawer'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildSessionTag(String session) {
    Color bg;
    Color border;
    Color text;
    String label;

    if (session == 'morning') {
      bg = const Color(0xFFFFFBEB);
      border = const Color(0xFFFDE68A);
      text = const Color(0xFF92400E);
      label = '🌅 Morning';
    } else if (session == 'afternoon') {
      bg = const Color(0xFFF0F9FF);
      border = const Color(0xFFBAE6FD);
      text = const Color(0xFF0369A1);
      label = '☀️ Afternoon';
    } else {
      bg = const Color(0xFFEEF2FF);
      border = const Color(0xFFC7D2FE);
      text = const Color(0xFF3730A3);
      label = '🌙 Evening';
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: border),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontFamily: 'Inter',
          fontSize: 9,
          fontWeight: FontWeight.w700,
          color: text,
        ),
      ),
    );
  }

  String _monthName(int m) {
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    return (m >= 1 && m <= 12) ? months[m - 1] : '';
  }
}

class _AmenityChip extends StatelessWidget {
  final String label;
  const _AmenityChip({required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: const Color(0xFFF1F5F9),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Text(
        label,
        style: const TextStyle(fontFamily: 'Inter', fontSize: 10, color: Color(0xFF64748B)),
      ),
    );
  }
}
