import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_theme.dart';
import '../../providers/room_provider.dart';
import 'widgets/room_card.dart';
import 'widgets/room_filter_sheet.dart';

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
  final _searchController = TextEditingController();
  int _selectedCategoryIndex = 0;

  final List<Map<String, dynamic>> _categories = [
    {'label': 'All Spaces', 'min': null, 'max': null},
    {'label': 'Pods (1–4)', 'min': 1, 'max': 4},
    {'label': 'Hubs (5–10)', 'min': 5, 'max': 10},
    {'label': 'Boardrooms (11–20)', 'min': 11, 'max': 20},
    {'label': 'Auditoriums (21+)', 'min': 21, 'max': 500},
  ];

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

  void _onCategorySelected(int index) {
    setState(() {
      _selectedCategoryIndex = index;
    });
    final cat = _categories[index];
    final roomProvider = Provider.of<RoomProvider>(context, listen: false);
    roomProvider.setFilters(
      minCap: cat['min'] as int?,
      maxCap: cat['max'] as int?,
    );
  }

  void _openFilterSheet() {
    final roomProvider = Provider.of<RoomProvider>(context, listen: false);
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => RoomFilterSheet(
        locations: roomProvider.availableLocations,
        currentMinCapacity: roomProvider.minCapacity,
        currentMaxCapacity: roomProvider.maxCapacity,
        currentLocation: roomProvider.selectedLocation,
        currentIsActive: roomProvider.isActiveFilter,
        onApply: ({minCap, maxCap, location, isActive}) {
          roomProvider.setFilters(
            minCap: minCap,
            maxCap: maxCap,
            location: location,
            isActive: isActive,
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final roomProvider = Provider.of<RoomProvider>(context);
    final rooms = roomProvider.rooms;

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Meeting Spaces'),
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
            tooltip: 'Refresh rooms',
            onPressed: () => roomProvider.fetchRooms(),
          ),
        ],
      ),
      body: Column(
        children: [
          // Search & Filter Bar
          Container(
            color: AppTheme.surface,
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
            child: Column(
              children: [
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _searchController,
                        onChanged: (val) => roomProvider.setSearchQuery(val),
                        decoration: InputDecoration(
                          hintText: 'Search by room name or floor...',
                          prefixIcon: const Icon(Icons.search_rounded, color: AppTheme.textSecondary),
                          suffixIcon: _searchController.text.isNotEmpty
                              ? IconButton(
                                  icon: const Icon(Icons.clear, size: 18),
                                  onPressed: () {
                                    _searchController.clear();
                                    roomProvider.setSearchQuery('');
                                  },
                                )
                              : null,
                          contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                          fillColor: AppTheme.background,
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Stack(
                      children: [
                        IconButton.filledTonal(
                          icon: const Icon(Icons.tune_rounded),
                          tooltip: 'Filters',
                          onPressed: _openFilterSheet,
                        ),
                        if (roomProvider.hasActiveFilters)
                          Positioned(
                            right: 4,
                            top: 4,
                            child: Container(
                              width: 8,
                              height: 8,
                              decoration: const BoxDecoration(
                                color: AppTheme.primary,
                                shape: BoxShape.circle,
                              ),
                            ),
                          ),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 10),

                // Quick Category Chips
                SizedBox(
                  height: 36,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    itemCount: _categories.length,
                    separatorBuilder: (_, _) => const SizedBox(width: 8),
                    itemBuilder: (ctx, idx) {
                      final isSelected = _selectedCategoryIndex == idx;
                      return ChoiceChip(
                        label: Text(
                          _categories[idx]['label'] as String,
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                            color: isSelected ? Colors.white : AppTheme.textSecondary,
                          ),
                        ),
                        selected: isSelected,
                        selectedColor: AppTheme.primary,
                        backgroundColor: AppTheme.surface,
                        side: BorderSide(
                          color: isSelected ? AppTheme.primary : AppTheme.border,
                        ),
                        onSelected: (_) => _onCategorySelected(idx),
                      );
                    },
                  ),
                ),
              ],
            ),
          ),

          // Room List Content
          Expanded(
            child: RefreshIndicator(
              onRefresh: () => roomProvider.fetchRooms(),
              color: AppTheme.primary,
              child: roomProvider.isLoading && rooms.isEmpty
                  ? const Center(
                      child: CircularProgressIndicator(),
                    )
                  : rooms.isEmpty
                      ? ListView(
                          physics: const AlwaysScrollableScrollPhysics(),
                          children: [
                            const SizedBox(height: 80),
                            Center(
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(
                                    Icons.meeting_room_outlined,
                                    size: 56,
                                    color: AppTheme.textMuted.withValues(alpha: 0.6),
                                  ),
                                  const SizedBox(height: 14),
                                  const Text(
                                    'No meeting rooms found',
                                    style: TextStyle(
                                      fontSize: 16,
                                      fontWeight: FontWeight.w700,
                                      color: AppTheme.textPrimary,
                                    ),
                                  ),
                                  const SizedBox(height: 6),
                                  const Text(
                                    'Try adjusting your search query or filter options.',
                                    style: TextStyle(fontSize: 13, color: AppTheme.textSecondary),
                                  ),
                                  const SizedBox(height: 18),
                                  OutlinedButton(
                                    onPressed: () {
                                      _searchController.clear();
                                      setState(() {
                                        _selectedCategoryIndex = 0;
                                      });
                                      roomProvider.clearFilters();
                                    },
                                    child: const Text('Reset All Filters'),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        )
                      : LayoutBuilder(
                          builder: (context, constraints) {
                            final isTablet = constraints.maxWidth >= 650;
                            if (isTablet) {
                              final crossAxisCount = constraints.maxWidth >= 1050 ? 3 : 2;
                              return GridView.builder(
                                padding: const EdgeInsets.all(16),
                                gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                                  crossAxisCount: crossAxisCount,
                                  crossAxisSpacing: 16,
                                  mainAxisSpacing: 16,
                                  childAspectRatio: 0.84,
                                ),
                                itemCount: rooms.length,
                                itemBuilder: (ctx, index) => RoomCard(room: rooms[index]),
                              );
                            }
                            return ListView.separated(
                              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                              itemCount: rooms.length,
                              separatorBuilder: (_, _) => const SizedBox(height: 16),
                              itemBuilder: (ctx, index) {
                                return RoomCard(room: rooms[index]);
                              },
                            );
                          },
                        ),
            ),
          ),
        ],
      ),
    );
  }
}
