import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_theme.dart';
import '../../data/models/room_model.dart';
import '../../providers/room_provider.dart';
import 'widgets/admin_room_modal.dart';

class AdminRoomListScreen extends StatefulWidget {
  final VoidCallback? onBack;
  final VoidCallback? onOpenDrawer;
  final bool hasGlobalHeader;

  const AdminRoomListScreen({
    super.key,
    this.onBack,
    this.onOpenDrawer,
    this.hasGlobalHeader = false,
  });

  @override
  State<AdminRoomListScreen> createState() => _AdminRoomListScreenState();
}

class _AdminRoomListScreenState extends State<AdminRoomListScreen> {
  final TextEditingController _searchController = TextEditingController();

  String _selectedCapacity = 'all';
  String _selectedStatus = 'all';
  String _viewMode = 'table'; // 'table' | 'grid'
  final Set<String> _selectedIds = {};
  String? _actionLoadingId;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<RoomProvider>(context, listen: false).fetchRooms();
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  // ==========================================
  // Filtering Logic (matching web frontend)
  // ==========================================
  List<RoomModel> _getFilteredRooms(List<RoomModel> allRooms) {
    return allRooms.where((room) {
      // 1. Search Query
      if (_searchController.text.trim().isNotEmpty) {
        final q = _searchController.text.toLowerCase().trim();
        final matchesName = room.name.toLowerCase().contains(q);
        final matchesLoc = room.location.toLowerCase().contains(q);
        final matchesCode = room.roomCode.toLowerCase().contains(q);
        final matchesAmenities = room.amenities.any((a) => a.toLowerCase().contains(q));
        if (!matchesName && !matchesLoc && !matchesCode && !matchesAmenities) {
          return false;
        }
      }

      // 2. Capacity Filter
      if (_selectedCapacity != 'all') {
        final cap = room.capacity;
        if (_selectedCapacity == 'small' && (cap < 1 || cap > 4)) return false;
        if (_selectedCapacity == 'medium' && (cap < 5 || cap > 10)) return false;
        if (_selectedCapacity == 'large' && (cap < 11 || cap > 20)) return false;
        if (_selectedCapacity == 'executive' && cap <= 20) return false;
      }

      // 3. Status Filter
      if (_selectedStatus == 'active' && !room.isActive) return false;
      if (_selectedStatus == 'inactive' && room.isActive) return false;

      return true;
    }).toList();
  }

  // ==========================================
  // Modals & Actions
  // ==========================================
  void _openCreateModal(BuildContext context) {
    final messenger = ScaffoldMessenger.of(context);
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (_) => AdminRoomModal(
        room: null,
        onSave: (payload) async {
          final provider = Provider.of<RoomProvider>(context, listen: false);
          final ok = await provider.createRoomFromPayload(payload);
          messenger.showSnackBar(
            SnackBar(
              content: Text(ok
                  ? 'Room "${payload['name']}" created and published!'
                  : 'Failed to create room.'),
              backgroundColor: ok ? AppTheme.success : AppTheme.error,
            ),
          );
        },
      ),
    );
  }

  void _openEditModal(BuildContext context, RoomModel room) {
    final messenger = ScaffoldMessenger.of(context);
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (_) => AdminRoomModal(
        room: room,
        onSave: (payload) async {
          final provider = Provider.of<RoomProvider>(context, listen: false);
          final ok = await provider.updateRoom(room.id, payload);
          messenger.showSnackBar(
            SnackBar(
              content: Text(ok
                  ? 'Room "${payload['name']}" updated successfully!'
                  : 'Failed to update room.'),
              backgroundColor: ok ? AppTheme.success : AppTheme.error,
            ),
          );
        },
        onDeleteRequest: () {
          Navigator.of(context).pop();
          _confirmDelete(room);
        },
      ),
    );
  }

  Future<void> _handleToggleStatus(RoomModel room) async {
    setState(() => _actionLoadingId = room.id);
    final provider = Provider.of<RoomProvider>(context, listen: false);
    final nextStatus = !room.isActive;

    final ok = await provider.toggleRoomStatus(room.id, room.isActive);
    if (mounted) {
      setState(() => _actionLoadingId = null);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            ok
                ? 'Room "${room.name}" marked as ${nextStatus ? "Active" : "Under Maintenance"}.'
                : 'Failed to toggle room status.',
          ),
          backgroundColor: ok ? const Color(0xFF0284C7) : AppTheme.error,
        ),
      );
    }
  }

  void _confirmDelete(RoomModel room) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Row(
          children: [
            Icon(Icons.delete_outline_rounded, color: AppTheme.error, size: 26),
            SizedBox(width: 10),
            Text('Delete Room', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
          ],
        ),
        content: Text(
          'Are you sure you want to permanently delete "${room.name}" (${room.roomCode})? This action cannot be undone.',
          style: const TextStyle(fontFamily: 'Inter', fontSize: 13, color: Color(0xFF475569)),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.of(ctx).pop();
              final provider = Provider.of<RoomProvider>(context, listen: false);
              final ok = await provider.deleteRoom(room.id);
              if (mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(ok
                        ? 'Room "${room.name}" deleted successfully.'
                        : 'Failed to delete room.'),
                    backgroundColor: ok ? AppTheme.success : AppTheme.error,
                  ),
                );
              }
            },
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.error),
            child: const Text('Confirm Delete'),
          ),
        ],
      ),
    );
  }

  void _exportCsv(List<RoomModel> filteredRooms) {
    if (filteredRooms.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No rooms to export.'), backgroundColor: AppTheme.warning),
      );
      return;
    }

    final headers = ['ID', 'Name', 'Code', 'Location', 'Capacity', 'Status', 'Amenities', 'Hourly Rate'];
    final rows = filteredRooms.map((r) => [
      '"${r.id}"',
      '"${r.name}"',
      '"${r.roomCode}"',
      '"${r.location}"',
      r.capacity,
      r.isActive ? 'Active' : 'Maintenance',
      '"${r.amenities.join(', ')}"',
      r.hourlyRate,
    ]);

    debugPrint('CSV Export: ${headers.length} headers, ${rows.length} rows.');

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('CSV Export ready: ${filteredRooms.length} room rows formatted.'),
        backgroundColor: AppTheme.success,
        action: SnackBarAction(
          label: 'OK',
          textColor: Colors.white,
          onPressed: () {},
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final roomProvider = Provider.of<RoomProvider>(context);
    final allRooms = roomProvider.rooms;
    final filteredRooms = _getFilteredRooms(allRooms);

    // KPI Metrics calculation
    final totalCount = allRooms.length;
    final activeCount = allRooms.where((r) => r.isActive).length;
    final inactiveCount = totalCount - activeCount;
    final activePercent = totalCount > 0 ? ((activeCount / totalCount) * 100).toStringAsFixed(1) : '0';

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: RefreshIndicator(
        onRefresh: () => roomProvider.fetchRooms(),
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          physics: const AlwaysScrollableScrollPhysics(),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 1. Breadcrumbs & Executive Page Header
              _buildPageHeader(context, filteredRooms),
              const SizedBox(height: 20),

              // 2. 3 KPI Metric Summary Cards
              _buildKpiMetrics(totalCount, activeCount, inactiveCount, activePercent),
              const SizedBox(height: 18),

              // 3. Action Toolbar (Search, Filter, View Switcher, Refresh)
              _buildToolbar(roomProvider),
              const SizedBox(height: 18),

              // 4. Main Content: Table View or Card Grid View
              if (roomProvider.isLoading && allRooms.isEmpty)
                _buildLoadingState()
              else if (filteredRooms.isEmpty)
                _buildEmptyState()
              else if (_viewMode == 'table')
                _buildTableView(filteredRooms)
              else
                _buildGridView(filteredRooms),

              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }

  // ==========================================
  // 1. Breadcrumbs & Header
  // ==========================================
  Widget _buildPageHeader(BuildContext context, List<RoomModel> filteredRooms) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final isWide = constraints.maxWidth >= 720;

        final titleBlock = Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Breadcrumbs
            Row(
              children: [
                const Text('Admin', style: TextStyle(fontFamily: 'Inter', fontSize: 12, fontWeight: FontWeight.w500, color: Color(0xFF64748B))),
                const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 5),
                  child: Text('›', style: TextStyle(color: Color(0xFF94A3B8))),
                ),
                const Text('Spaces', style: TextStyle(fontFamily: 'Inter', fontSize: 12, fontWeight: FontWeight.w500, color: Color(0xFF64748B))),
                const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 5),
                  child: Text('›', style: TextStyle(color: Color(0xFF94A3B8))),
                ),
                Text(
                  'Room Management',
                  style: TextStyle(fontFamily: 'Inter', fontSize: 12, fontWeight: FontWeight.w700, color: AppTheme.primary),
                ),
              ],
            ),
            const SizedBox(height: 6),
            // Title + Enterprise Grid badge
            Row(
              children: [
                const Text(
                  'Room Management (Admin)',
                  style: TextStyle(
                    fontFamily: 'Inter',
                    fontSize: 22,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF0F172A),
                    letterSpacing: -0.5,
                  ),
                ),
                const SizedBox(width: 10),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: AppTheme.primary.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppTheme.primary.withValues(alpha: 0.25)),
                  ),
                  child: const Text(
                    'Enterprise Grid',
                    style: TextStyle(
                      fontFamily: 'Inter',
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: AppTheme.primary,
                    ),
                  ),
                ),
              ],
            ),
          ],
        );

        final actionButtons = Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Export CSV button
            OutlinedButton.icon(
              onPressed: () => _exportCsv(filteredRooms),
              icon: const Icon(Icons.ios_share_rounded, size: 16),
              label: const Text('Export CSV'),
              style: OutlinedButton.styleFrom(
                foregroundColor: const Color(0xFF475569),
                backgroundColor: Colors.white,
                side: const BorderSide(color: Color(0xFFCBD5E1)),
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                textStyle: const TextStyle(fontFamily: 'Inter', fontSize: 12, fontWeight: FontWeight.w600),
              ),
            ),
            const SizedBox(width: 10),

            // + Create New Room button
            ElevatedButton.icon(
              onPressed: () => _openCreateModal(context),
              icon: const Icon(Icons.add_rounded, size: 18),
              label: const Text('Create New Room'),
              style: ElevatedButton.styleFrom(
                foregroundColor: Colors.white,
                backgroundColor: AppTheme.primary,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 11),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                elevation: 1,
                textStyle: const TextStyle(fontFamily: 'Inter', fontSize: 12, fontWeight: FontWeight.w700),
              ),
            ),
          ],
        );

        if (isWide) {
          return Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [titleBlock, actionButtons],
          );
        } else {
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              titleBlock,
              const SizedBox(height: 12),
              actionButtons,
            ],
          );
        }
      },
    );
  }

  // ==========================================
  // 2. 3 KPI Metric Summary Cards
  // ==========================================
  Widget _buildKpiMetrics(int total, int active, int inactive, String activePercent) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final isWide = constraints.maxWidth >= 760;

        final cardTotal = _buildMetricCard(
          label: 'TOTAL ROOMS',
          value: total.toString(),
          badge: '$total Registered',
          badgeColor: AppTheme.primary,
          badgeBg: AppTheme.primary.withValues(alpha: 0.1),
          subtext: 'Registered workspace units',
          icon: Icons.meeting_room_rounded,
          iconColor: AppTheme.primary,
          iconBg: AppTheme.primary.withValues(alpha: 0.1),
        );

        final cardActive = _buildMetricCard(
          label: 'ACTIVE ROOMS',
          value: active.toString(),
          badge: '$activePercent% Live',
          badgeColor: const Color(0xFF15803D),
          badgeBg: const Color(0xFFDCFCE7),
          subtext: 'Ready for instant reservation',
          icon: Icons.check_circle_rounded,
          iconColor: const Color(0xFF16A34A),
          iconBg: const Color(0xFFDCFCE7),
        );

        final cardMaintenance = _buildMetricCard(
          label: 'IN MAINTENANCE',
          value: inactive.toString(),
          badge: inactive > 0 ? '$inactive Offline' : 'All Operational',
          badgeColor: inactive > 0 ? const Color(0xFFB45309) : const Color(0xFF15803D),
          badgeBg: inactive > 0 ? const Color(0xFFFEF3C7) : const Color(0xFFDCFCE7),
          subtext: 'Unavailable for public slotting',
          icon: Icons.engineering_rounded,
          iconColor: const Color(0xFFD97706),
          iconBg: const Color(0xFFFEF3C7),
          borderColor: inactive > 0 ? const Color(0xFFFDE68A) : null,
        );

        if (isWide) {
          return Row(
            children: [
              Expanded(child: cardTotal),
              const SizedBox(width: 14),
              Expanded(child: cardActive),
              const SizedBox(width: 14),
              Expanded(child: cardMaintenance),
            ],
          );
        } else {
          return Column(
            children: [
              cardTotal,
              const SizedBox(height: 10),
              cardActive,
              const SizedBox(height: 10),
              cardMaintenance,
            ],
          );
        }
      },
    );
  }

  Widget _buildMetricCard({
    required String label,
    required String value,
    required String badge,
    required Color badgeColor,
    required Color badgeBg,
    required String subtext,
    required IconData icon,
    required Color iconColor,
    required Color iconBg,
    Color? borderColor,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: borderColor ?? const Color(0xFFE2E8F0)),
        boxShadow: const [
          BoxShadow(color: Color(0x05000000), blurRadius: 4, offset: Offset(0, 1)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                label,
                style: const TextStyle(
                  fontFamily: 'Inter',
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF64748B),
                  letterSpacing: 0.5,
                ),
              ),
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(color: iconBg, borderRadius: BorderRadius.circular(8)),
                child: Icon(icon, color: iconColor, size: 18),
              ),
            ],
          ),
          const SizedBox(height: 10),
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
                ),
              ),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(color: badgeBg, borderRadius: BorderRadius.circular(6)),
                child: Text(
                  badge,
                  style: TextStyle(
                    fontFamily: 'Inter',
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: badgeColor,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          const Divider(height: 1, color: Color(0xFFF1F5F9)),
          const SizedBox(height: 8),
          Text(
            subtext,
            style: const TextStyle(fontFamily: 'Inter', fontSize: 11, color: Color(0xFF94A3B8)),
          ),
        ],
      ),
    );
  }

  // ==========================================
  // 3. Action Toolbar (Search, Filter, View Switcher)
  // ==========================================
  Widget _buildToolbar(RoomProvider provider) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: const [
          BoxShadow(color: Color(0x04000000), blurRadius: 4, offset: Offset(0, 1)),
        ],
      ),
      child: LayoutBuilder(
        builder: (context, constraints) {
          final isWide = constraints.maxWidth >= 820;

          final searchBox = Container(
            height: 38,
            decoration: BoxDecoration(
              color: const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: const Color(0xFFCBD5E1)),
            ),
            padding: const EdgeInsets.symmetric(horizontal: 10),
            child: Row(
              children: [
                const Icon(Icons.search_rounded, size: 18, color: Color(0xFF94A3B8)),
                const SizedBox(width: 8),
                Expanded(
                  child: TextField(
                    controller: _searchController,
                    style: const TextStyle(fontFamily: 'Inter', fontSize: 12),
                    decoration: const InputDecoration(
                      hintText: 'Search by room name, location, code, or amenities...',
                      hintStyle: TextStyle(fontFamily: 'Inter', fontSize: 12, color: Color(0xFF94A3B8)),
                      border: InputBorder.none,
                      isDense: true,
                      contentPadding: EdgeInsets.zero,
                    ),
                    onChanged: (_) => setState(() {}),
                  ),
                ),
                if (_searchController.text.isNotEmpty)
                  InkWell(
                    onTap: () {
                      _searchController.clear();
                      setState(() {});
                    },
                    child: const Icon(Icons.close_rounded, size: 16, color: Color(0xFF94A3B8)),
                  ),
              ],
            ),
          );

          final filterControls = Wrap(
            spacing: 8,
            runSpacing: 8,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              // Capacity Dropdown
              Container(
                height: 38,
                padding: const EdgeInsets.symmetric(horizontal: 10),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: const Color(0xFFCBD5E1)),
                ),
                child: DropdownButtonHideUnderline(
                  child: DropdownButton<String>(
                    value: _selectedCapacity,
                    items: const [
                      DropdownMenuItem(value: 'all', child: Text('All Capacities')),
                      DropdownMenuItem(value: 'small', child: Text('Small (1–4 Seats)')),
                      DropdownMenuItem(value: 'medium', child: Text('Medium (5–10 Seats)')),
                      DropdownMenuItem(value: 'large', child: Text('Large (11–20 Seats)')),
                      DropdownMenuItem(value: 'executive', child: Text('Boardroom (20+ Seats)')),
                    ],
                    onChanged: (val) {
                      if (val != null) setState(() => _selectedCapacity = val);
                    },
                    style: const TextStyle(fontFamily: 'Inter', fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF0F172A)),
                    isDense: true,
                  ),
                ),
              ),

              // Status Dropdown
              Container(
                height: 38,
                padding: const EdgeInsets.symmetric(horizontal: 10),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: const Color(0xFFCBD5E1)),
                ),
                child: DropdownButtonHideUnderline(
                  child: DropdownButton<String>(
                    value: _selectedStatus,
                    items: const [
                      DropdownMenuItem(value: 'all', child: Text('All Statuses')),
                      DropdownMenuItem(value: 'active', child: Text('Active Only')),
                      DropdownMenuItem(value: 'inactive', child: Text('Maintenance / Inactive')),
                    ],
                    onChanged: (val) {
                      if (val != null) setState(() => _selectedStatus = val);
                    },
                    style: const TextStyle(fontFamily: 'Inter', fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF0F172A)),
                    isDense: true,
                  ),
                ),
              ),

              // View Switcher (Table vs Grid)
              Container(
                height: 38,
                padding: const EdgeInsets.all(3),
                decoration: BoxDecoration(
                  color: const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    InkWell(
                      onTap: () => setState(() => _viewMode = 'table'),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
                        decoration: BoxDecoration(
                          color: _viewMode == 'table' ? Colors.white : Colors.transparent,
                          borderRadius: BorderRadius.circular(6),
                          boxShadow: _viewMode == 'table' ? const [BoxShadow(color: Color(0x0A000000), blurRadius: 2)] : null,
                        ),
                        child: Icon(
                          Icons.table_rows_rounded,
                          size: 16,
                          color: _viewMode == 'table' ? AppTheme.primary : const Color(0xFF64748B),
                        ),
                      ),
                    ),
                    InkWell(
                      onTap: () => setState(() => _viewMode = 'grid'),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
                        decoration: BoxDecoration(
                          color: _viewMode == 'grid' ? Colors.white : Colors.transparent,
                          borderRadius: BorderRadius.circular(6),
                          boxShadow: _viewMode == 'grid' ? const [BoxShadow(color: Color(0x0A000000), blurRadius: 2)] : null,
                        ),
                        child: Icon(
                          Icons.grid_view_rounded,
                          size: 16,
                          color: _viewMode == 'grid' ? AppTheme.primary : const Color(0xFF64748B),
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              // Refresh Button
              IconButton(
                icon: const Icon(Icons.refresh_rounded, size: 20, color: Color(0xFF64748B)),
                onPressed: () => provider.fetchRooms(),
                tooltip: 'Refresh Room List',
              ),
            ],
          );

          if (isWide) {
            return Row(
              children: [
                Expanded(child: searchBox),
                const SizedBox(width: 14),
                filterControls,
              ],
            );
          } else {
            return Column(
              children: [
                searchBox,
                const SizedBox(height: 10),
                Align(alignment: Alignment.centerLeft, child: filterControls),
              ],
            );
          }
        },
      ),
    );
  }

  // ==========================================
  // 4. Table View (Matching Image 2 Background)
  // ==========================================
  Widget _buildTableView(List<RoomModel> rooms) {
    final allSelected = rooms.isNotEmpty && _selectedIds.length == rooms.length;

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: const [
          BoxShadow(color: Color(0x04000000), blurRadius: 6, offset: Offset(0, 2)),
        ],
      ),
      child: Column(
        children: [
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: DataTable(
              headingRowColor: WidgetStateProperty.all(const Color(0xFFF8FAFC)),
              headingTextStyle: const TextStyle(
                fontFamily: 'Inter',
                fontSize: 11,
                fontWeight: FontWeight.w700,
                color: Color(0xFF64748B),
                letterSpacing: 0.3,
              ),
              dataRowMinHeight: 65,
              dataRowMaxHeight: 65,
              dividerThickness: 1,
              columns: [
                DataColumn(
                  label: Checkbox(
                    value: allSelected,
                    onChanged: (val) {
                      setState(() {
                        if (val == true) {
                          _selectedIds.addAll(rooms.map((r) => r.id));
                        } else {
                          _selectedIds.clear();
                        }
                      });
                    },
                  ),
                ),
                const DataColumn(label: Text('Room Name & ID')),
                const DataColumn(label: Text('Capacity')),
                const DataColumn(label: Text('Status')),
                const DataColumn(label: Text('Billing Rate')),
                const DataColumn(label: Text('Last Updated')),
                const DataColumn(label: Text('Actions')),
              ],
              rows: rooms.map((room) {
                final isSelected = _selectedIds.contains(room.id);
                final isActionLoading = _actionLoadingId == room.id;

                return DataRow(
                  selected: isSelected,
                  onSelectChanged: (val) {
                    setState(() {
                      if (val == true) {
                        _selectedIds.add(room.id);
                      } else {
                        _selectedIds.remove(room.id);
                      }
                    });
                  },
                  cells: [
                    DataCell(
                      Checkbox(
                        value: isSelected,
                        onChanged: (val) {
                          setState(() {
                            if (val == true) {
                              _selectedIds.add(room.id);
                            } else {
                              _selectedIds.remove(room.id);
                            }
                          });
                        },
                      ),
                    ),
                    // Room Name & ID
                    DataCell(
                      Row(
                        children: [
                          ClipRRect(
                            borderRadius: BorderRadius.circular(8),
                            child: Image.network(
                              room.formattedImageUrl,
                              width: 44,
                              height: 44,
                              fit: BoxFit.cover,
                              errorBuilder: (_, _, _) => Container(
                                width: 44,
                                height: 44,
                                color: const Color(0xFFF1F5F9),
                                child: const Icon(Icons.meeting_room_rounded, color: Color(0xFF94A3B8), size: 22),
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Row(
                                children: [
                                  Text(
                                    room.name,
                                    style: const TextStyle(
                                      fontFamily: 'Inter',
                                      fontSize: 13,
                                      fontWeight: FontWeight.w700,
                                      color: Color(0xFF0F172A),
                                    ),
                                  ),
                                  const SizedBox(width: 4),
                                  const Icon(Icons.open_in_new_rounded, size: 12, color: AppTheme.primary),
                                ],
                              ),
                              const SizedBox(height: 2),
                              Text(
                                room.roomCode,
                                style: const TextStyle(
                                  fontFamily: 'Inter',
                                  fontSize: 10,
                                  fontWeight: FontWeight.w600,
                                  color: Color(0xFF64748B),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    // Capacity
                    DataCell(
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF1F5F9),
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.group_rounded, size: 14, color: Color(0xFF64748B)),
                            const SizedBox(width: 4),
                            Text(
                              '${room.capacity} Seats',
                              style: const TextStyle(fontFamily: 'Inter', fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF0F172A)),
                            ),
                          ],
                        ),
                      ),
                    ),
                    // Status Badge
                    DataCell(
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: room.isActive ? const Color(0xFFDCFCE7) : const Color(0xFFFEF3C7),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: room.isActive ? const Color(0xFFBBF7D0) : const Color(0xFFFDE68A),
                          ),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Container(
                              width: 6,
                              height: 6,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: room.isActive ? const Color(0xFF16A34A) : const Color(0xFFD97706),
                              ),
                            ),
                            const SizedBox(width: 5),
                            Text(
                              room.isActive ? 'Active' : 'Maintenance',
                              style: TextStyle(
                                fontFamily: 'Inter',
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                                color: room.isActive ? const Color(0xFF15803D) : const Color(0xFFB45309),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    // Billing Rate
                    DataCell(
                      RichText(
                        text: TextSpan(
                          children: [
                            TextSpan(
                              text: '₹${room.hourlyRate.toStringAsFixed(0)}',
                              style: const TextStyle(fontFamily: 'Inter', fontSize: 13, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                            ),
                            const TextSpan(
                              text: ' / hr',
                              style: TextStyle(fontFamily: 'Inter', fontSize: 11, color: Color(0xFF64748B)),
                            ),
                          ],
                        ),
                      ),
                    ),
                    // Last Updated
                    DataCell(
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            room.createdByEmail?.split('@').first ?? 'admin',
                            style: const TextStyle(fontFamily: 'Inter', fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF0F172A)),
                          ),
                          const Text(
                            'Oct 9',
                            style: TextStyle(fontFamily: 'Inter', fontSize: 10, color: Color(0xFF94A3B8)),
                          ),
                        ],
                      ),
                    ),
                    // Actions
                    DataCell(
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          // Edit Button
                          IconButton(
                            icon: const Icon(Icons.edit_outlined, size: 18, color: Color(0xFF475569)),
                            onPressed: () => _openEditModal(context, room),
                            tooltip: 'Edit Room',
                          ),
                          // Toggle Status Switch
                          if (isActionLoading)
                            const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                          else
                            IconButton(
                              icon: Icon(
                                room.isActive ? Icons.toggle_on_rounded : Icons.toggle_off_rounded,
                                size: 24,
                                color: room.isActive ? const Color(0xFF16A34A) : const Color(0xFF94A3B8),
                              ),
                              onPressed: () => _handleToggleStatus(room),
                              tooltip: room.isActive ? 'Set to Maintenance' : 'Activate Room',
                            ),
                          // Delete Button
                          IconButton(
                            icon: const Icon(Icons.delete_outline_rounded, size: 18, color: AppTheme.error),
                            onPressed: () => _confirmDelete(room),
                            tooltip: 'Delete Room',
                          ),
                        ],
                      ),
                    ),
                  ],
                );
              }).toList(),
            ),
          ),
          // Footer Count
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: const BoxDecoration(
              border: Border(top: BorderSide(color: Color(0xFFE2E8F0))),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Showing ${rooms.length} registered meeting spaces',
                  style: const TextStyle(fontFamily: 'Inter', fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF64748B)),
                ),
                Text(
                  _selectedIds.isNotEmpty ? '${_selectedIds.length} spaces selected' : '',
                  style: const TextStyle(fontFamily: 'Inter', fontSize: 12, fontWeight: FontWeight.w700, color: AppTheme.primary),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ==========================================
  // Grid View
  // ==========================================
  Widget _buildGridView(List<RoomModel> rooms) {
    return LayoutBuilder(
      builder: (context, constraints) {
        int crossAxisCount = 1;
        if (constraints.maxWidth >= 1100) {
          crossAxisCount = 3;
        } else if (constraints.maxWidth >= 650) {
          crossAxisCount = 2;
        }

        return GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: crossAxisCount,
            crossAxisSpacing: 16,
            mainAxisSpacing: 16,
            childAspectRatio: 0.95,
          ),
          itemCount: rooms.length,
          itemBuilder: (ctx, index) {
            final room = rooms[index];
            return Container(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFFE2E8F0)),
                boxShadow: const [BoxShadow(color: Color(0x06000000), blurRadius: 4, offset: Offset(0, 1))],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Image Cover
                  Stack(
                    children: [
                      ClipRRect(
                        borderRadius: const BorderRadius.vertical(top: Radius.circular(14)),
                        child: Image.network(
                          room.formattedImageUrl,
                          height: 140,
                          width: double.infinity,
                          fit: BoxFit.cover,
                          errorBuilder: (_, _, _) => Container(
                            height: 140,
                            color: const Color(0xFFF1F5F9),
                            child: const Center(child: Icon(Icons.meeting_room_rounded, color: Color(0xFF94A3B8))),
                          ),
                        ),
                      ),
                      // Status Badge
                      Positioned(
                        top: 10,
                        right: 10,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: room.isActive ? const Color(0xFFDCFCE7) : const Color(0xFFFEF3C7),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(
                            room.isActive ? 'Active' : 'Maintenance',
                            style: TextStyle(
                              fontFamily: 'Inter',
                              fontSize: 10,
                              fontWeight: FontWeight.w700,
                              color: room.isActive ? const Color(0xFF15803D) : const Color(0xFFB45309),
                            ),
                          ),
                        ),
                      ),
                      // Code Badge
                      Positioned(
                        top: 10,
                        left: 10,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: Colors.black.withValues(alpha: 0.6),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            room.roomCode,
                            style: const TextStyle(fontFamily: 'Inter', fontSize: 10, fontWeight: FontWeight.w700, color: Colors.white),
                          ),
                        ),
                      ),
                    ],
                  ),
                  // Details Body
                  Padding(
                    padding: const EdgeInsets.all(12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          room.name,
                          style: const TextStyle(fontFamily: 'Inter', fontSize: 14, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            const Icon(Icons.location_on_rounded, size: 12, color: Color(0xFF64748B)),
                            const SizedBox(width: 4),
                            Expanded(
                              child: Text(
                                room.location,
                                style: const TextStyle(fontFamily: 'Inter', fontSize: 11, color: Color(0xFF64748B)),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              '₹${room.hourlyRate.toStringAsFixed(0)} / hr',
                              style: const TextStyle(fontFamily: 'Inter', fontSize: 13, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(color: const Color(0xFFF1F5F9), borderRadius: BorderRadius.circular(6)),
                              child: Text(
                                '${room.capacity} Seats',
                                style: const TextStyle(fontFamily: 'Inter', fontSize: 10, fontWeight: FontWeight.w700, color: Color(0xFF475569)),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const Spacer(),
                  // Action buttons bar
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: const BoxDecoration(
                      border: Border(top: BorderSide(color: Color(0xFFF1F5F9))),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        IconButton(
                          icon: const Icon(Icons.edit_outlined, size: 18),
                          onPressed: () => _openEditModal(context, room),
                          tooltip: 'Edit Room',
                        ),
                        IconButton(
                          icon: Icon(
                            room.isActive ? Icons.toggle_on_rounded : Icons.toggle_off_rounded,
                            size: 24,
                            color: room.isActive ? const Color(0xFF16A34A) : const Color(0xFF94A3B8),
                          ),
                          onPressed: () => _handleToggleStatus(room),
                        ),
                        IconButton(
                          icon: const Icon(Icons.delete_outline_rounded, size: 18, color: AppTheme.error),
                          onPressed: () => _confirmDelete(room),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  Widget _buildLoadingState() {
    return Container(
      padding: const EdgeInsets.all(40),
      alignment: Alignment.center,
      child: const CircularProgressIndicator(),
    );
  }

  Widget _buildEmptyState() {
    return Container(
      padding: const EdgeInsets.all(40),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      alignment: Alignment.center,
      child: Column(
        children: [
          const Icon(Icons.meeting_room_outlined, size: 48, color: Color(0xFF94A3B8)),
          const SizedBox(height: 12),
          const Text(
            'No meeting rooms found',
            style: TextStyle(fontFamily: 'Inter', fontSize: 16, fontWeight: FontWeight.w700, color: Color(0xFF0F172A)),
          ),
          const SizedBox(height: 4),
          const Text(
            'No rooms matched your search filters, or no rooms have been registered yet.',
            style: TextStyle(fontFamily: 'Inter', fontSize: 12, color: Color(0xFF64748B)),
          ),
          const SizedBox(height: 16),
          ElevatedButton.icon(
            onPressed: () => _openCreateModal(context),
            icon: const Icon(Icons.add_rounded, size: 16),
            label: const Text('Create New Room'),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.primary,
              foregroundColor: Colors.white,
            ),
          ),
        ],
      ),
    );
  }
}
