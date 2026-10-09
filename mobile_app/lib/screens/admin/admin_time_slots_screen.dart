import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_theme.dart';
import '../../data/models/room_model.dart';
import '../../data/models/time_slot_model.dart';
import '../../providers/room_provider.dart';
import '../../providers/time_slot_provider.dart';
import 'widgets/admin_time_slot_modal.dart';
import 'widgets/bulk_time_slot_modal.dart';

class AdminTimeSlotsScreen extends StatefulWidget {
  final VoidCallback? onOpenDrawer;
  final VoidCallback? onBack;
  final bool hasGlobalHeader;

  const AdminTimeSlotsScreen({
    super.key,
    this.onOpenDrawer,
    this.onBack,
    this.hasGlobalHeader = false,
  });

  @override
  State<AdminTimeSlotsScreen> createState() => _AdminTimeSlotsScreenState();
}

class _AdminTimeSlotsScreenState extends State<AdminTimeSlotsScreen> {
  final TextEditingController _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<TimeSlotProvider>(context, listen: false).fetchSlots();
      Provider.of<RoomProvider>(context, listen: false).fetchRooms();
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final slotProvider = Provider.of<TimeSlotProvider>(context);
    final roomProvider = Provider.of<RoomProvider>(context);
    final rooms = roomProvider.rooms;

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: RefreshIndicator(
        onRefresh: () async {
          await slotProvider.fetchSlots();
          await roomProvider.fetchRooms();
        },
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          physics: const AlwaysScrollableScrollPhysics(),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 1. Executive Header & Quick Actions
              _buildHeader(context, slotProvider, rooms),
              const SizedBox(height: 18),

              // 2. 6 KPI Summary Cards
              _buildKpiCards(slotProvider),
              const SizedBox(height: 18),

              // 3. Search & Filter Command Bar
              _buildFilterCommandBar(slotProvider, rooms),
              const SizedBox(height: 18),

              // 4. Slots Content (Grid or Table)
              if (slotProvider.loading)
                _buildLoadingState()
              else if (slotProvider.slots.isEmpty)
                _buildEmptyState(slotProvider)
              else if (slotProvider.viewMode == 'grid')
                _buildGridView(slotProvider, rooms)
              else
                _buildTableView(slotProvider, rooms),

              const SizedBox(height: 18),

              // 5. Pagination Controls
              if (slotProvider.totalCount > 0)
                _buildPaginationBar(slotProvider),
            ],
          ),
        ),
      ),
    );
  }

  // ==========================================
  // 1. Executive Header
  // ==========================================
  Widget _buildHeader(
    BuildContext context,
    TimeSlotProvider provider,
    List<RoomModel> rooms,
  ) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final isWide = constraints.maxWidth >= 720;

        final titleBlock = Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(
                    color: AppTheme.primary.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(
                    Icons.schedule_rounded,
                    color: AppTheme.primary,
                    size: 26,
                  ),
                ),
                const SizedBox(width: 10),
                const Text(
                  'Time Slots Management',
                  style: TextStyle(
                    fontFamily: 'Inter',
                    fontSize: 22,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF0F172A),
                    letterSpacing: -0.5,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 4),
            const Text(
              'Configure calendar time slots with granular room applicability.',
              style: TextStyle(
                fontFamily: 'Inter',
                fontSize: 13,
                color: Color(0xFF64748B),
              ),
            ),
          ],
        );

        final actionButtons = Wrap(
          spacing: 10,
          runSpacing: 8,
          crossAxisAlignment: WrapCrossAlignment.center,
          children: [
            // Reset to Defaults (Outlined)
            OutlinedButton.icon(
              onPressed: () => _showResetDefaultsDialog(provider),
              icon: const Icon(Icons.restart_alt_rounded, size: 16),
              label: const Text('Reset to Defaults'),
              style: OutlinedButton.styleFrom(
                foregroundColor: const Color(0xFF475569),
                backgroundColor: Colors.white,
                side: const BorderSide(color: Color(0xFFCBD5E1)),
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10),
                ),
                textStyle: const TextStyle(
                  fontFamily: 'Inter',
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),

            // Add Multiple Slots (Light Blue Pill)
            ElevatedButton.icon(
              onPressed: () => _showBulkSlotDialog(provider, rooms),
              icon: const Icon(Icons.more_time_rounded, size: 16),
              label: const Text('Add Multiple Slots'),
              style: ElevatedButton.styleFrom(
                foregroundColor: AppTheme.primary,
                backgroundColor: AppTheme.primary.withValues(alpha: 0.1),
                elevation: 0,
                side: BorderSide(color: AppTheme.primary.withValues(alpha: 0.25)),
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10),
                ),
                textStyle: const TextStyle(
                  fontFamily: 'Inter',
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),

            // + Add New Slot (Solid Primary Blue)
            ElevatedButton.icon(
              onPressed: () => _showAddEditSlotDialog(provider, rooms, null),
              icon: const Icon(Icons.add_rounded, size: 18),
              label: const Text('Add New Slot'),
              style: ElevatedButton.styleFrom(
                foregroundColor: Colors.white,
                backgroundColor: AppTheme.primary,
                elevation: 1,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 11),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10),
                ),
                textStyle: const TextStyle(
                  fontFamily: 'Inter',
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ],
        );

        if (isWide) {
          return Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              titleBlock,
              actionButtons,
            ],
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
  // 2. 6 KPI Summary Cards
  // ==========================================
  Widget _buildKpiCards(TimeSlotProvider provider) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final w = constraints.maxWidth;
        int crossAxisCount = 6;
        if (w < 480) {
          crossAxisCount = 2;
        } else if (w < 780) {
          crossAxisCount = 3;
        } else if (w < 1100) {
          crossAxisCount = 6;
        }

        final cards = [
          _buildKpiCard('Total Slots', provider.kpiTotal.toString(), const Color(0xFF0F172A)),
          _buildKpiCard('Active (Page)', provider.kpiActive.toString(), const Color(0xFF059669)),
          _buildKpiCard('Morning (Page)', provider.kpiMorning.toString(), const Color(0xFFD97706)),
          _buildKpiCard('Afternoon (Page)', provider.kpiAfternoon.toString(), const Color(0xFF0284C7)),
          _buildKpiCard('Evening (Page)', provider.kpiEvening.toString(), const Color(0xFF4F46E5)),
          _buildKpiCard('Dated Slots (Page)', provider.kpiDated.toString(), const Color(0xFF7C3AED)),
        ];

        return GridView.count(
          crossAxisCount: crossAxisCount,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          crossAxisSpacing: 12,
          mainAxisSpacing: 12,
          childAspectRatio: crossAxisCount >= 6 ? 1.8 : 2.2,
          children: cards,
        );
      },
    );
  }

  Widget _buildKpiCard(String label, String value, Color valueColor) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: const [
          BoxShadow(
            color: Color(0x06000000),
            blurRadius: 4,
            offset: Offset(0, 1),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            label,
            style: const TextStyle(
              fontFamily: 'Inter',
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: Color(0xFF64748B),
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: TextStyle(
              fontFamily: 'Inter',
              fontSize: 22,
              fontWeight: FontWeight.w800,
              color: valueColor,
            ),
          ),
        ],
      ),
    );
  }

  // ==========================================
  // 3. Search & Filter Command Bar
  // ==========================================
  Widget _buildFilterCommandBar(TimeSlotProvider provider, List<RoomModel> rooms) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: const [
          BoxShadow(
            color: Color(0x04000000),
            blurRadius: 6,
            offset: Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Row 1: Search Box + View Toggle
          Row(
            children: [
              Expanded(
                child: Container(
                  height: 38,
                  decoration: BoxDecoration(
                    color: const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(10),
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
                          style: const TextStyle(fontFamily: 'Inter', fontSize: 13),
                          decoration: const InputDecoration(
                            hintText: 'Search by label, start time, room, or period...',
                            hintStyle: TextStyle(
                              fontFamily: 'Inter',
                              fontSize: 12,
                              color: Color(0xFF94A3B8),
                            ),
                            border: InputBorder.none,
                            isDense: true,
                            contentPadding: EdgeInsets.zero,
                          ),
                          onChanged: (val) => provider.setSearchTerm(val),
                        ),
                      ),
                      if (_searchController.text.isNotEmpty)
                        GestureDetector(
                          onTap: () {
                            _searchController.clear();
                            provider.setSearchTerm('');
                          },
                          child: const Icon(Icons.close_rounded, size: 16, color: Color(0xFF94A3B8)),
                        ),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 12),
              // Grid / Table View Switcher
              Container(
                decoration: BoxDecoration(
                  color: const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                padding: const EdgeInsets.all(2),
                child: Row(
                  children: [
                    _buildViewButton(
                      icon: Icons.grid_view_rounded,
                      isActive: provider.viewMode == 'grid',
                      tooltip: 'Grid View',
                      onTap: () => provider.setViewMode('grid'),
                    ),
                    _buildViewButton(
                      icon: Icons.table_rows_rounded,
                      isActive: provider.viewMode == 'table',
                      tooltip: 'Table View',
                      onTap: () => provider.setViewMode('table'),
                    ),
                  ],
                ),
              ),
            ],
          ),

          const SizedBox(height: 12),
          const Divider(color: Color(0xFFF1F5F9), height: 1),
          const SizedBox(height: 12),

          // Row 2: Filter Dropdowns
          Wrap(
            spacing: 12,
            runSpacing: 10,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              // ROOM Filter
              _buildFilterDropdown(
                label: 'ROOM:',
                value: provider.roomFilter,
                items: [
                  const DropdownMenuItem(value: 'all', child: Text('🏢 All Scopes (Global + All Rooms)')),
                  const DropdownMenuItem(value: 'global', child: Text('🌐 Global Only (All Rooms)')),
                  ...rooms.map(
                    (r) => DropdownMenuItem(
                      value: r.id,
                      child: Text('📍 ${r.name}'),
                    ),
                  ),
                ],
                onChanged: (val) {
                  if (val != null) provider.setRoomFilter(val);
                },
              ),

              // SESSION Filter
              _buildFilterDropdown(
                label: 'SESSION:',
                value: provider.sessionFilter,
                items: const [
                  DropdownMenuItem(value: 'all', child: Text('All Status (Morning, Afternoon, Evening)')),
                  DropdownMenuItem(value: 'morning', child: Text('Morning')),
                  DropdownMenuItem(value: 'afternoon', child: Text('Afternoon')),
                  DropdownMenuItem(value: 'evening', child: Text('Evening')),
                ],
                onChanged: (val) {
                  if (val != null) provider.setSessionFilter(val);
                },
              ),

              // PERIOD / DATE Filter
              _buildFilterDropdown(
                label: 'PERIOD / DATE:',
                value: provider.periodFilter,
                items: const [
                  DropdownMenuItem(value: 'all', child: Text('📅 All Dates')),
                  DropdownMenuItem(value: 'today', child: Text('📅 Today')),
                  DropdownMenuItem(value: 'tomorrow', child: Text('📅 Tomorrow')),
                  DropdownMenuItem(value: 'this_week', child: Text('📆 This Week')),
                  DropdownMenuItem(value: 'this_month', child: Text('🗓️ This Month')),
                  DropdownMenuItem(value: 'custom', child: Text('⚙️ Specific Date / Custom Range...')),
                ],
                onChanged: (val) {
                  if (val != null) provider.setPeriodFilter(val);
                },
              ),

              // TYPE Filter
              _buildFilterDropdown(
                label: 'TYPE:',
                value: provider.dateTypeFilter,
                items: const [
                  DropdownMenuItem(value: 'all', child: Text('All Types (Daily + Dated)')),
                  DropdownMenuItem(value: 'recurring', child: Text('🔄 Every Day (Daily)')),
                  DropdownMenuItem(value: 'dated', child: Text('📅 Specific Dates Only')),
                ],
                onChanged: (val) {
                  if (val != null) provider.setDateTypeFilter(val);
                },
              ),

              // STATUS Filter
              _buildFilterDropdown(
                label: 'STATUS:',
                value: provider.statusFilter,
                items: const [
                  DropdownMenuItem(value: 'all', child: Text('All Status')),
                  DropdownMenuItem(value: 'active', child: Text('Active Only')),
                  DropdownMenuItem(value: 'inactive', child: Text('Disabled Only')),
                ],
                onChanged: (val) {
                  if (val != null) provider.setStatusFilter(val);
                },
              ),

              // Clear Filters Button
              if (provider.hasActiveFilters)
                TextButton.icon(
                  onPressed: () {
                    _searchController.clear();
                    provider.clearFilters();
                  },
                  icon: const Icon(Icons.filter_alt_off_rounded, size: 14, color: AppTheme.error),
                  label: const Text(
                    'Clear Filters',
                    style: TextStyle(
                      fontFamily: 'Inter',
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: AppTheme.error,
                    ),
                  ),
                  style: TextButton.styleFrom(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                    backgroundColor: AppTheme.error.withValues(alpha: 0.08),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildViewButton({
    required IconData icon,
    required bool isActive,
    required String tooltip,
    required VoidCallback onTap,
  }) {
    return Tooltip(
      message: tooltip,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(6),
        child: Container(
          padding: const EdgeInsets.all(6),
          decoration: BoxDecoration(
            color: isActive ? Colors.white : Colors.transparent,
            borderRadius: BorderRadius.circular(6),
            boxShadow: isActive
                ? const [
                    BoxShadow(color: Color(0x10000000), blurRadius: 2, offset: Offset(0, 1))
                  ]
                : null,
          ),
          child: Icon(
            icon,
            size: 18,
            color: isActive ? AppTheme.primary : const Color(0xFF64748B),
          ),
        ),
      ),
    );
  }

  Widget _buildFilterDropdown<T>({
    required String label,
    required T value,
    required List<DropdownMenuItem<T>> items,
    required ValueChanged<T?> onChanged,
  }) {
    // Deduplicate items by value to guarantee Flutter's uniqueness constraint
    final Map<T, DropdownMenuItem<T>> uniqueMap = {};
    for (final item in items) {
      if (item.value != null && !uniqueMap.containsKey(item.value)) {
        uniqueMap[item.value as T] = item;
      }
    }
    final uniqueItems = uniqueMap.values.toList();
    final safeValue = uniqueMap.containsKey(value)
        ? value
        : (uniqueItems.isNotEmpty ? uniqueItems.first.value : null);

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontFamily: 'Inter',
            fontSize: 11,
            fontWeight: FontWeight.w700,
            color: Color(0xFF64748B),
          ),
        ),
        const SizedBox(width: 6),
        Container(
          height: 34,
          padding: const EdgeInsets.symmetric(horizontal: 8),
          decoration: BoxDecoration(
            color: const Color(0xFFF8FAFC),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: const Color(0xFFCBD5E1)),
          ),
          child: DropdownButtonHideUnderline(
            child: DropdownButton<T>(
              value: safeValue,
              items: uniqueItems,
              onChanged: onChanged,
              style: const TextStyle(
                fontFamily: 'Inter',
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: Color(0xFF0F172A),
              ),
              icon: const Icon(Icons.arrow_drop_down_rounded, size: 18, color: Color(0xFF64748B)),
              isDense: true,
            ),
          ),
        ),
      ],
    );
  }

  // ==========================================
  // 4. Content Area: Grid View
  // ==========================================
  Widget _buildGridView(TimeSlotProvider provider, List<RoomModel> rooms) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final w = constraints.maxWidth;
        int crossAxisCount = 4;
        if (w < 600) {
          crossAxisCount = 1;
        } else if (w < 900) {
          crossAxisCount = 2;
        } else if (w < 1250) {
          crossAxisCount = 3;
        }

        return GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: crossAxisCount,
            crossAxisSpacing: 14,
            mainAxisSpacing: 14,
            mainAxisExtent: 220,
          ),
          itemCount: provider.slots.length,
          itemBuilder: (context, index) {
            final slot = provider.slots[index];
            return _buildSlotCard(slot, provider, rooms);
          },
        );
      },
    );
  }

  Widget _buildSlotCard(
    TimeSlotModel slot,
    TimeSlotProvider provider,
    List<RoomModel> rooms,
  ) {
    final isToggling = provider.actionLoadingId == slot.id;

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: slot.isActive ? Colors.white : const Color(0xFFFAFAFA),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: slot.isActive ? const Color(0xFFE2E8F0) : const Color(0xFFCBD5E1),
          width: 1,
        ),
        boxShadow: const [
          BoxShadow(
            color: Color(0x04000000),
            blurRadius: 4,
            offset: Offset(0, 1),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          // Top Row: Category Badge + Date Badge + Room Badge
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Wrap(
                  spacing: 6,
                  runSpacing: 4,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    _buildPeriodBadge(slot.period),
                    if (slot.date != null && slot.date!.isNotEmpty)
                      _buildBadge(
                        icon: Icons.calendar_today_rounded,
                        label: slot.date!,
                        bgColor: const Color(0xFFF5F3FF),
                        textColor: const Color(0xFF7C3AED),
                        borderColor: const Color(0xFFDDD6FE),
                      )
                    else
                      _buildBadge(
                        icon: Icons.repeat_rounded,
                        label: 'Every Day',
                        bgColor: const Color(0xFFF1F5F9),
                        textColor: const Color(0xFF475569),
                        borderColor: const Color(0xFFE2E8F0),
                      ),
                  ],
                ),
              ),
              const SizedBox(width: 4),
              // Room Scope Tag
              _buildBadge(
                icon: slot.roomName != null ? Icons.room_rounded : Icons.language_rounded,
                label: slot.roomName ?? 'Global',
                bgColor: slot.roomName != null ? const Color(0xFFEFF6FF) : const Color(0xFFF1F5F9),
                textColor: slot.roomName != null ? const Color(0xFF1D4ED8) : const Color(0xFF64748B),
                borderColor: slot.roomName != null ? const Color(0xFFBFDBFE) : const Color(0xFFE2E8F0),
              ),
            ],
          ),

          // Center Display: Centered Time Range + Duration
          Container(
            padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 10),
            decoration: BoxDecoration(
              color: const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFF1F5F9)),
            ),
            child: Column(
              children: [
                if (slot.label.isNotEmpty && !slot.label.contains(slot.start)) ...[
                  Text(
                    slot.label.toUpperCase(),
                    style: const TextStyle(
                      fontFamily: 'Inter',
                      fontSize: 10,
                      fontWeight: FontWeight.w700,
                      color: Color(0xFF64748B),
                      letterSpacing: 0.5,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                ],
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      slot.startTime12h,
                      style: const TextStyle(
                        fontFamily: 'Courier',
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF0F172A),
                      ),
                    ),
                    const Padding(
                      padding: EdgeInsets.symmetric(horizontal: 6),
                      child: Text(
                        '→',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: AppTheme.primary,
                        ),
                      ),
                    ),
                    Text(
                      slot.endTime12h,
                      style: const TextStyle(
                        fontFamily: 'Courier',
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF0F172A),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.schedule_rounded, size: 12, color: AppTheme.primary),
                      const SizedBox(width: 4),
                      Text(
                        slot.duration,
                        style: const TextStyle(
                          fontFamily: 'Inter',
                          fontSize: 10,
                          fontWeight: FontWeight.w600,
                          color: Color(0xFF64748B),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // Bottom Row: Active Toggle + Edit / Delete Actions
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              // Active Switch
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  SizedBox(
                    height: 24,
                    width: 38,
                    child: Switch(
                      value: slot.isActive,
                      activeTrackColor: const Color(0xFFA7F3D0),
                      activeThumbColor: const Color(0xFF059669),
                      inactiveThumbColor: const Color(0xFF94A3B8),
                      inactiveTrackColor: const Color(0xFFE2E8F0),
                      materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      onChanged: isToggling ? null : (_) => provider.toggleSlotStatus(slot),
                    ),
                  ),
                  const SizedBox(width: 6),
                  Text(
                    isToggling
                        ? 'Updating...'
                        : (slot.isActive ? 'Active' : 'Disabled'),
                    style: TextStyle(
                      fontFamily: 'Inter',
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: slot.isActive ? const Color(0xFF047857) : const Color(0xFF94A3B8),
                    ),
                  ),
                ],
              ),

              // Edit & Delete Buttons
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  IconButton(
                    icon: const Icon(Icons.edit_outlined, size: 18, color: Color(0xFF64748B)),
                    tooltip: 'Edit Slot',
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                    onPressed: () => _showAddEditSlotDialog(provider, rooms, slot),
                  ),
                  IconButton(
                    icon: const Icon(Icons.delete_outline_rounded, size: 18, color: AppTheme.error),
                    tooltip: 'Delete Slot',
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                    onPressed: () => _showDeleteConfirmDialog(provider, slot),
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }

  // ==========================================
  // 4. Content Area: Table View
  // ==========================================
  Widget _buildTableView(TimeSlotProvider provider, List<RoomModel> rooms) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: DataTable(
          headingRowColor: WidgetStateProperty.all(const Color(0xFFF8FAFC)),
          dataRowColor: WidgetStateProperty.all(Colors.white),
          columns: const [
            DataColumn(label: Text('Display Label', style: TextStyle(fontWeight: FontWeight.bold))),
            DataColumn(label: Text('Date', style: TextStyle(fontWeight: FontWeight.bold))),
            DataColumn(label: Text('Start Time', style: TextStyle(fontWeight: FontWeight.bold))),
            DataColumn(label: Text('End Time', style: TextStyle(fontWeight: FontWeight.bold))),
            DataColumn(label: Text('Duration', style: TextStyle(fontWeight: FontWeight.bold))),
            DataColumn(label: Text('Category', style: TextStyle(fontWeight: FontWeight.bold))),
            DataColumn(label: Text('Applicability', style: TextStyle(fontWeight: FontWeight.bold))),
            DataColumn(label: Text('Status', style: TextStyle(fontWeight: FontWeight.bold))),
            DataColumn(label: Text('Actions', style: TextStyle(fontWeight: FontWeight.bold))),
          ],
          rows: provider.slots.map((slot) {
            return DataRow(
              cells: [
                DataCell(Text(slot.label, style: const TextStyle(fontWeight: FontWeight.w600))),
                DataCell(Text(slot.date ?? 'Every Day')),
                DataCell(Text(slot.startTime12h, style: const TextStyle(fontFamily: 'Courier'))),
                DataCell(Text(slot.endTime12h, style: const TextStyle(fontFamily: 'Courier'))),
                DataCell(Text(slot.duration)),
                DataCell(_buildPeriodBadge(slot.period)),
                DataCell(Text(slot.roomName ?? 'Global')),
                DataCell(
                  Switch(
                    value: slot.isActive,
                    activeTrackColor: const Color(0xFFA7F3D0),
                    activeThumbColor: const Color(0xFF059669),
                    onChanged: (_) => provider.toggleSlotStatus(slot),
                  ),
                ),
                DataCell(
                  Row(
                    children: [
                      IconButton(
                        icon: const Icon(Icons.edit_outlined, size: 16),
                        onPressed: () => _showAddEditSlotDialog(provider, rooms, slot),
                      ),
                      IconButton(
                        icon: const Icon(Icons.delete_outline_rounded, size: 16, color: AppTheme.error),
                        onPressed: () => _showDeleteConfirmDialog(provider, slot),
                      ),
                    ],
                  ),
                ),
              ],
            );
          }).toList(),
        ),
      ),
    );
  }

  // ==========================================
  // Badge Helpers
  // ==========================================
  Widget _buildPeriodBadge(String period) {
    switch (period.toLowerCase()) {
      case 'morning':
        return _buildBadge(
          icon: Icons.wb_sunny_rounded,
          label: 'Morning',
          bgColor: const Color(0xFFFFFBEB),
          textColor: const Color(0xFFB45309),
          borderColor: const Color(0xFFFDE68A),
        );
      case 'afternoon':
        return _buildBadge(
          icon: Icons.light_mode_rounded,
          label: 'Afternoon',
          bgColor: const Color(0xFFF0F9FF),
          textColor: const Color(0xFF0369A1),
          borderColor: const Color(0xFFBAE6FD),
        );
      case 'evening':
        return _buildBadge(
          icon: Icons.nights_stay_rounded,
          label: 'Evening',
          bgColor: const Color(0xFFEEF2FF),
          textColor: const Color(0xFF4338CA),
          borderColor: const Color(0xFFC7D2FE),
        );
      default:
        return _buildBadge(
          icon: Icons.schedule_rounded,
          label: period,
          bgColor: const Color(0xFFF1F5F9),
          textColor: const Color(0xFF475569),
          borderColor: const Color(0xFFCBD5E1),
        );
    }
  }

  Widget _buildBadge({
    required IconData icon,
    required String label,
    required Color bgColor,
    required Color textColor,
    required Color borderColor,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2.5),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: borderColor),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 11, color: textColor),
          const SizedBox(width: 4),
          Text(
            label,
            style: TextStyle(
              fontFamily: 'Inter',
              fontSize: 10,
              fontWeight: FontWeight.w700,
              color: textColor,
            ),
          ),
        ],
      ),
    );
  }

  // ==========================================
  // Loading & Empty States
  // ==========================================
  Widget _buildLoadingState() {
    return Container(
      padding: const EdgeInsets.all(48),
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: const Column(
        children: [
          CircularProgressIndicator(strokeWidth: 3, color: AppTheme.primary),
          SizedBox(height: 14),
          Text(
            'Loading dynamic time slots from database...',
            style: TextStyle(fontFamily: 'Inter', fontSize: 13, color: Color(0xFF64748B)),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState(TimeSlotProvider provider) {
    return Container(
      padding: const EdgeInsets.all(48),
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFFF1F5F9),
              borderRadius: BorderRadius.circular(16),
            ),
            child: const Icon(Icons.schedule_rounded, size: 36, color: Color(0xFF94A3B8)),
          ),
          const SizedBox(height: 14),
          const Text(
            'No Time Slots Found',
            style: TextStyle(
              fontFamily: 'Inter',
              fontSize: 16,
              fontWeight: FontWeight.w800,
              color: Color(0xFF0F172A),
            ),
          ),
          const SizedBox(height: 6),
          Text(
            provider.hasActiveFilters
                ? 'No time slots matched your current filter criteria. Try resetting filters.'
                : 'No time slots are currently configured. Click "Reset to Defaults" to restore corporate slots or create custom slots.',
            style: const TextStyle(fontFamily: 'Inter', fontSize: 12, color: Color(0xFF64748B)),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 16),
          if (provider.hasActiveFilters)
            ElevatedButton(
              onPressed: () {
                _searchController.clear();
                provider.clearFilters();
              },
              child: const Text('Clear All Filters'),
            )
          else
            ElevatedButton.icon(
              onPressed: () => provider.resetDefaults(),
              icon: const Icon(Icons.restart_alt_rounded, size: 16),
              label: const Text('Restore Standard Default Slots'),
            ),
        ],
      ),
    );
  }

  // ==========================================
  // 5. Pagination Bar
  // ==========================================
  Widget _buildPaginationBar(TimeSlotProvider provider) {
    final startIdx = (provider.currentPage - 1) * provider.pageSize + 1;
    final endIdx = (provider.currentPage * provider.pageSize).clamp(1, provider.totalCount);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: LayoutBuilder(
        builder: (context, constraints) {
          final isWide = constraints.maxWidth >= 600;

          final countInfo = Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                'Showing $startIdx – $endIdx of ${provider.totalCount} time slots',
                style: const TextStyle(
                  fontFamily: 'Inter',
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF64748B),
                ),
              ),
              const SizedBox(width: 14),
              // Show Dropdown
              Container(
                height: 28,
                padding: const EdgeInsets.symmetric(horizontal: 6),
                decoration: BoxDecoration(
                  color: const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(color: const Color(0xFFCBD5E1)),
                ),
                child: DropdownButtonHideUnderline(
                  child: DropdownButton<int>(
                    value: provider.pageSize,
                    items: const [
                      DropdownMenuItem(value: 12, child: Text('12 / page')),
                      DropdownMenuItem(value: 24, child: Text('24 / page')),
                      DropdownMenuItem(value: 48, child: Text('48 / page')),
                    ],
                    onChanged: (val) {
                      if (val != null) provider.setPageSize(val);
                    },
                    style: const TextStyle(fontFamily: 'Inter', fontSize: 11, color: Color(0xFF0F172A)),
                    isDense: true,
                  ),
                ),
              ),
            ],
          );

          final navButtons = Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              IconButton(
                icon: const Icon(Icons.first_page_rounded, size: 20),
                onPressed: provider.currentPage > 1 ? () => provider.setPage(1) : null,
              ),
              IconButton(
                icon: const Icon(Icons.chevron_left_rounded, size: 20),
                onPressed: provider.currentPage > 1 ? () => provider.setPage(provider.currentPage - 1) : null,
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 8),
                child: Text(
                  'Page ${provider.currentPage} of ${provider.totalPages}',
                  style: const TextStyle(
                    fontFamily: 'Inter',
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF0F172A),
                  ),
                ),
              ),
              IconButton(
                icon: const Icon(Icons.chevron_right_rounded, size: 20),
                onPressed: provider.currentPage < provider.totalPages
                    ? () => provider.setPage(provider.currentPage + 1)
                    : null,
              ),
              IconButton(
                icon: const Icon(Icons.last_page_rounded, size: 20),
                onPressed: provider.currentPage < provider.totalPages
                    ? () => provider.setPage(provider.totalPages)
                    : null,
              ),
            ],
          );

          if (isWide) {
            return Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [countInfo, navButtons],
            );
          } else {
            return Column(
              children: [
                countInfo,
                const SizedBox(height: 8),
                navButtons,
              ],
            );
          }
        },
      ),
    );
  }

  // ==========================================
  // Modals & Dialogs
  // ==========================================

  // Reset Defaults Dialog
  void _showResetDefaultsDialog(TimeSlotProvider provider) {
    final messenger = ScaffoldMessenger.of(context);
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Row(
          children: [
            Icon(Icons.restart_alt_rounded, color: Color(0xFFD97706), size: 26),
            SizedBox(width: 10),
            Text('Restore Default Slots?', style: TextStyle(fontWeight: FontWeight.bold)),
          ],
        ),
        content: const Text(
          'This will ensure that all standard time slots (09:00 AM to 10:00 PM) across Morning, Afternoon, and Evening are present and active. Any custom slots you created will be preserved.',
          style: TextStyle(fontFamily: 'Inter', fontSize: 13, color: Color(0xFF475569)),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.of(ctx).pop();
              final ok = await provider.resetDefaults();
              messenger.showSnackBar(
                SnackBar(
                  content: Text(ok
                      ? 'Standard default time slots restored successfully.'
                      : 'Failed to reset defaults.'),
                  backgroundColor: ok ? AppTheme.success : AppTheme.error,
                ),
              );
            },
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primary),
            child: const Text('Confirm Restore'),
          ),
        ],
      ),
    );
  }

  // Delete Confirm Dialog
  void _showDeleteConfirmDialog(TimeSlotProvider provider, TimeSlotModel slot) {
    final messenger = ScaffoldMessenger.of(context);
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Row(
          children: [
            Icon(Icons.delete_outline_rounded, color: AppTheme.error, size: 26),
            SizedBox(width: 10),
            Text('Delete Time Slot', style: TextStyle(fontWeight: FontWeight.bold)),
          ],
        ),
        content: Text(
          'Are you sure you want to delete "${slot.label}" (${slot.startTime12h} - ${slot.endTime12h})? This action cannot be undone.',
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
              final ok = await provider.deleteSlot(slot.id);
              messenger.showSnackBar(
                SnackBar(
                  content: Text(ok ? 'Time slot successfully deleted.' : 'Failed to delete slot.'),
                  backgroundColor: ok ? AppTheme.success : AppTheme.error,
                ),
              );
            },
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.error),
            child: const Text('Delete Slot'),
          ),
        ],
      ),
    );
  }

  // Add / Edit Slot Modal (Matches Image 4 & AdminTimeSlotModal.jsx)
  void _showAddEditSlotDialog(
    TimeSlotProvider provider,
    List<RoomModel> rooms,
    TimeSlotModel? slot,
  ) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (_) => AdminTimeSlotModal(
        slot: slot,
        rooms: rooms,
        onSave: (payload) async {
          bool ok = false;
          if (slot != null) {
            ok = await provider.updateSlot(slot.id, payload);
          } else {
            ok = await provider.createSlot(payload);
          }
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(ok
                    ? (slot != null ? 'Time slot updated successfully!' : 'Time slot created successfully!')
                    : (provider.error ?? 'Failed to save time slot.')),
                backgroundColor: ok ? AppTheme.success : AppTheme.error,
              ),
            );
          }
        },
      ),
    );
  }

  // Bulk Slot Creation Modal (Matches Image 3 & BulkTimeSlotModal.jsx)
  void _showBulkSlotDialog(
    TimeSlotProvider provider,
    List<RoomModel> rooms,
  ) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (_) => BulkTimeSlotModal(
        rooms: rooms,
        onSaveBulk: (payload) async {
          final ok = await provider.bulkCreate(payload);
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(ok
                    ? 'Successfully created ${payload.length} time slots!'
                    : (provider.error ?? 'Failed to create bulk slots.')),
                backgroundColor: ok ? AppTheme.success : AppTheme.error,
              ),
            );
          }
        },
      ),
    );
  }
}
