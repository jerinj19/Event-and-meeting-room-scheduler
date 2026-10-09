import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';
import '../../../data/models/room_model.dart';
import '../../../data/models/time_slot_model.dart';

class AdminTimeSlotModal extends StatefulWidget {
  final TimeSlotModel? slot;
  final List<RoomModel> rooms;
  final Future<void> Function(Map<String, dynamic> payload) onSave;

  const AdminTimeSlotModal({
    super.key,
    this.slot,
    required this.rooms,
    required this.onSave,
  });

  @override
  State<AdminTimeSlotModal> createState() => _AdminTimeSlotModalState();
}

class _AdminTimeSlotModalState extends State<AdminTimeSlotModal> {
  late bool isEditMode;

  final _labelController = TextEditingController();
  final _sortOrderController = TextEditingController(text: '0');

  String _startTime = '09:00';
  String _endTime = '10:00';
  String _period = 'auto'; // auto | morning | afternoon | evening
  String _scheduleType = 'recurring'; // recurring | specific
  List<String> _selectedDates = [];
  String _scopeType = 'global'; // global | multiple
  List<String> _selectedRoomIds = [];
  bool _isActive = true;
  bool _isSaving = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    isEditMode = widget.slot != null;

    if (widget.slot != null) {
      final s = widget.slot!;
      _labelController.text = s.label;
      final st = s.startTime ?? s.start;
      final et = s.endTime ?? s.end;
      _startTime = st.length >= 5 ? st.substring(0, 5) : '09:00';
      _endTime = et.length >= 5 ? et.substring(0, 5) : '10:00';
      _period = s.period.isNotEmpty ? s.period.toLowerCase() : 'morning';

      if (s.date != null && s.date!.isNotEmpty) {
        _scheduleType = 'specific';
        _selectedDates = [s.date!];
      } else {
        _scheduleType = 'recurring';
        _selectedDates = [];
      }

      if (s.room != null && s.room!.isNotEmpty) {
        _scopeType = 'multiple';
        _selectedRoomIds = [s.room!];
      } else {
        _scopeType = 'global';
        _selectedRoomIds = [];
      }

      _isActive = s.isActive;
      _sortOrderController.text = s.sortOrder.toString();
    } else {
      _scheduleType = 'recurring';
      _selectedDates = [];
      _scopeType = 'global';
      _selectedRoomIds = [];
      _isActive = true;
      _sortOrderController.text = '0';
    }
  }

  @override
  void dispose() {
    _labelController.dispose();
    _sortOrderController.dispose();
    super.dispose();
  }

  int get _calculatedDurationMinutes {
    final sParts = _startTime.split(':');
    final eParts = _endTime.split(':');
    if (sParts.length < 2 || eParts.length < 2) return 0;
    final sMin = (int.tryParse(sParts[0]) ?? 0) * 60 + (int.tryParse(sParts[1]) ?? 0);
    final eMin = (int.tryParse(eParts[0]) ?? 0) * 60 + (int.tryParse(eParts[1]) ?? 0);
    return eMin - sMin;
  }

  String get _computedPeriod {
    if (_period != 'auto') return _period;
    final sParts = _startTime.split(':');
    final sh = int.tryParse(sParts[0]) ?? 9;
    if (sh < 12) return 'morning';
    if (sh < 17) return 'afternoon';
    return 'evening';
  }

  String _formatTime12h(String time24) {
    if (time24.isEmpty) return '';
    final parts = time24.split(':');
    final h = int.tryParse(parts[0]) ?? 0;
    final m = parts.length > 1 ? parts[1] : '00';
    final ampm = h >= 12 ? 'PM' : 'AM';
    final h12 = h % 12 == 0 ? 12 : h % 12;
    return '${h12.toString().padLeft(2, '0')}:$m $ampm';
  }

  String get _previewLabel {
    final custom = _labelController.text.trim();
    if (custom.isNotEmpty) return custom;
    return '${_formatTime12h(_startTime)} – ${_formatTime12h(_endTime)}';
  }

  Future<void> _pickTime({required bool isStart}) async {
    final current = isStart ? _startTime : _endTime;
    final parts = current.split(':');
    final initial = TimeOfDay(
      hour: int.tryParse(parts[0]) ?? 9,
      minute: int.tryParse(parts.length > 1 ? parts[1] : '0') ?? 0,
    );

    final picked = await showTimePicker(
      context: context,
      initialTime: initial,
    );

    if (picked != null) {
      final formatted =
          '${picked.hour.toString().padLeft(2, '0')}:${picked.minute.toString().padLeft(2, '0')}';
      setState(() {
        if (isStart) {
          _startTime = formatted;
        } else {
          _endTime = formatted;
        }
      });
    }
  }

  void _addDays(int count) {
    final now = DateTime.now();
    final newDates = List<String>.from(_selectedDates);
    for (int i = 0; i < count; i++) {
      final d = now.add(Duration(days: i));
      final s =
          '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';
      if (!newDates.contains(s)) {
        newDates.add(s);
      }
    }
    newDates.sort();
    setState(() {
      _selectedDates = newDates;
    });
  }

  Future<void> _pickDateAndAdd() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: DateTime.now(),
      firstDate: DateTime.now().subtract(const Duration(days: 30)),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );

    if (picked != null) {
      final s =
          '${picked.year}-${picked.month.toString().padLeft(2, '0')}-${picked.day.toString().padLeft(2, '0')}';
      if (!_selectedDates.contains(s)) {
        setState(() {
          _selectedDates = [..._selectedDates, s]..sort();
        });
      }
    }
  }

  Future<void> _handleSubmit() async {
    setState(() => _errorMessage = null);

    if (_calculatedDurationMinutes <= 0) {
      setState(() => _errorMessage = 'End time must be later than start time.');
      return;
    }

    if (_scheduleType == 'specific' && _selectedDates.isEmpty) {
      setState(() => _errorMessage =
          'Please select at least one calendar date or choose Every Day (Daily).');
      return;
    }

    if (_scopeType == 'multiple' && _selectedRoomIds.isEmpty) {
      setState(() => _errorMessage =
          'Please select at least one room or switch to Global scope.');
      return;
    }

    setState(() => _isSaving = true);

    try {
      final targetDate = _scheduleType == 'specific' && _selectedDates.isNotEmpty
          ? _selectedDates.first
          : null;

      final payload = <String, dynamic>{
        'label': _labelController.text.trim(),
        'start_time': _startTime.length == 5 ? '$_startTime:00' : _startTime,
        'end_time': _endTime.length == 5 ? '$_endTime:00' : _endTime,
        'period': _computedPeriod,
        'room': _scopeType == 'global' ? null : (_selectedRoomIds.isNotEmpty ? _selectedRoomIds.first : null),
        'date': targetDate,
        'is_active': _isActive,
        'sort_order': int.tryParse(_sortOrderController.text) ?? 0,
      };

      if (!isEditMode) {
        payload['dates'] = _scheduleType == 'specific' ? _selectedDates : [null];
        payload['room_ids'] = _scopeType == 'multiple' ? _selectedRoomIds : [];
      }

      await widget.onSave(payload);
      if (mounted) {
        Navigator.of(context).pop();
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = e.toString();
          _isSaving = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final duration = _calculatedDurationMinutes;

    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      backgroundColor: Colors.white,
      insetPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 540, maxHeight: 780),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // 1. Header (Image 4)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 18),
              decoration: const BoxDecoration(
                border: Border(bottom: BorderSide(color: Color(0xFFF1F5F9))),
              ),
              child: Row(
                children: [
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: AppTheme.primary.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(
                      Icons.schedule_rounded,
                      color: AppTheme.primary,
                      size: 22,
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          isEditMode ? 'Edit Time Slot' : 'Add New Time Slot',
                          style: const TextStyle(
                            fontFamily: 'Inter',
                            fontSize: 17,
                            fontWeight: FontWeight.w700,
                            color: Color(0xFF0F172A),
                          ),
                        ),
                        const SizedBox(height: 2),
                        const Text(
                          'Configure start, end, category, and room applicability.',
                          style: TextStyle(
                            fontFamily: 'Inter',
                            fontSize: 12,
                            color: Color(0xFF64748B),
                          ),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    onPressed: () => Navigator.of(context).pop(),
                    icon: const Icon(Icons.close_rounded, size: 20, color: Color(0xFF64748B)),
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                  ),
                ],
              ),
            ),

            // 2. Scrollable Form Content
            Flexible(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (_errorMessage != null) ...[
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFEF2F2),
                          border: Border.all(color: const Color(0xFFFECACA)),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.error_outline_rounded, size: 18, color: Color(0xFFDC2626)),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Text(
                                _errorMessage!,
                                style: const TextStyle(
                                  fontFamily: 'Inter',
                                  fontSize: 12,
                                  color: Color(0xFFDC2626),
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),
                    ],

                    // Times: Start Time * & End Time *
                    Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: const [
                                  Text(
                                    'Start Time',
                                    style: TextStyle(
                                      fontFamily: 'Inter',
                                      fontSize: 12,
                                      fontWeight: FontWeight.w600,
                                      color: Color(0xFF475569),
                                    ),
                                  ),
                                  Text(' *', style: TextStyle(color: Color(0xFFDC2626))),
                                ],
                              ),
                              const SizedBox(height: 6),
                              InkWell(
                                onTap: () => _pickTime(isStart: true),
                                borderRadius: BorderRadius.circular(12),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFF8FAFC),
                                    border: Border.all(color: const Color(0xFFE2E8F0)),
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text(
                                        _startTime,
                                        style: const TextStyle(
                                          fontFamily: 'Inter',
                                          fontSize: 14,
                                          fontWeight: FontWeight.w600,
                                          color: Color(0xFF0F172A),
                                        ),
                                      ),
                                      const Icon(
                                        Icons.access_time_rounded,
                                        size: 18,
                                        color: Color(0xFF64748B),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: const [
                                  Text(
                                    'End Time',
                                    style: TextStyle(
                                      fontFamily: 'Inter',
                                      fontSize: 12,
                                      fontWeight: FontWeight.w600,
                                      color: Color(0xFF475569),
                                    ),
                                  ),
                                  Text(' *', style: TextStyle(color: Color(0xFFDC2626))),
                                ],
                              ),
                              const SizedBox(height: 6),
                              InkWell(
                                onTap: () => _pickTime(isStart: false),
                                borderRadius: BorderRadius.circular(12),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFF8FAFC),
                                    border: Border.all(color: const Color(0xFFE2E8F0)),
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text(
                                        _endTime,
                                        style: const TextStyle(
                                          fontFamily: 'Inter',
                                          fontSize: 14,
                                          fontWeight: FontWeight.w600,
                                          color: Color(0xFF0F172A),
                                        ),
                                      ),
                                      const Icon(
                                        Icons.access_time_rounded,
                                        size: 18,
                                        color: Color(0xFF64748B),
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
                    const SizedBox(height: 12),

                    // Computed Duration Banner (Image 4)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
                      decoration: BoxDecoration(
                        color: const Color(0xFFEFF6FF),
                        border: Border.all(color: const Color(0xFFDBEAFE)),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            'Computed Duration:',
                            style: TextStyle(
                              fontFamily: 'Inter',
                              fontSize: 12,
                              fontWeight: FontWeight.w500,
                              color: Color(0xFF475569),
                            ),
                          ),
                          Text(
                            duration > 0
                                ? '$duration minutes (${(duration / 60).toStringAsFixed(1)} hrs)'
                                : 'Invalid (End <= Start)',
                            style: TextStyle(
                              fontFamily: 'Inter',
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                              color: duration > 0 ? AppTheme.primary : const Color(0xFFDC2626),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Display Label (Optional)
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: const [
                        Text(
                          'Display Label (Optional)',
                          style: TextStyle(
                            fontFamily: 'Inter',
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: Color(0xFF475569),
                          ),
                        ),
                        Text(
                          'Leave blank for automatic formatting',
                          style: TextStyle(
                            fontFamily: 'Inter',
                            fontSize: 11,
                            color: Color(0xFF94A3B8),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    TextField(
                      controller: _labelController,
                      onChanged: (_) => setState(() {}),
                      decoration: InputDecoration(
                        hintText: 'e.g. ${_formatTime12h(_startTime)} – ${_formatTime12h(_endTime)}',
                        hintStyle: const TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
                        filled: true,
                        fillColor: const Color(0xFFF8FAFC),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: const BorderSide(color: AppTheme.primary),
                        ),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      ),
                      style: const TextStyle(fontFamily: 'Inter', fontSize: 13),
                    ),
                    const SizedBox(height: 16),

                    // Session / Time Category
                    const Text(
                      'Session / Time Category',
                      style: TextStyle(
                        fontFamily: 'Inter',
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF475569),
                      ),
                    ),
                    const SizedBox(height: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF8FAFC),
                        border: Border.all(color: const Color(0xFFE2E8F0)),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: DropdownButtonHideUnderline(
                        child: DropdownButton<String>(
                          value: _period,
                          isExpanded: true,
                          style: const TextStyle(
                            fontFamily: 'Inter',
                            fontSize: 13,
                            color: Color(0xFF0F172A),
                          ),
                          items: [
                            DropdownMenuItem(
                              value: 'auto',
                              child: Text('Auto-Detect ($_computedPeriod)'),
                            ),
                            const DropdownMenuItem(
                              value: 'morning',
                              child: Text('Morning (Before 12:00 PM)'),
                            ),
                            const DropdownMenuItem(
                              value: 'afternoon',
                              child: Text('Afternoon (12:00 – 05:00 PM)'),
                            ),
                            const DropdownMenuItem(
                              value: 'evening',
                              child: Text('Evening (After 05:00 PM)'),
                            ),
                          ],
                          onChanged: (val) {
                            if (val != null) setState(() => _period = val);
                          },
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Date Applicability * (Image 4: Two Choice Cards)
                    Row(
                      children: const [
                        Text(
                          'Date Applicability',
                          style: TextStyle(
                            fontFamily: 'Inter',
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: Color(0xFF475569),
                          ),
                        ),
                        Text(' *', style: TextStyle(color: Color(0xFFDC2626))),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        // Card 1: Every Day (Daily)
                        Expanded(
                          child: InkWell(
                            onTap: () {
                              setState(() {
                                _scheduleType = 'recurring';
                                _selectedDates = [];
                              });
                            },
                            borderRadius: BorderRadius.circular(12),
                            child: Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: _scheduleType == 'recurring'
                                    ? AppTheme.primary.withValues(alpha: 0.08)
                                    : const Color(0xFFF8FAFC),
                                border: Border.all(
                                  color: _scheduleType == 'recurring'
                                      ? AppTheme.primary
                                      : const Color(0xFFE2E8F0),
                                  width: _scheduleType == 'recurring' ? 1.5 : 1,
                                ),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Row(
                                children: [
                                  Icon(
                                    Icons.repeat_rounded,
                                    size: 20,
                                    color: _scheduleType == 'recurring'
                                        ? AppTheme.primary
                                        : const Color(0xFF64748B),
                                  ),
                                  const SizedBox(width: 10),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          'Every Day (Daily)',
                                          style: TextStyle(
                                            fontFamily: 'Inter',
                                            fontSize: 12,
                                            fontWeight: FontWeight.w700,
                                            color: _scheduleType == 'recurring'
                                                ? AppTheme.primary
                                                : const Color(0xFF1E293B),
                                          ),
                                        ),
                                        const Text(
                                          'Active for all dates',
                                          style: TextStyle(
                                            fontFamily: 'Inter',
                                            fontSize: 10,
                                            color: Color(0xFF64748B),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),

                        // Card 2: Specific Date(s)
                        Expanded(
                          child: InkWell(
                            onTap: () {
                              setState(() {
                                _scheduleType = 'specific';
                                if (_selectedDates.isEmpty) {
                                  final now = DateTime.now();
                                  _selectedDates = [
                                    '${now.year}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}'
                                  ];
                                }
                              });
                            },
                            borderRadius: BorderRadius.circular(12),
                            child: Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: _scheduleType == 'specific'
                                    ? AppTheme.primary.withValues(alpha: 0.08)
                                    : const Color(0xFFF8FAFC),
                                border: Border.all(
                                  color: _scheduleType == 'specific'
                                      ? AppTheme.primary
                                      : const Color(0xFFE2E8F0),
                                  width: _scheduleType == 'specific' ? 1.5 : 1,
                                ),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Row(
                                children: [
                                  Icon(
                                    Icons.calendar_month_rounded,
                                    size: 20,
                                    color: _scheduleType == 'specific'
                                        ? AppTheme.primary
                                        : const Color(0xFF64748B),
                                  ),
                                  const SizedBox(width: 10),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          'Specific Date(s)',
                                          style: TextStyle(
                                            fontFamily: 'Inter',
                                            fontSize: 12,
                                            fontWeight: FontWeight.w700,
                                            color: _scheduleType == 'specific'
                                                ? AppTheme.primary
                                                : const Color(0xFF1E293B),
                                          ),
                                        ),
                                        const Text(
                                          'Target single or multiple days',
                                          style: TextStyle(
                                            fontFamily: 'Inter',
                                            fontSize: 10,
                                            color: Color(0xFF64748B),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),

                    // Info banner for recurring or date picker list for specific
                    if (_scheduleType == 'recurring') ...[
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                        decoration: BoxDecoration(
                          color: const Color(0xFFEFF6FF),
                          border: Border.all(color: const Color(0xFFDBEAFE)),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Row(
                          children: const [
                            Icon(Icons.info_outline_rounded, size: 18, color: Color(0xFF3B82F6)),
                            SizedBox(width: 10),
                            Expanded(
                              child: Text(
                                'This slot will recur on every calendar date (today, tomorrow, or any selected day).',
                                style: TextStyle(
                                  fontFamily: 'Inter',
                                  fontSize: 11,
                                  color: Color(0xFF1E40AF),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ] else ...[
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF8FAFC),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Wrap(
                              spacing: 6,
                              runSpacing: 6,
                              crossAxisAlignment: WrapCrossAlignment.center,
                              children: [
                                OutlinedButton.icon(
                                  onPressed: _pickDateAndAdd,
                                  icon: const Icon(Icons.add_rounded, size: 14),
                                  label: const Text('+ Add Date'),
                                  style: OutlinedButton.styleFrom(
                                    foregroundColor: AppTheme.primary,
                                    side: const BorderSide(color: Color(0xFF93C5FD)),
                                    backgroundColor: const Color(0xFFEFF6FF),
                                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                                    textStyle: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600),
                                  ),
                                ),
                                _buildQuickDateBtn('Today', () => _addDays(1)),
                                _buildQuickDateBtn('Tomorrow', () {
                                  final d = DateTime.now().add(const Duration(days: 1));
                                  final s =
                                      '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';
                                  if (!_selectedDates.contains(s)) {
                                    setState(() => _selectedDates = [..._selectedDates, s]..sort());
                                  }
                                }),
                                _buildQuickDateBtn('+ Next 7 Days', () => _addDays(7)),
                                _buildQuickDateBtn('+ Next 14 Days', () => _addDays(14)),
                                _buildQuickDateBtn('+ Next Month', () => _addDays(30)),
                                if (_selectedDates.isNotEmpty)
                                  TextButton(
                                    onPressed: () => setState(() => _selectedDates = []),
                                    child: const Text('Clear', style: TextStyle(color: Color(0xFFDC2626), fontSize: 11)),
                                  ),
                              ],
                            ),
                            if (_selectedDates.isNotEmpty) ...[
                              const SizedBox(height: 10),
                              Wrap(
                                spacing: 6,
                                runSpacing: 6,
                                children: _selectedDates.map((dStr) {
                                  return Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                    decoration: BoxDecoration(
                                      color: Colors.white,
                                      border: Border.all(color: const Color(0xFF93C5FD)),
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Text(
                                          '📅 $dStr',
                                          style: const TextStyle(
                                            fontFamily: 'Inter',
                                            fontSize: 11,
                                            fontWeight: FontWeight.w600,
                                            color: AppTheme.primary,
                                          ),
                                        ),
                                        const SizedBox(width: 6),
                                        InkWell(
                                          onTap: () {
                                            setState(() {
                                              _selectedDates.remove(dStr);
                                            });
                                          },
                                          child: const Icon(Icons.close_rounded, size: 14, color: Color(0xFF64748B)),
                                        ),
                                      ],
                                    ),
                                  );
                                }).toList(),
                              ),
                            ],
                          ],
                        ),
                      ),
                    ],
                    const SizedBox(height: 16),

                    // Applicable Room Scope (Image 4)
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Applicable Room Scope',
                          style: TextStyle(
                            fontFamily: 'Inter',
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: Color(0xFF475569),
                          ),
                        ),
                        Text(
                          _scopeType == 'global'
                              ? '🌐 Applies globally to all rooms'
                              : '📍 ${_selectedRoomIds.length} room${_selectedRoomIds.length == 1 ? '' : 's'} selected',
                          style: const TextStyle(
                            fontFamily: 'Inter',
                            fontSize: 11,
                            color: Color(0xFF64748B),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),

                    // Toggle Buttons: Global vs Multiple Rooms
                    Row(
                      children: [
                        Expanded(
                          child: InkWell(
                            onTap: () {
                              setState(() {
                                _scopeType = 'global';
                                _selectedRoomIds = [];
                              });
                            },
                            borderRadius: BorderRadius.circular(12),
                            child: Container(
                              padding: const EdgeInsets.symmetric(vertical: 10),
                              decoration: BoxDecoration(
                                color: _scopeType == 'global'
                                    ? AppTheme.primary
                                    : const Color(0xFFF8FAFC),
                                border: Border.all(
                                  color: _scopeType == 'global'
                                      ? AppTheme.primary
                                      : const Color(0xFFE2E8F0),
                                ),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(
                                    Icons.public_rounded,
                                    size: 16,
                                    color: _scopeType == 'global' ? Colors.white : const Color(0xFF64748B),
                                  ),
                                  const SizedBox(width: 8),
                                  Text(
                                    'Global (All Rooms)',
                                    style: TextStyle(
                                      fontFamily: 'Inter',
                                      fontSize: 12,
                                      fontWeight: FontWeight.w700,
                                      color: _scopeType == 'global' ? Colors.white : const Color(0xFF64748B),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: InkWell(
                            onTap: () {
                              setState(() {
                                _scopeType = 'multiple';
                                if (_selectedRoomIds.isEmpty && widget.rooms.isNotEmpty) {
                                  _selectedRoomIds = [widget.rooms.first.id];
                                }
                              });
                            },
                            borderRadius: BorderRadius.circular(12),
                            child: Container(
                              padding: const EdgeInsets.symmetric(vertical: 10),
                              decoration: BoxDecoration(
                                color: _scopeType == 'multiple'
                                    ? AppTheme.primary
                                    : const Color(0xFFF8FAFC),
                                border: Border.all(
                                  color: _scopeType == 'multiple'
                                      ? AppTheme.primary
                                      : const Color(0xFFE2E8F0),
                                ),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(
                                    Icons.meeting_room_rounded,
                                    size: 16,
                                    color: _scopeType == 'multiple' ? Colors.white : const Color(0xFF64748B),
                                  ),
                                  const SizedBox(width: 8),
                                  Text(
                                    'Multiple Rooms (${_selectedRoomIds.length})',
                                    style: TextStyle(
                                      fontFamily: 'Inter',
                                      fontSize: 12,
                                      fontWeight: FontWeight.w700,
                                      color: _scopeType == 'multiple' ? Colors.white : const Color(0xFF64748B),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),

                    // Info banner or Room check list
                    if (_scopeType == 'global') ...[
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                        decoration: BoxDecoration(
                          color: const Color(0xFFEFF6FF),
                          border: Border.all(color: const Color(0xFFDBEAFE)),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Row(
                          children: const [
                            Icon(Icons.info_outline_rounded, size: 18, color: Color(0xFF3B82F6)),
                            SizedBox(width: 10),
                            Expanded(
                              child: Text(
                                'This slot will be universally available to all rooms that don\'t have custom overrides.',
                                style: TextStyle(
                                  fontFamily: 'Inter',
                                  fontSize: 11,
                                  color: Color(0xFF1E40AF),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ] else ...[
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF8FAFC),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Column(
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                const Text(
                                  'Select one or multiple rooms:',
                                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF64748B)),
                                ),
                                Row(
                                  children: [
                                    InkWell(
                                      onTap: () => setState(() => _selectedRoomIds = widget.rooms.map((r) => r.id).toList()),
                                      child: const Text('Select All', style: TextStyle(color: AppTheme.primary, fontSize: 11, fontWeight: FontWeight.w600)),
                                    ),
                                    const Text(' • ', style: TextStyle(color: Color(0xFFCBD5E1))),
                                    InkWell(
                                      onTap: () => setState(() => _selectedRoomIds = []),
                                      child: const Text('Deselect All', style: TextStyle(color: Color(0xFFDC2626), fontSize: 11, fontWeight: FontWeight.w600)),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            ConstrainedBox(
                              constraints: const BoxConstraints(maxHeight: 140),
                              child: ListView(
                                shrinkWrap: true,
                                children: widget.rooms.map((r) {
                                  final checked = _selectedRoomIds.contains(r.id);
                                  return CheckboxListTile(
                                    value: checked,
                                    dense: true,
                                    contentPadding: EdgeInsets.zero,
                                    visualDensity: VisualDensity.compact,
                                    activeColor: AppTheme.primary,
                                    title: Text(
                                      '${r.name} (${r.location})',
                                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500),
                                    ),
                                    onChanged: (val) {
                                      setState(() {
                                        if (val == true) {
                                          _selectedRoomIds.add(r.id);
                                        } else {
                                          _selectedRoomIds.remove(r.id);
                                        }
                                      });
                                    },
                                  );
                                }).toList(),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                    const SizedBox(height: 16),

                    // Display Order Weight & Active Slot
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'Display Order Weight',
                                style: TextStyle(
                                  fontFamily: 'Inter',
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                  color: Color(0xFF475569),
                                ),
                              ),
                              const SizedBox(height: 6),
                              TextField(
                                controller: _sortOrderController,
                                keyboardType: TextInputType.number,
                                decoration: InputDecoration(
                                  filled: true,
                                  fillColor: const Color(0xFFF8FAFC),
                                  border: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(12),
                                    borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                                  ),
                                  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                                ),
                                style: const TextStyle(fontFamily: 'Inter', fontSize: 13),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 24),
                        Row(
                          children: [
                            Switch(
                              value: _isActive,
                              activeThumbColor: const Color(0xFF059669),
                              activeTrackColor: const Color(0xFFA7F3D0),
                              onChanged: (val) => setState(() => _isActive = val),
                            ),
                            const SizedBox(width: 8),
                            Text(
                              _isActive ? 'Active Slot' : 'Inactive Slot',
                              style: const TextStyle(
                                fontFamily: 'Inter',
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: Color(0xFF1E293B),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                    const SizedBox(height: 18),

                    // LIVE BOOKING PICKER PREVIEW (Image 4)
                    const Text(
                      'LIVE BOOKING PICKER PREVIEW',
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
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF8FAFC),
                        border: Border.all(color: const Color(0xFFE2E8F0)),
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                            decoration: BoxDecoration(
                              color: AppTheme.primary.withValues(alpha: 0.12),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              duration > 0 ? '${duration}m' : '--',
                              style: const TextStyle(
                                fontFamily: 'Inter',
                                fontSize: 12,
                                fontWeight: FontWeight.w800,
                                color: AppTheme.primary,
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  _previewLabel,
                                  style: const TextStyle(
                                    fontFamily: 'Inter',
                                    fontSize: 13,
                                    fontWeight: FontWeight.w700,
                                    color: Color(0xFF0F172A),
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  '${_computedPeriod[0].toUpperCase()}${_computedPeriod.substring(1)} • ${_scopeType == 'global' ? 'Global (All Rooms)' : '${_selectedRoomIds.length} Rooms Selected'}',
                                  style: const TextStyle(
                                    fontFamily: 'Inter',
                                    fontSize: 11,
                                    color: Color(0xFF64748B),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: _isActive
                                  ? const Color(0xFFECFDF5)
                                  : const Color(0xFFF1F5F9),
                              border: Border.all(
                                color: _isActive
                                    ? const Color(0xFFA7F3D0)
                                    : const Color(0xFFCBD5E1),
                              ),
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: Text(
                              _isActive ? 'Active' : 'Disabled',
                              style: TextStyle(
                                fontFamily: 'Inter',
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                                color: _isActive
                                    ? const Color(0xFF059669)
                                    : const Color(0xFF64748B),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // 3. Action Footer (Cancel / Create Slot)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
              decoration: const BoxDecoration(
                border: Border(top: BorderSide(color: Color(0xFFF1F5F9))),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  TextButton(
                    onPressed: _isSaving ? null : () => Navigator.of(context).pop(),
                    style: TextButton.styleFrom(
                      foregroundColor: const Color(0xFF64748B),
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    ),
                    child: const Text('Cancel', style: TextStyle(fontFamily: 'Inter', fontWeight: FontWeight.w600)),
                  ),
                  const SizedBox(width: 10),
                  ElevatedButton.icon(
                    onPressed: _isSaving ? null : _handleSubmit,
                    icon: _isSaving
                        ? const SizedBox(
                            width: 14,
                            height: 14,
                            child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                          )
                        : const Icon(Icons.check_rounded, size: 16),
                    label: Text(
                      _isSaving
                          ? 'Saving...'
                          : (isEditMode ? 'Update Slot' : 'Create Slot'),
                      style: const TextStyle(fontFamily: 'Inter', fontWeight: FontWeight.w700),
                    ),
                    style: ElevatedButton.styleFrom(
                      foregroundColor: Colors.white,
                      backgroundColor: AppTheme.primary,
                      elevation: 0,
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildQuickDateBtn(String label, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(6),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
        decoration: BoxDecoration(
          color: Colors.white,
          border: Border.all(color: const Color(0xFFCBD5E1)),
          borderRadius: BorderRadius.circular(6),
        ),
        child: Text(
          label,
          style: const TextStyle(fontFamily: 'Inter', fontSize: 11, color: Color(0xFF475569)),
        ),
      ),
    );
  }
}
