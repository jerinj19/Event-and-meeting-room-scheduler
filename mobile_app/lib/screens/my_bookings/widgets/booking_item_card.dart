import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/date_formatter.dart';
import '../../../data/models/booking_model.dart';
import 'cancel_booking_dialog.dart';

class BookingItemCard extends StatelessWidget {
  final BookingModel booking;
  final Function(String) onCancel;
  final bool isCancelling;

  const BookingItemCard({
    super.key,
    required this.booking,
    required this.onCancel,
    this.isCancelling = false,
  });

  void _showCancelDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (_) => CancelBookingDialog(
        booking: booking,
        isLoading: isCancelling,
        onConfirm: () {
          Navigator.of(context).pop();
          onCancel(booking.id);
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isConfirmed = booking.isConfirmed;
    final isCancelled = booking.isCancelled;
    final isPast = booking.isPast;

    Color statusBg = AppTheme.successLight;
    Color statusText = AppTheme.success;
    String statusLabel = 'Confirmed';

    if (isCancelled) {
      statusBg = AppTheme.errorLight;
      statusText = AppTheme.error;
      statusLabel = 'Cancelled';
    } else if (isPast) {
      statusBg = AppTheme.borderSubtle;
      statusText = AppTheme.textSecondary;
      statusLabel = 'Completed';
    }

    return Container(
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
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Top Row: Meeting Title & Status Badge
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Text(
                    booking.title,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: AppTheme.textPrimary,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: statusBg,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: statusText.withValues(alpha: 0.2)),
                  ),
                  child: Text(
                    statusLabel,
                    style: TextStyle(
                      color: statusText,
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),

            // Room Name & Location with photo thumbnail
            Row(
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: SizedBox(
                    width: 44,
                    height: 44,
                    child: booking.formattedRoomImage.isNotEmpty
                        ? Image.network(
                            booking.formattedRoomImage,
                            fit: BoxFit.cover,
                            errorBuilder: (context, error, stackTrace) => Container(
                              color: AppTheme.primaryLight,
                              child: const Icon(Icons.meeting_room_outlined, size: 22, color: AppTheme.primary),
                            ),
                          )
                        : Container(
                            color: AppTheme.primaryLight,
                            child: const Icon(Icons.meeting_room_outlined, size: 22, color: AppTheme.primary),
                          ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        booking.roomName,
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          color: AppTheme.textPrimary,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 2),
                      Row(
                        children: [
                          const Icon(Icons.location_on_outlined, size: 12, color: AppTheme.textSecondary),
                          const SizedBox(width: 3),
                          Expanded(
                            child: Text(
                              booking.roomLocation,
                              style: const TextStyle(
                                fontSize: 12,
                                color: AppTheme.textSecondary,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            const Divider(height: 1),
            const SizedBox(height: 12),

            // Date and Time Row
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.calendar_today_rounded, size: 14, color: AppTheme.textSecondary),
                          const SizedBox(width: 6),
                          Text(
                            booking.dateLabel,
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: AppTheme.textPrimary,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          const Icon(Icons.schedule_rounded, size: 14, color: AppTheme.primary),
                          const SizedBox(width: 6),
                          Text(
                            '${booking.timeSlotLabel} (${DateFormatter.formatDurationMinutes(booking.durationMinutes)})',
                            style: const TextStyle(
                              fontSize: 12,
                              color: AppTheme.primary,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppTheme.background,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: AppTheme.border),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.group_outlined, size: 14, color: AppTheme.textSecondary),
                      const SizedBox(width: 4),
                      Text(
                        '${booking.attendeesCount} pax',
                        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppTheme.textSecondary),
                      ),
                    ],
                  ),
                ),
              ],
            ),

            if (booking.description.isNotEmpty) ...[
              const SizedBox(height: 10),
              Text(
                booking.description,
                style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ],

            // Cancel action button (if confirmed and not yet passed)
            if (isConfirmed && !isPast) ...[
              const SizedBox(height: 14),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: isCancelling ? null : () => _showCancelDialog(context),
                  icon: const Icon(Icons.cancel_outlined, size: 16, color: AppTheme.error),
                  label: const Text('Cancel Reservation', style: TextStyle(color: AppTheme.error, fontSize: 13)),
                  style: OutlinedButton.styleFrom(
                    side: BorderSide(color: AppTheme.error.withValues(alpha: 0.5)),
                    padding: const EdgeInsets.symmetric(vertical: 8),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
