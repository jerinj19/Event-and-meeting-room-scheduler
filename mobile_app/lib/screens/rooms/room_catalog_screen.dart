import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../data/models/room_model.dart';
import '../../providers/room_provider.dart';
import '../booking/book_room_screen.dart';
import 'room_detail_screen.dart';
import 'widgets/room_card.dart';

class RoomCatalogScreen extends StatefulWidget {
  final VoidCallback? onBack;
  final VoidCallback? onOpenDrawer;
  final bool hasGlobalHeader;

  const RoomCatalogScreen({
    super.key,
    this.onBack,
    this.onOpenDrawer,
    this.hasGlobalHeader = false,
  });

  @override
  State<RoomCatalogScreen> createState() => _RoomCatalogScreenState();
}

class _RoomCatalogScreenState extends State<RoomCatalogScreen> {
  final TextEditingController _locationQueryController = TextEditingController();

  // Filter States (matching web RoomCatalog.jsx)
  String _locationQuery = '';
  DateTime? _selectedDate = DateTime.now();
  final List<String> _selectedAmenities = [];
  bool _availableOnly = false;
  String _locationFilter = 'all';
  double? _maxHourlyRate;
  String _sortBy = 'recommended';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<RoomProvider>(context, listen: false).fetchRooms();
    });
  }

  @override
  void dispose() {
    _locationQueryController.dispose();
    super.dispose();
  }

  void _resetAllFilters() {
    setState(() {
      _locationQuery = '';
      _locationQueryController.clear();
      _selectedDate = DateTime.now();
      _selectedAmenities.clear();
      _availableOnly = false;
      _locationFilter = 'all';
      _maxHourlyRate = null;
      _sortBy = 'recommended';
    });
  }

  String _formatDisplayDate(DateTime? date) {
    if (date == null) return 'Any Date (Click to choose)';
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final target = DateTime(date.year, date.month, date.day);
    final formatted = DateFormat('d MMM yyyy').format(date);

    if (target.isAtSameMomentAs(today)) {
      return 'Today, $formatted';
    } else if (target.isAtSameMomentAs(today.add(const Duration(days: 1)))) {
      return 'Tomorrow, $formatted';
    }
    return formatted;
  }

  Future<void> _pickDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate ?? now,
      firstDate: now.subtract(const Duration(days: 1)),
      lastDate: now.add(const Duration(days: 365)),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.light(
              primary: Color(0xFF2563EB),
              onPrimary: Colors.white,
              onSurface: Color(0xFF0F172A),
            ),
          ),
          child: child!,
        );
      },
    );
    if (picked != null) {
      setState(() {
        _selectedDate = picked;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final roomProvider = Provider.of<RoomProvider>(context);
    final allRooms = roomProvider.rooms;

    // Dynamic calculations from all available rooms (matching RoomCatalog.jsx)
    final availableCount = allRooms.where((r) => r.isActive).length;
    final maintenanceCount = allRooms.where((r) => !r.isActive).length;

    // Dynamic amenities extraction with real counts
    final Map<String, int> amenityCounts = {};
    for (final r in allRooms) {
      for (final a in r.amenities) {
        final clean = a.trim();
        if (clean.isNotEmpty) {
          amenityCounts[clean] = (amenityCounts[clean] ?? 0) + 1;
        }
      }
    }

    // Dynamic locations extraction with real counts
    final Map<String, int> locationCounts = {};
    for (final r in allRooms) {
      if (r.location.trim().isNotEmpty) {
        final loc = r.location.trim();
        locationCounts[loc] = (locationCounts[loc] ?? 0) + 1;
      }
    }

    // Dynamic max property rate
    double maxPropertyRate = 1000.0;
    for (final r in allRooms) {
      if (r.hourlyRate > maxPropertyRate) {
        maxPropertyRate = r.hourlyRate;
      }
    }
    final effectiveMaxRate = _maxHourlyRate ?? maxPropertyRate;

    // Filtered rooms calculation
    List<RoomModel> filteredRooms = allRooms.where((room) {
      // 1. Keyword search (Location, Name, Amenities)
      if (_locationQuery.trim().isNotEmpty) {
        final q = _locationQuery.trim().toLowerCase();
        final matchLoc = room.location.toLowerCase().contains(q);
        final matchName = room.name.toLowerCase().contains(q);
        final matchAmenity = room.amenities.any((a) => a.toLowerCase().contains(q));
        if (!matchLoc && !matchName && !matchAmenity) return false;
      }

      // 2. Sidebar location filter
      if (_locationFilter != 'all') {
        if (!room.location.toLowerCase().contains(_locationFilter.toLowerCase())) {
          return false;
        }
      }

      // 3. Available only
      if (_availableOnly && !room.isActive) {
        return false;
      }

      // 4. Budget hourly rate
      if (room.hourlyRate > effectiveMaxRate) {
        return false;
      }

      // 5. Selected amenities
      if (_selectedAmenities.isNotEmpty) {
        final lowerList = room.amenities.map((a) => a.toLowerCase()).toList();
        final matchesAll = _selectedAmenities.every((sel) =>
            lowerList.any((a) => a.contains(sel.toLowerCase())));
        if (!matchesAll) return false;
      }

      return true;
    }).toList();

    // Sorting
    if (_sortBy == 'rateAsc') {
      filteredRooms.sort((a, b) => a.hourlyRate.compareTo(b.hourlyRate));
    } else if (_sortBy == 'rateDesc') {
      filteredRooms.sort((a, b) => b.hourlyRate.compareTo(a.hourlyRate));
    } else if (_sortBy == 'capacityDesc') {
      filteredRooms.sort((a, b) => b.capacity.compareTo(a.capacity));
    }

    // Budget match count
    final roomsWithinBudget = allRooms.where((r) => r.hourlyRate <= effectiveMaxRate).length;

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: !widget.hasGlobalHeader
          ? AppBar(
              backgroundColor: Colors.white,
              title: const Text('Meeting Rooms & Workspaces'),
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
            )
          : null,
      body: LayoutBuilder(
        builder: (context, constraints) {
          final isDesktop = constraints.maxWidth >= 960;

          return RefreshIndicator(
            onRefresh: () => roomProvider.fetchRooms(),
            color: const Color(0xFF2563EB),
            child: SingleChildScrollView(
              padding: EdgeInsets.symmetric(
                horizontal: isDesktop ? 24 : 16,
                vertical: 20,
              ),
              child: Center(
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 1520),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // 1. Breadcrumbs
                      Row(
                        children: [
                          const Text(
                            'Home',
                            style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                          ),
                          const Padding(
                            padding: EdgeInsets.symmetric(horizontal: 6),
                            child: Text('/', style: TextStyle(fontSize: 12, color: Color(0xFF94A3B8))),
                          ),
                          const Text(
                            'Workspaces',
                            style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                          ),
                          const Padding(
                            padding: EdgeInsets.symmetric(horizontal: 6),
                            child: Text('/', style: TextStyle(fontSize: 12, color: Color(0xFF94A3B8))),
                          ),
                          const Text(
                            'Catalog',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: Color(0xFF2563EB),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),

                      // 2. Title & Telemetry Counters Header
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  'Meeting Rooms & Workspaces',
                                  style: TextStyle(
                                    fontSize: 26,
                                    fontWeight: FontWeight.w800,
                                    color: Color(0xFF0F172A),
                                    letterSpacing: -0.5,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                const Text(
                                  'Search, filter, and reserve high-tech meeting rooms and collaborative spaces in real time.',
                                  style: TextStyle(
                                    fontSize: 13,
                                    color: Color(0xFF64748B),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          if (isDesktop) ...[
                            const SizedBox(width: 16),
                            _buildTelemetryStrip(
                              availableCount: availableCount,
                              maintenanceCount: maintenanceCount,
                              totalCount: allRooms.length,
                            ),
                          ],
                        ],
                      ),
                      if (!isDesktop) ...[
                        const SizedBox(height: 12),
                        _buildTelemetryStrip(
                          availableCount: availableCount,
                          maintenanceCount: maintenanceCount,
                          totalCount: allRooms.length,
                        ),
                      ],
                      const SizedBox(height: 20),

                      // 3. Universal Search Command Bar (Location, Date, Search Button)
                      _buildSearchCommandBar(isDesktop),
                      const SizedBox(height: 20),

                      // 4. Two-Column Master-Detail Layout (Desktop) or Vertical with Filter Drawer (Mobile)
                      if (isDesktop)
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Left Column: Filter Sidebar
                            SizedBox(
                              width: 290,
                              child: _buildFilterSidebar(
                                minRate: 0,
                                maxRateLimit: maxPropertyRate,
                                currentMaxRate: effectiveMaxRate,
                                matchingRoomsCount: roomsWithinBudget,
                                totalRoomsCount: allRooms.length,
                                amenityCounts: amenityCounts,
                                locationCounts: locationCounts,
                              ),
                            ),
                            const SizedBox(width: 24),

                            // Right Column: Results Stream
                            Expanded(
                              child: _buildResultsStream(
                                filteredRooms: filteredRooms,
                                totalCount: allRooms.length,
                                isDesktop: isDesktop,
                                availableWidth: constraints.maxWidth - 290 - 24 - 48,
                              ),
                            ),
                          ],
                        )
                      else ...[
                        // Mobile Filter Action Bar
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              '${filteredRooms.length} Spaces Found',
                              style: const TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.w700,
                                color: Color(0xFF0F172A),
                              ),
                            ),
                            OutlinedButton.icon(
                              onPressed: () => _openMobileFilterSheet(
                                maxPropertyRate: maxPropertyRate,
                                effectiveMaxRate: effectiveMaxRate,
                                roomsWithinBudget: roomsWithinBudget,
                                totalRoomsCount: allRooms.length,
                                amenityCounts: amenityCounts,
                                locationCounts: locationCounts,
                              ),
                              icon: const Icon(Icons.tune_rounded, size: 16),
                              label: const Text('Filter by'),
                              style: OutlinedButton.styleFrom(
                                side: const BorderSide(color: Color(0xFFCBD5E1)),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(10),
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 14),
                        _buildResultsStream(
                          filteredRooms: filteredRooms,
                          totalCount: allRooms.length,
                          isDesktop: false,
                          availableWidth: constraints.maxWidth - 32,
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  // --- Telemetry Strip ---
  Widget _buildTelemetryStrip({
    required int availableCount,
    required int maintenanceCount,
    required int totalCount,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
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
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              Container(
                width: 7,
                height: 7,
                decoration: const BoxDecoration(
                  color: Color(0xFF10B981),
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 6),
              const Text(
                'Available: ',
                style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
              ),
              Text(
                '$availableCount',
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF0F172A),
                ),
              ),
            ],
          ),
          const SizedBox(width: 12),
          Container(width: 1, height: 14, color: const Color(0xFFE2E8F0)),
          const SizedBox(width: 12),
          Row(
            children: [
              Container(
                width: 7,
                height: 7,
                decoration: const BoxDecoration(
                  color: Color(0xFFF59E0B),
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 6),
              const Text(
                'Maintenance: ',
                style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
              ),
              Text(
                '$maintenanceCount',
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF0F172A),
                ),
              ),
            ],
          ),
          const SizedBox(width: 12),
          Container(width: 1, height: 14, color: const Color(0xFFE2E8F0)),
          const SizedBox(width: 12),
          Row(
            children: [
              const Text(
                'Total Properties: ',
                style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
              ),
              Text(
                '$totalCount',
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF0F172A),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // --- Search Command Bar ---
  Widget _buildSearchCommandBar(bool isDesktop) {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: const [
          BoxShadow(
            color: Color(0x06000000),
            blurRadius: 6,
            offset: Offset(0, 2),
          ),
        ],
      ),
      child: isDesktop
          ? Row(
              children: [
                // Location Input Box
                Expanded(
                  flex: 7,
                  child: _buildLocationInput(),
                ),
                const SizedBox(width: 12),

                // Date & Availability Picker Box
                Expanded(
                  flex: 4,
                  child: _buildDateSelector(),
                ),
                const SizedBox(width: 12),

                // Search Button
                SizedBox(
                  height: 48,
                  child: ElevatedButton.icon(
                    onPressed: () {
                      setState(() {});
                    },
                    icon: const Icon(Icons.search_rounded, size: 16, color: Colors.white),
                    label: const Text(
                      'Search',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: Colors.white,
                      ),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF2563EB),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                      padding: const EdgeInsets.symmetric(horizontal: 20),
                      elevation: 0,
                    ),
                  ),
                ),
              ],
            )
          : Column(
              children: [
                _buildLocationInput(),
                const SizedBox(height: 8),
                _buildDateSelector(),
                const SizedBox(height: 8),
                SizedBox(
                  width: double.infinity,
                  height: 44,
                  child: ElevatedButton.icon(
                    onPressed: () {
                      setState(() {});
                    },
                    icon: const Icon(Icons.search_rounded, size: 16, color: Colors.white),
                    label: const Text(
                      'Search',
                      style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Colors.white),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF2563EB),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                    ),
                  ),
                ),
              ],
            ),
    );
  }

  Widget _buildLocationInput() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: const Color(0xFFF1F5F9)),
      ),
      child: Row(
        children: [
          Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              color: const Color(0xFFEFF6FF),
              borderRadius: BorderRadius.circular(8),
            ),
            child: const Icon(Icons.location_on_rounded, color: Color(0xFF2563EB), size: 18),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text(
                  'LOCATION',
                  style: TextStyle(
                    fontSize: 9,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.8,
                    color: Color(0xFF64748B),
                  ),
                ),
                TextField(
                  controller: _locationQueryController,
                  onChanged: (val) {
                    setState(() {
                      _locationQuery = val;
                    });
                  },
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF0F172A),
                  ),
                  decoration: InputDecoration(
                    isDense: true,
                    contentPadding: EdgeInsets.zero,
                    border: InputBorder.none,
                    hintText: 'Enter location (e.g. Madiwala, Silkboard, Kerala, Bangalore)...',
                    hintStyle: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w400,
                      color: Color(0xFF94A3B8),
                    ),
                    suffixIcon: _locationQuery.isNotEmpty
                        ? InkWell(
                            onTap: () {
                              _locationQueryController.clear();
                              setState(() {
                                _locationQuery = '';
                              });
                            },
                            child: const Icon(Icons.close_rounded, size: 16, color: Color(0xFF94A3B8)),
                          )
                        : null,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDateSelector() {
    return InkWell(
      onTap: _pickDate,
      borderRadius: BorderRadius.circular(10),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: const Color(0xFFF8FAFC),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: const Color(0xFFF1F5F9)),
        ),
        child: Row(
          children: [
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                color: const Color(0xFFEFF6FF),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.calendar_today_rounded, color: Color(0xFF2563EB), size: 16),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text(
                    'DATE & AVAILABILITY',
                    style: TextStyle(
                      fontSize: 9,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 0.8,
                      color: Color(0xFF64748B),
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    _formatDisplayDate(_selectedDate),
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF0F172A),
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
            const Icon(Icons.keyboard_arrow_down_rounded, color: Color(0xFF94A3B8), size: 20),
          ],
        ),
      ),
    );
  }

  // --- Filter Sidebar ---
  Widget _buildFilterSidebar({
    required double minRate,
    required double maxRateLimit,
    required double currentMaxRate,
    required int matchingRoomsCount,
    required int totalRoomsCount,
    required Map<String, int> amenityCounts,
    required Map<String, int> locationCounts,
  }) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: const [
          BoxShadow(
            color: Color(0x06000000),
            blurRadius: 6,
            offset: Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 1. Header & Reset Action
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Row(
                children: [
                  Icon(Icons.filter_list_rounded, size: 18, color: Color(0xFF334155)),
                  SizedBox(width: 6),
                  Text(
                    'Filter by:',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: Color(0xFF0F172A),
                    ),
                  ),
                ],
              ),
              InkWell(
                onTap: _resetAllFilters,
                child: const Text(
                  'Reset all',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF2563EB),
                  ),
                ),
              ),
            ],
          ),
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 14),
            child: Divider(height: 1, color: Color(0xFFF1F5F9)),
          ),

          // 2. Budget Slider
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Your budget (per hour)',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF0F172A),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: const Color(0xFFEFF6FF),
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(color: const Color(0xFFDBEAFE)),
                ),
                child: Text(
                  'Up to ₹${currentMaxRate.toInt()}/hr',
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF2563EB),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),

          SliderTheme(
            data: SliderTheme.of(context).copyWith(
              trackHeight: 6,
              activeTrackColor: const Color(0xFF2563EB),
              inactiveTrackColor: const Color(0xFFE2E8F0),
              thumbColor: Colors.white,
              thumbShape: const RoundSliderThumbShape(
                enabledThumbRadius: 9,
                elevation: 3,
                pressedElevation: 6,
              ),
              overlayShape: const RoundSliderOverlayShape(overlayRadius: 16),
            ),
            child: Slider(
              min: minRate,
              max: maxRateLimit > minRate ? maxRateLimit : minRate + 1,
              value: currentMaxRate.clamp(minRate, maxRateLimit > minRate ? maxRateLimit : minRate + 1),
              onChanged: (val) {
                setState(() {
                  _maxHourlyRate = val;
                });
              },
            ),
          ),

          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('₹${minRate.toInt()}', style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8))),
              Text('₹${((minRate + maxRateLimit) / 2).toInt()}', style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8))),
              Text('₹${maxRateLimit.toInt()}+', style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8))),
            ],
          ),
          const SizedBox(height: 8),

          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: const Color(0xFFF1F5F9)),
            ),
            child: Row(
              children: [
                const Text('✓ ', style: TextStyle(color: Color(0xFF2563EB), fontWeight: FontWeight.bold, fontSize: 11)),
                Text(
                  matchingRoomsCount == totalRoomsCount
                      ? 'All $totalRoomsCount rooms fit this budget'
                      : '$matchingRoomsCount of $totalRoomsCount rooms fit this budget',
                  style: const TextStyle(fontSize: 11, color: Color(0xFF475569)),
                ),
              ],
            ),
          ),

          const Padding(
            padding: EdgeInsets.symmetric(vertical: 14),
            child: Divider(height: 1, color: Color(0xFFF1F5F9)),
          ),

          // 3. Popular Amenities
          const Text(
            'Popular Amenities',
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w700,
              color: Color(0xFF0F172A),
            ),
          ),
          const SizedBox(height: 8),

          // Available Right Now
          InkWell(
            onTap: () {
              setState(() {
                _availableOnly = !_availableOnly;
              });
            },
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 4),
              child: Row(
                children: [
                  SizedBox(
                    width: 20,
                    height: 20,
                    child: Checkbox(
                      value: _availableOnly,
                      onChanged: (val) {
                        setState(() {
                          _availableOnly = val ?? false;
                        });
                      },
                      activeColor: const Color(0xFF2563EB),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
                    ),
                  ),
                  const SizedBox(width: 8),
                  const Text(
                    'Available Right Now',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF047857),
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Dynamic Amenities
          ...amenityCounts.entries.map((entry) {
            final isChecked = _selectedAmenities.contains(entry.key);
            return InkWell(
              onTap: () {
                setState(() {
                  if (isChecked) {
                    _selectedAmenities.remove(entry.key);
                  } else {
                    _selectedAmenities.add(entry.key);
                  }
                });
              },
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 4),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        SizedBox(
                          width: 20,
                          height: 20,
                          child: Checkbox(
                            value: isChecked,
                            onChanged: (val) {
                              setState(() {
                                if (val == true) {
                                  _selectedAmenities.add(entry.key);
                                } else {
                                  _selectedAmenities.remove(entry.key);
                                }
                              });
                            },
                            activeColor: const Color(0xFF2563EB),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          entry.key,
                          style: const TextStyle(
                            fontSize: 12,
                            color: Color(0xFF334155),
                          ),
                        ),
                      ],
                    ),
                    Text(
                      '${entry.value}',
                      style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8)),
                    ),
                  ],
                ),
              ),
            );
          }),

          const Padding(
            padding: EdgeInsets.symmetric(vertical: 14),
            child: Divider(height: 1, color: Color(0xFFF1F5F9)),
          ),

          // 4. Available Locations
          const Text(
            'Available Locations',
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w700,
              color: Color(0xFF0F172A),
            ),
          ),
          const SizedBox(height: 8),

          // All Locations Radio
          InkWell(
            onTap: () {
              setState(() {
                _locationFilter = 'all';
              });
            },
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 4),
              child: Row(
                children: [
                  Icon(
                    _locationFilter == 'all'
                        ? Icons.radio_button_checked
                        : Icons.radio_button_unchecked,
                    size: 18,
                    color: _locationFilter == 'all'
                        ? const Color(0xFF2563EB)
                        : const Color(0xFF94A3B8),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    'All Locations',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: _locationFilter == 'all' ? FontWeight.w700 : FontWeight.w500,
                      color: _locationFilter == 'all' ? const Color(0xFF2563EB) : const Color(0xFF334155),
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Dynamic Locations Radio
          ...locationCounts.entries.map((entry) {
            final isSelected = _locationFilter.toLowerCase() == entry.key.toLowerCase();
            return InkWell(
              onTap: () {
                setState(() {
                  _locationFilter = entry.key;
                });
              },
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 4),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Icon(
                          isSelected
                              ? Icons.radio_button_checked
                              : Icons.radio_button_unchecked,
                          size: 18,
                          color: isSelected
                              ? const Color(0xFF2563EB)
                              : const Color(0xFF94A3B8),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          entry.key,
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                            color: isSelected ? const Color(0xFF2563EB) : const Color(0xFF334155),
                          ),
                        ),
                      ],
                    ),
                    Text(
                      '${entry.value}',
                      style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8)),
                    ),
                  ],
                ),
              ),
            );
          }),
        ],
      ),
    );
  }

  // --- Mobile Filter Sheet ---
  void _openMobileFilterSheet({
    required double maxPropertyRate,
    required double effectiveMaxRate,
    required int roomsWithinBudget,
    required int totalRoomsCount,
    required Map<String, int> amenityCounts,
    required Map<String, int> locationCounts,
  }) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (ctx, setModalState) {
            return DraggableScrollableSheet(
              expand: false,
              initialChildSize: 0.85,
              maxChildSize: 0.95,
              builder: (_, scrollCtrl) {
                return SingleChildScrollView(
                  controller: scrollCtrl,
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            'Filters',
                            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                          ),
                          IconButton(
                            icon: const Icon(Icons.close),
                            onPressed: () => Navigator.pop(ctx),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      _buildFilterSidebar(
                        minRate: 0,
                        maxRateLimit: maxPropertyRate,
                        currentMaxRate: effectiveMaxRate,
                        matchingRoomsCount: roomsWithinBudget,
                        totalRoomsCount: totalRoomsCount,
                        amenityCounts: amenityCounts,
                        locationCounts: locationCounts,
                      ),
                      const SizedBox(height: 16),
                      SizedBox(
                        width: double.infinity,
                        height: 44,
                        child: ElevatedButton(
                          onPressed: () => Navigator.pop(ctx),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF2563EB),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          ),
                          child: const Text('Apply Filters', style: TextStyle(color: Colors.white)),
                        ),
                      ),
                    ],
                  ),
                );
              },
            );
          },
        );
      },
    );
  }

  // --- Right Column: Results Stream ---
  Widget _buildResultsStream({
    required List<RoomModel> filteredRooms,
    required int totalCount,
    required bool isDesktop,
    required double availableWidth,
  }) {
    final dateStr = _selectedDate != null ? DateFormat('yyyy-MM-dd').format(_selectedDate!) : '';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Results Header Bar (Counts, Active tags, Sort dropdown)
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFFE2E8F0)),
            boxShadow: const [
              BoxShadow(
                color: Color(0x06000000),
                blurRadius: 4,
                offset: Offset(0, 1),
              ),
            ],
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Wrap(
                  crossAxisAlignment: WrapCrossAlignment.center,
                  spacing: 8,
                  runSpacing: 6,
                  children: [
                    RichText(
                      text: TextSpan(
                        children: [
                          const TextSpan(
                            text: 'Results: ',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                              color: Color(0xFF0F172A),
                            ),
                          ),
                          TextSpan(
                            text: '${filteredRooms.length} Spaces Found ',
                            style: const TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w800,
                              color: Color(0xFF2563EB),
                            ),
                          ),
                          if (dateStr.isNotEmpty)
                            TextSpan(
                              text: '(Available on $dateStr)',
                              style: const TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w400,
                                color: Color(0xFF64748B),
                              ),
                            ),
                        ],
                      ),
                    ),

                    // Active Date Chip
                    if (_selectedDate != null)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFFEEF2FF),
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(color: const Color(0xFFE0E7FF)),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              'Date: ${_formatDisplayDate(_selectedDate)}',
                              style: const TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                                color: Color(0xFF4338CA),
                              ),
                            ),
                            const SizedBox(width: 6),
                            InkWell(
                              onTap: () {
                                setState(() {
                                  _selectedDate = null;
                                });
                              },
                              child: const Icon(Icons.close_rounded, size: 12, color: Color(0xFF6366F1)),
                            ),
                          ],
                        ),
                      ),

                    // Active Search Query Chip
                    if (_locationQuery.isNotEmpty)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFFEFF6FF),
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(color: const Color(0xFFDBEAFE)),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              'Search: "$_locationQuery"',
                              style: const TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                                color: Color(0xFF1D4ED8),
                              ),
                            ),
                            const SizedBox(width: 6),
                            InkWell(
                              onTap: () {
                                _locationQueryController.clear();
                                setState(() {
                                  _locationQuery = '';
                                });
                              },
                              child: const Icon(Icons.close_rounded, size: 12, color: Color(0xFF3B82F6)),
                            ),
                          ],
                        ),
                      ),

                    // Active Location Chip
                    if (_locationFilter != 'all')
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFFEFF6FF),
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(color: const Color(0xFFDBEAFE)),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              'Location: $_locationFilter',
                              style: const TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                                color: Color(0xFF1D4ED8),
                              ),
                            ),
                            const SizedBox(width: 6),
                            InkWell(
                              onTap: () {
                                setState(() {
                                  _locationFilter = 'all';
                                });
                              },
                              child: const Icon(Icons.close_rounded, size: 12, color: Color(0xFF3B82F6)),
                            ),
                          ],
                        ),
                      ),
                  ],
                ),
              ),

              // Sort By Dropdown
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text(
                    'Sort by: ',
                    style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                  ),
                  DropdownButton<String>(
                    value: _sortBy,
                    underline: const SizedBox.shrink(),
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF0F172A),
                    ),
                    items: const [
                      DropdownMenuItem(
                        value: 'recommended',
                        child: Text('Recommended (Top picks)'),
                      ),
                      DropdownMenuItem(
                        value: 'rateAsc',
                        child: Text('Rate: Low to High'),
                      ),
                      DropdownMenuItem(
                        value: 'rateDesc',
                        child: Text('Rate: High to Low'),
                      ),
                      DropdownMenuItem(
                        value: 'capacityDesc',
                        child: Text('Capacity: High to Low'),
                      ),
                    ],
                    onChanged: (val) {
                      if (val != null) {
                        setState(() {
                          _sortBy = val;
                        });
                      }
                    },
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),

        // Grid of Room Cards
        if (filteredRooms.isEmpty)
          Container(
            padding: const EdgeInsets.all(40),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: Center(
              child: Column(
                children: [
                  Container(
                    width: 56,
                    height: 56,
                    decoration: BoxDecoration(
                      color: const Color(0xFFF1F5F9),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: const Icon(
                      Icons.meeting_room_outlined,
                      size: 28,
                      color: Color(0xFF94A3B8),
                    ),
                  ),
                  const SizedBox(height: 14),
                  const Text(
                    'No matching rooms found',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: Color(0xFF0F172A),
                    ),
                  ),
                  const SizedBox(height: 6),
                  const Text(
                    'Try clearing some filters or changing capacity criteria to see available workspaces.',
                    style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: _resetAllFilters,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF2563EB),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                    ),
                    child: const Text('Reset All Filters', style: TextStyle(color: Colors.white, fontSize: 12)),
                  ),
                ],
              ),
            ),
          )
        else
          LayoutBuilder(
            builder: (ctx, constraints) {
              final width = constraints.maxWidth;
              int columns = 1;
              if (width >= 1050) {
                columns = 3;
              } else if (width >= 650) {
                columns = 2;
              }

              // Compute dynamic aspect ratio so card height remains constant (~345px) with no excess empty gap!
              const double cardEstimatedHeight = 345.0;
              final double columnWidth = (width - (columns - 1) * 16) / columns;
              final double dynamicAspectRatio = columnWidth / cardEstimatedHeight;

              return GridView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: columns,
                  crossAxisSpacing: 16,
                  mainAxisSpacing: 16,
                  childAspectRatio: dynamicAspectRatio.clamp(0.72, 1.2),
                ),
                itemCount: filteredRooms.length,
                itemBuilder: (ctx, index) {
                  final room = filteredRooms[index];
                  return RoomCard(
                    room: room,
                    onViewSpecs: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (_) => RoomDetailScreen(room: room),
                        ),
                      );
                    },
                    onBook: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (_) => BookRoomScreen(preselectedRoom: room),
                        ),
                      );
                    },
                  );
                },
              );
            },
          ),
      ],
    );
  }
}

