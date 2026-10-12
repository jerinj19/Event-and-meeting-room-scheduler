import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/validators.dart';
import '../../data/models/room_model.dart';
import '../../data/models/time_slot_model.dart';
import '../../providers/booking_provider.dart';
import '../../providers/room_provider.dart';
import 'booking_success_screen.dart';
import 'widgets/conflict_alert_dialog.dart';

class BookRoomScreen extends StatefulWidget {
  final RoomModel? preselectedRoom;

  const BookRoomScreen({super.key, this.preselectedRoom});

  @override
  State<BookRoomScreen> createState() => _BookRoomScreenState();
}

class _BookRoomScreenState extends State<BookRoomScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _descriptionController = TextEditingController();

  RoomModel? _selectedRoom;
  late DateTime _selectedDate;
  late TimeOfDay _startTime;
  late TimeOfDay _endTime;
  int _attendeesCount = 1;

  String? _selectedSlotId;
  bool _showCustomTime = false;

  @override
  void initState() {
    super.initState();
    _selectedRoom = widget.preselectedRoom;

    final now = DateTime.now();
    _selectedDate = DateTime(now.year, now.month, now.day);

    // Default to the next clean hour slot
    final nextHour = (now.minute > 30) ? (now.hour + 2) % 24 : (now.hour + 1) % 24;
    _startTime = TimeOfDay(hour: nextHour == 0 ? 9 : nextHour, minute: 0);
    _endTime = TimeOfDay(hour: (_startTime.hour + 1) % 24, minute: 0);

    WidgetsBinding.instance.addPostFrameCallback((_) {
      final roomProvider = Provider.of<RoomProvider>(context, listen: false);
      if (_selectedRoom == null && roomProvider.rooms.isNotEmpty) {
        setState(() {
          _selectedRoom = roomProvider.rooms.firstWhere(
            (r) => r.isActive,
            orElse: () => roomProvider.rooms.first,
          );
        });
      }
      _fetchAvailableSlots();
      _checkAvailability();
    });
  }

  Future<void> _fetchAvailableSlots() async {
    final bookingProvider = Provider.of<BookingProvider>(context, listen: false);
    await bookingProvider.fetchAvailableSlots(
      date: _selectedDate,
      roomId: _selectedRoom?.id,
    );
  }

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  DateTime _getStartDateTime() {
    return DateTime(
      _selectedDate.year,
      _selectedDate.month,
      _selectedDate.day,
      _startTime.hour,
      _startTime.minute,
    );
  }

  DateTime _getEndDateTime() {
    return DateTime(
      _selectedDate.year,
      _selectedDate.month,
      _selectedDate.day,
      _endTime.hour,
      _endTime.minute,
    );
  }

  bool _isPastSlot() {
    final start = _getStartDateTime();
    return start.isBefore(DateTime.now());
  }

  bool _isInvalidTimeRange() {
    final start = _getStartDateTime();
    final end = _getEndDateTime();
    return !end.isAfter(start);
  }

  Future<void> _checkAvailability() async {
    if (_selectedRoom == null) return;
    if (_isInvalidTimeRange()) return;

    final bookingProvider = Provider.of<BookingProvider>(context, listen: false);
    await bookingProvider.checkAvailability(
      roomId: _selectedRoom!.id,
      startTime: _getStartDateTime(),
      endTime: _getEndDateTime(),
    );
  }

  Future<void> _pickDate() async {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);

    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate.isBefore(today) ? today : _selectedDate,
      firstDate: today,
      lastDate: today.add(const Duration(days: 90)),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.light(
              primary: AppTheme.primary,
              onPrimary: Colors.white,
              onSurface: AppTheme.textPrimary,
            ),
          ),
          child: child!,
        );
      },
    );

    if (picked != null) {
      setState(() {
        _selectedDate = picked;
        _selectedSlotId = null;
      });
      _fetchAvailableSlots();
      _checkAvailability();
    }
  }

  Future<void> _pickStartTime() async {
    final picked = await showTimePicker(
      context: context,
      initialTime: _startTime,
    );

    if (picked != null) {
      setState(() {
        _startTime = picked;
        // Auto-adjust end time to +1 hour if end time is now before start
        final startMins = picked.hour * 60 + picked.minute;
        final endMins = _endTime.hour * 60 + _endTime.minute;
        if (endMins <= startMins) {
          final newEndHour = (picked.hour + 1) % 24;
          _endTime = TimeOfDay(hour: newEndHour, minute: picked.minute);
        }
      });
      _checkAvailability();
    }
  }

  Future<void> _pickEndTime() async {
    final picked = await showTimePicker(
      context: context,
      initialTime: _endTime,
    );

    if (picked != null) {
      setState(() {
        _endTime = picked;
      });
      _checkAvailability();
    }
  }

  void _setDurationHours(double hours) {
    final totalMins = (_startTime.hour * 60 + _startTime.minute + (hours * 60).round()) % 1440;
    setState(() {
      _endTime = TimeOfDay(hour: totalMins ~/ 60, minute: totalMins % 60);
    });
    _checkAvailability();
  }

  Future<void> _submitBooking() async {
    if (!_formKey.currentState!.validate()) return;

    if (_selectedRoom == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select a meeting room.')),
      );
      return;
    }

    if (_isPastSlot()) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Cannot book a time slot in the past. Please choose a future time.'),
          backgroundColor: AppTheme.error,
        ),
      );
      return;
    }

    if (_isInvalidTimeRange()) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('End time must be strictly after start time.'),
          backgroundColor: AppTheme.error,
        ),
      );
      return;
    }

    final bookingProvider = Provider.of<BookingProvider>(context, listen: false);

    final booking = await bookingProvider.createBooking(
      roomId: _selectedRoom!.id,
      title: _titleController.text.trim(),
      startTime: _getStartDateTime(),
      endTime: _getEndDateTime(),
      attendeesCount: _attendeesCount,
      description: _descriptionController.text.trim(),
    );

    if (!mounted) return;

    if (booking != null) {
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(
          builder: (_) => BookingSuccessScreen(booking: booking),
        ),
      );
    } else {
      // Check if 409 conflict
      if (bookingProvider.lastConflictDetails.isNotEmpty) {
        showDialog(
          context: context,
          builder: (_) => ConflictAlertDialog(
            roomName: _selectedRoom!.name,
            message: bookingProvider.errorMessage ?? 'Conflict detected',
            conflicts: bookingProvider.lastConflictDetails,
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
    final roomProvider = Provider.of<RoomProvider>(context);
    final bookingProvider = Provider.of<BookingProvider>(context);
    final avail = bookingProvider.availabilityResult;

    final start = _getStartDateTime();
    final end = _getEndDateTime();
    final isInvalidRange = !end.isAfter(start);
    final isPast = start.isBefore(DateTime.now());

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Schedule Meeting Room'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          tooltip: 'Back',
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 720),
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Room Selector
                    const Text(
                      'Select Room',
                      style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppTheme.textPrimary),
                    ),
                    const SizedBox(height: 8),
                    DropdownButtonFormField<RoomModel>(
                      initialValue: _selectedRoom,
                      decoration: const InputDecoration(
                        prefixIcon: Icon(Icons.meeting_room_outlined, color: AppTheme.primary),
                      ),
                      items: roomProvider.rooms.map((r) {
                        return DropdownMenuItem<RoomModel>(
                          value: r,
                          child: Text(
                            '${r.name} (Cap: ${r.capacity})${!r.isActive ? " [Maintenance]" : ""}',
                            overflow: TextOverflow.ellipsis,
                          ),
                        );
                      }).toList(),
                      onChanged: (room) {
                        setState(() {
                          _selectedRoom = room;
                          _selectedSlotId = null;
                          if (_selectedRoom != null && _attendeesCount > _selectedRoom!.capacity) {
                            _attendeesCount = _selectedRoom!.capacity;
                          }
                        });
                        _fetchAvailableSlots();
                        _checkAvailability();
                      },
                    ),
                    if (_selectedRoom != null) ...[
                      const SizedBox(height: 10),
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: AppTheme.surface,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: AppTheme.border),
                        ),
                        child: Row(
                          children: [
                            ClipRRect(
                              borderRadius: BorderRadius.circular(8),
                              child: SizedBox(
                                width: 60,
                                height: 60,
                                child: Image.network(
                                  _selectedRoom!.formattedImageUrl,
                                  fit: BoxFit.cover,
                                  errorBuilder: (c, e, s) => Container(
                                    color: AppTheme.primaryLight,
                                    child: const Icon(Icons.meeting_room_outlined, color: AppTheme.primary),
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    _selectedRoom!.name,
                                    style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: AppTheme.textPrimary),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    '${_selectedRoom!.location} • Max ${_selectedRoom!.capacity} attendees',
                                    style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary),
                                  ),
                                  if (_selectedRoom!.hourlyRate > 0)
                                    Text(
                                      '₹${_selectedRoom!.hourlyRate.toStringAsFixed(0)}/hr',
                                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppTheme.primary),
                                    ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                    const SizedBox(height: 16),

                    // Date Picker Strip (Google Stitch style)
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Schedule Date',
                          style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppTheme.textPrimary),
                        ),
                        TextButton.icon(
                          onPressed: _pickDate,
                          icon: const Icon(Icons.calendar_month_rounded, size: 16, color: AppTheme.primary),
                          label: const Text('All Dates', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                          style: TextButton.styleFrom(
                            padding: EdgeInsets.zero,
                            minimumSize: Size.zero,
                            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    _buildDateStrip(),
                    const SizedBox(height: 16),

                // Real-time Available Time Slots Section
                _buildTimeSlotsSection(bookingProvider),
                const SizedBox(height: 12),

                // Toggle for Custom Time Selection
                InkWell(
                  onTap: () {
                    setState(() {
                      _showCustomTime = !_showCustomTime;
                    });
                  },
                  borderRadius: BorderRadius.circular(10),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    decoration: BoxDecoration(
                      color: _showCustomTime ? AppTheme.primaryLight : AppTheme.surface,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(
                        color: _showCustomTime ? AppTheme.primary.withValues(alpha: 0.3) : AppTheme.border,
                      ),
                    ),
                    child: Row(
                      children: [
                        Icon(
                          _showCustomTime ? Icons.tune_rounded : Icons.schedule_rounded,
                          size: 16,
                          color: AppTheme.primary,
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            _showCustomTime
                                ? 'Hide Custom Start & End Hours'
                                : 'Or Specify Custom Hours (${_startTime.format(context)} – ${_endTime.format(context)})',
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: AppTheme.primary,
                            ),
                          ),
                        ),
                        Icon(
                          _showCustomTime ? Icons.expand_less_rounded : Icons.expand_more_rounded,
                          size: 18,
                          color: AppTheme.primary,
                        ),
                      ],
                    ),
                  ),
                ),

                if (_showCustomTime) ...[
                  const SizedBox(height: 12),
                  // Start & End Time Pickers
                  Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Start Time',
                              style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppTheme.textPrimary),
                            ),
                            const SizedBox(height: 8),
                            InkWell(
                              onTap: _pickStartTime,
                              borderRadius: BorderRadius.circular(12),
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                                decoration: BoxDecoration(
                                  color: AppTheme.surface,
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(color: isPast ? AppTheme.error : AppTheme.border),
                                ),
                                child: Row(
                                  children: [
                                    Icon(Icons.schedule, color: isPast ? AppTheme.error : AppTheme.primary, size: 18),
                                    const SizedBox(width: 8),
                                    Text(
                                      _startTime.format(context),
                                      style: TextStyle(
                                        fontSize: 14,
                                        fontWeight: FontWeight.w700,
                                        color: isPast ? AppTheme.error : AppTheme.textPrimary,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'End Time',
                              style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppTheme.textPrimary),
                            ),
                            const SizedBox(height: 8),
                            InkWell(
                              onTap: _pickEndTime,
                              borderRadius: BorderRadius.circular(12),
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                                decoration: BoxDecoration(
                                  color: AppTheme.surface,
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(color: isInvalidRange ? AppTheme.error : AppTheme.border),
                                ),
                                child: Row(
                                  children: [
                                    Icon(Icons.schedule, color: isInvalidRange ? AppTheme.error : AppTheme.accent, size: 18),
                                    const SizedBox(width: 8),
                                    Text(
                                      _endTime.format(context),
                                      style: TextStyle(
                                        fontSize: 14,
                                        fontWeight: FontWeight.w700,
                                        color: isInvalidRange ? AppTheme.error : AppTheme.textPrimary,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),

                  // Quick Duration Shortcuts
                  Row(
                    children: [
                      const Text('Duration: ', style: TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
                      const SizedBox(width: 4),
                      Wrap(
                        spacing: 6,
                        children: [
                          _buildDurationChip('30m', 0.5),
                          _buildDurationChip('1h', 1.0),
                          _buildDurationChip('1.5h', 1.5),
                          _buildDurationChip('2h', 2.0),
                        ],
                      ),
                    ],
                  ),
                ],
                const SizedBox(height: 16),

                // Live Availability Status Banner
                if (bookingProvider.isCheckingAvailability)
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppTheme.surface,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppTheme.border),
                    ),
                    child: const Row(
                      children: [
                        SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        ),
                        SizedBox(width: 10),
                        Text(
                          'Checking slot availability...',
                          style: TextStyle(fontSize: 12, color: AppTheme.textSecondary),
                        ),
                      ],
                    ),
                  )
                else if (isPast)
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppTheme.errorLight,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppTheme.error.withValues(alpha: 0.3)),
                    ),
                    child: const Row(
                      children: [
                        Icon(Icons.history_toggle_off_rounded, color: AppTheme.error, size: 20),
                        SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'Past time selected: Please choose a future start time.',
                            style: TextStyle(fontSize: 12, color: AppTheme.error, fontWeight: FontWeight.w600),
                          ),
                        ),
                      ],
                    ),
                  )
                else if (isInvalidRange)
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppTheme.errorLight,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppTheme.error.withValues(alpha: 0.3)),
                    ),
                    child: const Row(
                      children: [
                        Icon(Icons.error_outline_rounded, color: AppTheme.error, size: 20),
                        SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'End time must be after start time.',
                            style: TextStyle(fontSize: 12, color: AppTheme.error, fontWeight: FontWeight.w600),
                          ),
                        ),
                      ],
                    ),
                  )
                else if (avail != null)
                  avail.isAvailable
                      ? Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: AppTheme.successLight,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: AppTheme.success.withValues(alpha: 0.3)),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.check_circle_rounded, color: AppTheme.success, size: 20),
                              const SizedBox(width: 8),
                              const Expanded(
                                child: Text(
                                  'Slot is available! No conflicts detected.',
                                  style: TextStyle(fontSize: 12, color: AppTheme.success, fontWeight: FontWeight.w700),
                                ),
                              ),
                            ],
                          ),
                        )
                      : Container(
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: const Color(0xFFFFDAD6),
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(color: const Color(0xFFFFB4AB)),
                          ),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Container(
                                width: 34,
                                height: 34,
                                decoration: BoxDecoration(
                                  color: const Color(0xFFBA1A1A),
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: const Icon(Icons.warning_amber_rounded, color: Colors.white, size: 20),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      children: [
                                        const Text(
                                          'Slot Conflict Detected (HTTP 409)',
                                          style: TextStyle(
                                            fontSize: 13,
                                            fontWeight: FontWeight.w800,
                                            color: Color(0xFF410002),
                                          ),
                                        ),
                                        const SizedBox(width: 6),
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                          decoration: BoxDecoration(
                                            color: const Color(0xFFF87171).withValues(alpha: 0.35),
                                            borderRadius: BorderRadius.circular(4),
                                          ),
                                          child: const Text(
                                            'LOCKED',
                                            style: TextStyle(
                                              fontSize: 9,
                                              fontWeight: FontWeight.w800,
                                              color: Color(0xFF410002),
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      'Room is occupied for this timeframe (${avail.conflicts.length} overlapping booking).',
                                      style: const TextStyle(fontSize: 12, color: Color(0xFF680006)),
                                    ),
                                    if (avail.conflicts.isNotEmpty) ...[
                                      const SizedBox(height: 4),
                                      Text(
                                        'Conflicting: "${avail.conflicts.first.title}" (${avail.conflicts.first.timeInterval})',
                                        style: const TextStyle(
                                          fontSize: 11,
                                          fontWeight: FontWeight.w700,
                                          color: Color(0xFF410002),
                                        ),
                                      ),
                                    ],
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                const SizedBox(height: 20),

                // Meeting Title
                TextFormField(
                  controller: _titleController,
                  textInputAction: TextInputAction.next,
                  decoration: const InputDecoration(
                    labelText: 'Meeting Title / Purpose',
                    hintText: 'e.g. Q3 Sprint Planning & Retro',
                    prefixIcon: Icon(Icons.title_rounded, color: AppTheme.textSecondary),
                  ),
                  validator: (val) => Validators.requiredField(val, 'Meeting title'),
                ),
                const SizedBox(height: 16),

                // Attendees Count Stepper
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Expected Attendees',
                            style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppTheme.textPrimary),
                          ),
                          if (_selectedRoom != null)
                            Text(
                              'Room max capacity: ${_selectedRoom!.capacity}',
                              style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary),
                              overflow: TextOverflow.ellipsis,
                            ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    Row(
                      children: [
                        IconButton.filledTonal(
                          icon: const Icon(Icons.remove, size: 18),
                          onPressed: _attendeesCount > 1
                              ? () {
                                  setState(() {
                                    _attendeesCount--;
                                  });
                                }
                              : null,
                        ),
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 14),
                          child: Text(
                            _attendeesCount.toString(),
                            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
                          ),
                        ),
                        IconButton.filledTonal(
                          icon: const Icon(Icons.add, size: 18),
                          onPressed: (_selectedRoom == null || _attendeesCount < _selectedRoom!.capacity)
                              ? () {
                                  setState(() {
                                    _attendeesCount++;
                                  });
                                }
                              : null,
                        ),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 16),

                // Meeting Description
                TextFormField(
                  controller: _descriptionController,
                  maxLines: 3,
                  textInputAction: TextInputAction.done,
                  decoration: const InputDecoration(
                    labelText: 'Agenda / Meeting Notes (Optional)',
                    hintText: 'Discuss quarterly milestone alignment and team tasks...',
                    prefixIcon: Icon(Icons.notes_rounded, color: AppTheme.textSecondary),
                  ),
                ),
                const SizedBox(height: 28),

                // Submit Button
                ElevatedButton(
                  onPressed: bookingProvider.isSubmitting ? null : _submitBooking,
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                  ),
                  child: bookingProvider.isSubmitting
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                          ),
                        )
                      : const Text(
                          'Confirm & Book Space',
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
                        ),
                ),
                const SizedBox(height: 24),
              ],
            ),
          ),
        ),
      ),
    ),
  ),
);
  }

  Widget _buildDateStrip() {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final days = List.generate(5, (index) => today.add(Duration(days: index)));

    final isCustomDateSelected = !days.any(
      (d) => d.year == _selectedDate.year && d.month == _selectedDate.month && d.day == _selectedDate.day,
    );

    return SizedBox(
      height: 72,
      child: ListView(
        scrollDirection: Axis.horizontal,
        children: [
          ...days.map((date) {
            final isSelected = date.year == _selectedDate.year &&
                date.month == _selectedDate.month &&
                date.day == _selectedDate.day;
            final isToday = date.difference(today).inDays == 0;
            final isTomorrow = date.difference(today).inDays == 1;

            String dayLabel = isToday ? 'Today' : (isTomorrow ? 'Tomorrow' : DateFormat('EEE').format(date));
            String dateLabel = DateFormat('MMM d').format(date);

            return Padding(
              padding: const EdgeInsets.only(right: 8),
              child: InkWell(
                onTap: () {
                  setState(() {
                    _selectedDate = date;
                    _selectedSlotId = null;
                  });
                  _fetchAvailableSlots();
                  _checkAvailability();
                },
                borderRadius: BorderRadius.circular(12),
                child: Container(
                  width: 82,
                  padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 6),
                  decoration: BoxDecoration(
                    color: isSelected ? AppTheme.primary : AppTheme.surface,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: isSelected ? AppTheme.primary : AppTheme.border,
                      width: isSelected ? 1.5 : 1,
                    ),
                    boxShadow: isSelected
                        ? [
                            BoxShadow(
                              color: AppTheme.primary.withValues(alpha: 0.25),
                              blurRadius: 8,
                              offset: const Offset(0, 3),
                            ),
                          ]
                        : null,
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        dayLabel,
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: isSelected ? FontWeight.w700 : FontWeight.w600,
                          color: isSelected ? Colors.white : AppTheme.textSecondary,
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        dateLabel,
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w800,
                          color: isSelected ? Colors.white : AppTheme.textPrimary,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            );
          }),
          if (isCustomDateSelected)
            Padding(
              padding: const EdgeInsets.only(right: 8),
              child: Container(
                width: 90,
                padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 6),
                decoration: BoxDecoration(
                  color: AppTheme.primary,
                  borderRadius: BorderRadius.circular(12),
                  boxShadow: [
                    BoxShadow(
                      color: AppTheme.primary.withValues(alpha: 0.25),
                      blurRadius: 8,
                      offset: const Offset(0, 3),
                    ),
                  ],
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Text(
                      'Custom',
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Colors.white),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      DateFormat('MMM d').format(_selectedDate),
                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: Colors.white),
                    ),
                  ],
                ),
              ),
            ),
          InkWell(
            onTap: _pickDate,
            borderRadius: BorderRadius.circular(12),
            child: Container(
              width: 54,
              decoration: BoxDecoration(
                color: AppTheme.surface,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppTheme.border),
              ),
              child: const Center(
                child: Icon(Icons.calendar_month_outlined, color: AppTheme.textSecondary, size: 20),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDurationChip(String label, double hours) {
    return InkWell(
      onTap: () => _setDurationHours(hours),
      borderRadius: BorderRadius.circular(6),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
        decoration: BoxDecoration(
          color: AppTheme.primaryLight,
          borderRadius: BorderRadius.circular(6),
          border: Border.all(color: AppTheme.primary.withValues(alpha: 0.2)),
        ),
        child: Text(
          label,
          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppTheme.primary),
        ),
      ),
    );
  }

  Widget _buildTimeSlotsSection(BookingProvider bookingProvider) {
    final slots = bookingProvider.availableSlots;
    final isLoading = bookingProvider.isLoadingSlots;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: AppTheme.primaryLight,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(Icons.schedule_rounded, color: AppTheme.primary, size: 18),
              ),
              const SizedBox(width: 10),
              const Expanded(
                child: Text(
                  'Available Time Slots',
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: AppTheme.textPrimary,
                  ),
                ),
              ),
              if (isLoading)
                const SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.primary),
                )
              else if (slots.isNotEmpty)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: AppTheme.successLight,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    '${slots.where((s) => s.isSelectable).length} Open',
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: AppTheme.success,
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 14),

          if (isLoading)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 20),
              child: Center(
                child: Column(
                  children: [
                    CircularProgressIndicator(strokeWidth: 2, color: AppTheme.primary),
                    SizedBox(height: 10),
                    Text(
                      'Checking real-time slot availability...',
                      style: TextStyle(fontSize: 12, color: AppTheme.textSecondary),
                    ),
                  ],
                ),
              ),
            )
          else if (slots.isEmpty)
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppTheme.background,
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Row(
                children: [
                  Icon(Icons.info_outline, color: AppTheme.textMuted, size: 18),
                  SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'No predefined slots found for this date. You can specify custom hours below.',
                      style: TextStyle(fontSize: 12, color: AppTheme.textSecondary),
                    ),
                  ),
                ],
              ),
            )
          else ...[
            _buildSlotGroup(
              'Morning Slots',
              Icons.wb_sunny_outlined,
              slots.where((s) => s.period.toLowerCase() == 'morning').toList(),
            ),
            const SizedBox(height: 12),
            _buildSlotGroup(
              'Afternoon Slots',
              Icons.wb_twilight_rounded,
              slots.where((s) => s.period.toLowerCase() == 'afternoon').toList(),
            ),
            const SizedBox(height: 12),
            _buildSlotGroup(
              'Evening Slots',
              Icons.nightlight_outlined,
              slots.where((s) => s.period.toLowerCase() == 'evening').toList(),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildSlotGroup(String title, IconData icon, List<TimeSlotModel> groupSlots) {
    if (groupSlots.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(icon, size: 14, color: AppTheme.textSecondary),
            const SizedBox(width: 6),
            Text(
              title,
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: AppTheme.textSecondary,
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: groupSlots.map((slot) => _buildSlotCard(slot)).toList(),
        ),
      ],
    );
  }

  Widget _buildSlotCard(TimeSlotModel slot) {
    final isSelected = _selectedSlotId == slot.id ||
        (_startTime.hour == slot.startHour &&
            _startTime.minute == slot.startMinute &&
            _endTime.hour == slot.endHour &&
            _endTime.minute == slot.endMinute);

    final isBooked = slot.isBooked;
    final isPast = slot.isPast;
    final isSelectable = slot.isSelectable;

    Color bgColor = AppTheme.surface;
    Color borderColor = AppTheme.border;
    Color textColor = AppTheme.textPrimary;

    if (isSelected) {
      bgColor = AppTheme.primary;
      borderColor = AppTheme.primary;
      textColor = Colors.white;
    } else if (isBooked) {
      bgColor = AppTheme.errorLight;
      borderColor = AppTheme.error.withValues(alpha: 0.3);
      textColor = AppTheme.error;
    } else if (isPast) {
      bgColor = AppTheme.borderSubtle;
      borderColor = AppTheme.border;
      textColor = AppTheme.textMuted;
    }

    return InkWell(
      onTap: isSelectable
          ? () {
              setState(() {
                _selectedSlotId = slot.id;
                _startTime = TimeOfDay(hour: slot.startHour, minute: slot.startMinute);
                _endTime = TimeOfDay(hour: slot.endHour, minute: slot.endMinute);
              });
              _checkAvailability();
            }
          : null,
      borderRadius: BorderRadius.circular(10),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
        decoration: BoxDecoration(
          color: bgColor,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: borderColor, width: isSelected ? 1.5 : 1),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: AppTheme.primary.withValues(alpha: 0.25),
                    blurRadius: 6,
                    offset: const Offset(0, 2),
                  ),
                ]
              : null,
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (isSelected) ...[
              const Icon(Icons.check_circle_rounded, color: Colors.white, size: 14),
              const SizedBox(width: 6),
            ],
            Text(
              slot.label,
              style: TextStyle(
                fontSize: 12,
                fontWeight: isSelected ? FontWeight.w700 : FontWeight.w600,
                color: textColor,
              ),
            ),
            const SizedBox(width: 6),
            if (isBooked)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                decoration: BoxDecoration(
                  color: AppTheme.error,
                  borderRadius: BorderRadius.circular(4),
                ),
                child: const Text(
                  'Booked',
                  style: TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: Colors.white),
                ),
              )
            else if (isPast)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                decoration: BoxDecoration(
                  color: AppTheme.textMuted,
                  borderRadius: BorderRadius.circular(4),
                ),
                child: const Text(
                  'Past',
                  style: TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: Colors.white),
                ),
              )
            else
              Text(
                '(${slot.duration})',
                style: TextStyle(
                  fontSize: 10,
                  color: isSelected ? Colors.white.withValues(alpha: 0.8) : AppTheme.textMuted,
                ),
              ),
          ],
        ),
      ),
    );
  }
}
