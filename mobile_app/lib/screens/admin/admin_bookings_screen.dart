import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_theme.dart';
import '../../data/models/booking_model.dart';
import '../../providers/booking_provider.dart';
import '../my_bookings/widgets/cancel_booking_dialog.dart';

class AdminBookingsScreen extends StatefulWidget {
  const AdminBookingsScreen({super.key});

  @override
  State<AdminBookingsScreen> createState() => _AdminBookingsScreenState();
}

class _AdminBookingsScreenState extends State<AdminBookingsScreen> {
  final _searchController = TextEditingController();
  String _selectedStatus = 'ALL';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadBookings();
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _loadBookings() {
    final bp = Provider.of<BookingProvider>(context, listen: false);
    bp.fetchAllAdminBookings(
      search: _searchController.text.trim(),
      status: _selectedStatus == 'ALL' ? null : _selectedStatus,
    );
  }

  Future<void> _handleAdminCancel(BookingModel booking) async {
    showDialog(
      context: context,
      builder: (_) => CancelBookingDialog(
        booking: booking,
        onConfirm: () async {
          Navigator.of(context).pop();
          final bp = Provider.of<BookingProvider>(context, listen: false);
          final success = await bp.cancelBooking(booking.id);
          if (mounted) {
            if (success) {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Reservation successfully cancelled by administrator.'),
                  backgroundColor: AppTheme.success,
                ),
              );
              _loadBookings();
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

  @override
  Widget build(BuildContext context) {
    final bookingProvider = Provider.of<BookingProvider>(context);
    final bookings = bookingProvider.allAdminBookings;

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Enterprise Reservations'),
      ),
      body: Column(
        children: [
          // Search & Filter header
          Container(
            color: AppTheme.surface,
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
            child: Column(
              children: [
                TextField(
                  controller: _searchController,
                  onSubmitted: (_) => _loadBookings(),
                  decoration: InputDecoration(
                    hintText: 'Search title, room, or user email...',
                    prefixIcon: const Icon(Icons.search_rounded),
                    suffixIcon: IconButton(
                      icon: const Icon(Icons.arrow_forward_rounded),
                      onPressed: _loadBookings,
                    ),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    fillColor: AppTheme.background,
                  ),
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    _buildFilterChip('ALL', 'All Bookings'),
                    const SizedBox(width: 8),
                    _buildFilterChip('CONFIRMED', 'Confirmed'),
                    const SizedBox(width: 8),
                    _buildFilterChip('CANCELLED', 'Cancelled'),
                  ],
                ),
              ],
            ),
          ),

          // List content
          Expanded(
            child: RefreshIndicator(
              onRefresh: () async => _loadBookings(),
              color: AppTheme.primary,
              child: bookingProvider.isLoading && bookings.isEmpty
                  ? const Center(child: CircularProgressIndicator())
                  : bookings.isEmpty
                      ? const Center(
                          child: Text('No matching reservations found.'),
                        )
                      : LayoutBuilder(
                          builder: (context, constraints) {
                            final isTablet = constraints.maxWidth >= 700;
                            if (isTablet) {
                              final crossAxisCount = constraints.maxWidth >= 1100 ? 3 : 2;
                              return GridView.builder(
                                padding: const EdgeInsets.all(16),
                                gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                                  crossAxisCount: crossAxisCount,
                                  crossAxisSpacing: 12,
                                  mainAxisSpacing: 12,
                                  mainAxisExtent: 140,
                                ),
                                itemCount: bookings.length,
                                itemBuilder: (ctx, index) => _buildBookingCard(bookings[index]),
                              );
                            }
                            return ListView.separated(
                              padding: const EdgeInsets.all(16),
                              itemCount: bookings.length,
                              separatorBuilder: (_, _) => const SizedBox(height: 12),
                              itemBuilder: (ctx, index) => _buildBookingCard(bookings[index]),
                            );
                          },
                        ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChip(String statusKey, String label) {
    final isSelected = _selectedStatus == statusKey;
    return ChoiceChip(
      label: Text(label),
      selected: isSelected,
      selectedColor: AppTheme.primary,
      labelStyle: TextStyle(
        fontSize: 11,
        color: isSelected ? Colors.white : AppTheme.textSecondary,
        fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
      ),
      onSelected: (_) {
        setState(() {
          _selectedStatus = statusKey;
        });
        _loadBookings();
      },
    );
  }

  Widget _buildBookingCard(BookingModel b) {
    final isConfirmed = b.isConfirmed;

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  b.title,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: AppTheme.textPrimary,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: isConfirmed ? AppTheme.successLight : AppTheme.errorLight,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  b.status,
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                    color: isConfirmed ? AppTheme.success : AppTheme.error,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            '${b.roomName} • ${b.dateLabel} • ${b.timeSlotLabel}',
            style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              const Icon(Icons.person_outline_rounded, size: 14, color: AppTheme.textMuted),
              const SizedBox(width: 4),
              Expanded(
                child: Text(
                  'Booked by: ${b.userEmail} (${b.userName})',
                  style: const TextStyle(fontSize: 11, color: AppTheme.textMuted),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              if (isConfirmed && !b.isPast)
                TextButton(
                  onPressed: () => _handleAdminCancel(b),
                  style: TextButton.styleFrom(
                    foregroundColor: AppTheme.error,
                    padding: EdgeInsets.zero,
                    minimumSize: Size.zero,
                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  ),
                  child: const Text('Admin Cancel', style: TextStyle(fontSize: 12)),
                ),
            ],
          ),
        ],
      ),
    );
  }
}
