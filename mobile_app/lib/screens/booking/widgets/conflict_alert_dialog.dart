import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';
import '../../../data/models/conflict_model.dart';

class ConflictAlertDialog extends StatelessWidget {
  final String roomName;
  final String message;
  final List<ConflictModel> conflicts;

  const ConflictAlertDialog({
    super.key,
    required this.roomName,
    required this.message,
    required this.conflicts,
  });

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      title: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: AppTheme.errorLight,
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Icon(Icons.warning_amber_rounded, color: AppTheme.error, size: 24),
          ),
          const SizedBox(width: 12),
          const Expanded(
            child: Text(
              'Booking Conflict',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w800,
                color: AppTheme.textPrimary,
              ),
            ),
          ),
        ],
      ),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              "Room '$roomName' is already reserved for the requested time slot.",
              style: const TextStyle(fontSize: 13, color: AppTheme.textSecondary),
            ),
            const SizedBox(height: 16),
            if (conflicts.isNotEmpty) ...[
              const Text(
                'Conflicting Reservation:',
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppTheme.textPrimary),
              ),
              const SizedBox(height: 8),
              ...conflicts.map((c) {
                return Container(
                  width: double.infinity,
                  margin: const EdgeInsets.only(bottom: 8),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppTheme.errorLight,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppTheme.error.withValues(alpha: 0.3)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        c.title,
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                          color: AppTheme.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          const Icon(Icons.schedule_rounded, size: 14, color: AppTheme.error),
                          const SizedBox(width: 6),
                          Text(
                            c.timeInterval,
                            style: const TextStyle(
                              fontSize: 12,
                              color: AppTheme.error,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                      if (c.bookedBy != null && c.bookedBy!.isNotEmpty) ...[
                        const SizedBox(height: 4),
                        Text(
                          'Reserved by: ${c.bookedBy}',
                          style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary),
                        ),
                      ],
                    ],
                  ),
                );
              }),
            ],
            const SizedBox(height: 8),
            const Text(
              'Please adjust your start and end times, or choose an alternate meeting space.',
              style: TextStyle(fontSize: 12, color: AppTheme.textSecondary),
            ),
          ],
        ),
      ),
      actions: [
        ElevatedButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Adjust Time Slot'),
        ),
      ],
    );
  }
}
