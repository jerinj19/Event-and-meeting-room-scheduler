import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_theme.dart';
import '../../data/models/booking_model.dart';
import '../../providers/booking_provider.dart';
import '../booking/book_room_screen.dart';
import 'widgets/booking_item_card.dart';

class MyBookingsScreen extends StatefulWidget {
  final VoidCallback? onBack;
  final VoidCallback? onOpenDrawer;
  final bool hasGlobalHeader;

  const MyBookingsScreen({
    super.key,
    this.onBack,
    this.onOpenDrawer,
    this.hasGlobalHeader = false,
  });

  @override
  State<MyBookingsScreen> createState() => _MyBookingsScreenState();
}

class _MyBookingsScreenState extends State<MyBookingsScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<BookingProvider>(context, listen: false).fetchMyBookings();
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _handleCancel(String bookingId) async {
    final bookingProvider = Provider.of<BookingProvider>(context, listen: false);
    final success = await bookingProvider.cancelBooking(bookingId);

    if (mounted) {
      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Reservation successfully cancelled and slot released.'),
            backgroundColor: AppTheme.success,
          ),
        );
      } else if (bookingProvider.errorMessage != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(bookingProvider.errorMessage!),
            backgroundColor: AppTheme.error,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final bookingProvider = Provider.of<BookingProvider>(context);
    final upcoming = bookingProvider.upcomingBookings;
    final past = bookingProvider.pastBookings;

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('My Bookings'),
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
            tooltip: 'Refresh bookings',
            onPressed: () => bookingProvider.fetchMyBookings(),
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: AppTheme.primary,
          labelColor: AppTheme.primary,
          unselectedLabelColor: AppTheme.textSecondary,
          labelStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
          tabs: [
            Tab(text: 'Upcoming (${upcoming.length})'),
            Tab(text: 'Past & Cancelled (${past.length})'),
          ],
        ),
      ),
      body: RefreshIndicator(
        onRefresh: () => bookingProvider.fetchMyBookings(),
        color: AppTheme.primary,
        child: TabBarView(
          controller: _tabController,
          children: [
            _buildBookingsList(upcoming, isUpcomingTab: true),
            _buildBookingsList(past, isUpcomingTab: false),
          ],
        ),
      ),
    );
  }

  Widget _buildBookingsList(List<BookingModel> list, {required bool isUpcomingTab}) {
    final bookingProvider = Provider.of<BookingProvider>(context);

    if (bookingProvider.isLoading && list.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }

    if (list.isEmpty) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          const SizedBox(height: 80),
          Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  isUpcomingTab ? Icons.event_available_rounded : Icons.history_rounded,
                  size: 56,
                  color: AppTheme.textMuted.withValues(alpha: 0.6),
                ),
                const SizedBox(height: 14),
                Text(
                  isUpcomingTab ? 'No upcoming reservations' : 'No past reservations',
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: AppTheme.textPrimary,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  isUpcomingTab
                      ? 'Reserve a conference room or workspace to get started.'
                      : 'Your completed or cancelled bookings will be listed here.',
                  style: const TextStyle(fontSize: 13, color: AppTheme.textSecondary),
                ),
                if (isUpcomingTab) ...[
                  const SizedBox(height: 18),
                  ElevatedButton.icon(
                    onPressed: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(builder: (_) => const BookRoomScreen()),
                      );
                    },
                    icon: const Icon(Icons.add, size: 18),
                    label: const Text('Schedule a Room'),
                  ),
                ],
              ],
            ),
          ),
        ],
      );
    }

    return LayoutBuilder(
      builder: (context, constraints) {
        if (constraints.maxWidth >= 700) {
          final crossAxisCount = constraints.maxWidth >= 1100 ? 3 : 2;
          return GridView.builder(
            padding: const EdgeInsets.all(16),
            gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: crossAxisCount,
              crossAxisSpacing: 14,
              mainAxisSpacing: 14,
              mainAxisExtent: 235,
            ),
            itemCount: list.length,
            itemBuilder: (ctx, index) => BookingItemCard(
              booking: list[index],
              onCancel: _handleCancel,
            ),
          );
        }
        return ListView.separated(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
          itemCount: list.length,
          separatorBuilder: (_, _) => const SizedBox(height: 12),
          itemBuilder: (ctx, index) {
            final booking = list[index];
            return BookingItemCard(
              booking: booking,
              onCancel: _handleCancel,
            );
          },
        );
      },
    );
  }
}
