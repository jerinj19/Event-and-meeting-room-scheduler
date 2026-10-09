import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';
import '../../../data/models/room_model.dart';

class BulkSlotRow {
  String id;
  String date;
  String start;
  String end;
  String label;
  String period;
  String? roomId;
  bool isActive;

  BulkSlotRow({
    required this.id,
    required this.date,
    required this.start,
    required this.end,
    this.label = '',
    required this.period,
    this.roomId,
    this.isActive = true,
  });
}

class BulkTimeSlotModal extends StatefulWidget {
  final List<RoomModel> rooms;
  final Future<void> Function(List<Map<String, dynamic>> payload) onSaveBulk;

  const BulkTimeSlotModal({
    super.key,
    required this.rooms,
    required this.onSaveBulk,
  });

  @override
  State<BulkTimeSlotModal> createState() => _BulkTimeSlotModalState();
}

class _BulkTimeSlotModalState extends State<BulkTimeSlotModal> {
  String _mode = 'generator'; // generator | manual
  String? _errorMessage;
  bool _isSaving = false;

  // Generator Settings
  String _genStart = '09:00';
  String _genEnd = '18:00';
  int _genDuration = 60; // minutes
  int _genBreak = 0; // minutes
  List<String> _genSelectedDates = [];
  String _genScopeType = 'global'; // global | multiple
  List<String> _genSelectedRooms = [];

  // Review Rows
  final List<BulkSlotRow> _rows = [];

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    _genSelectedDates = [
      '${now.year}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}'
    ];

    // Seed 2 default rows
    _rows.add(BulkSlotRow(
      id: '1',
      date: _genSelectedDates.first,
      start: '09:00',
      end: '10:00',
      period: 'morning',
      roomId: null,
    ));
    _rows.add(BulkSlotRow(
      id: '2',
      date: _genSelectedDates.first,
      start: '10:00',
      end: '11:00',
      period: 'morning',
      roomId: null,
    ));
  }

  int _timeToMinutes(String timeStr) {
    if (timeStr.isEmpty) return 0;
    final parts = timeStr.split(':');
    final h = int.tryParse(parts[0]) ?? 0;
    final m = parts.length > 1 ? int.tryParse(parts[1]) ?? 0 : 0;
    return h * 60 + m;
  }

  String _minutesToTime(int totalMinutes) {
    final hours = (totalMinutes ~/ 60) % 24;
    final mins = totalMinutes % 60;
    return '${hours.toString().padLeft(2, '0')}:${mins.toString().padLeft(2, '0')}';
  }

  String _detectPeriod(String startTime) {
    final parts = startTime.split(':');
    final h = int.tryParse(parts[0]) ?? 9;
    if (h < 12) return 'morning';
    if (h < 17) return 'afternoon';
    return 'evening';
  }

  Future<void> _pickTime({required bool isStart}) async {
    final current = isStart ? _genStart : _genEnd;
    final parts = current.split(':');
    final initial = TimeOfDay(
      hour: int.tryParse(parts[0]) ?? 9,
      minute: int.tryParse(parts.length > 1 ? parts[1] : '0') ?? 0,
    );

    final picked = await showTimePicker(context: context, initialTime: initial);
    if (picked != null) {
      final formatted =
          '${picked.hour.toString().padLeft(2, '0')}:${picked.minute.toString().padLeft(2, '0')}';
      setState(() {
        if (isStart) {
          _genStart = formatted;
        } else {
          _genEnd = formatted;
        }
      });
    }
  }

  void _addQuickDays(int count) {
    final now = DateTime.now();
    final newDates = List<String>.from(_genSelectedDates);
    for (int i = 0; i < count; i++) {
      final d = now.add(Duration(days: i));
      final s =
          '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';
      if (!newDates.contains(s)) {
        newDates.add(s);
      }
    }
    newDates.sort();
    setState(() => _genSelectedDates = newDates);
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
      if (!_genSelectedDates.contains(s)) {
        setState(() {
          _genSelectedDates = [..._genSelectedDates, s]..sort();
        });
      }
    }
  }

  void _runGenerator() {
    setState(() => _errorMessage = null);

    final startMin = _timeToMinutes(_genStart);
    final endMin = _timeToMinutes(_genEnd);

    if (endMin <= startMin) {
      setState(() => _errorMessage = 'Overall End Time must be later than Start Time.');
      return;
    }

    if (_genDuration <= 0) {
      setState(() => _errorMessage = 'Slot Duration must be greater than 0.');
      return;
    }

    if (_genSelectedDates.isEmpty) {
      setState(() => _errorMessage = 'Please add at least one specific calendar date.');
      return;
    }

    if (_genScopeType == 'multiple' && _genSelectedRooms.isEmpty) {
      setState(() => _errorMessage = 'Please select at least one room or switch to Global scope.');
      return;
    }

    final targetScopes = _genScopeType == 'global'
        ? [null]
        : _genSelectedRooms;

    final generated = <BulkSlotRow>[];
    int cur = startMin;
    int idx = 1;

    while (cur + _genDuration <= endMin) {
      final slotStart = _minutesToTime(cur);
      final slotEnd = _minutesToTime(cur + _genDuration);
      final period = _detectPeriod(slotStart);

      for (final d in _genSelectedDates) {
        for (final rId in targetScopes) {
          generated.add(BulkSlotRow(
            id: 'gen-${DateTime.now().millisecondsSinceEpoch}-${idx++}',
            date: d,
            start: slotStart,
            end: slotEnd,
            period: period,
            roomId: rId,
          ));
        }
      }

      cur += _genDuration + _genBreak;
    }

    if (generated.isEmpty) {
      setState(() => _errorMessage =
          'No complete slots fit in the specified time window. Try increasing the window or decreasing duration.');
      return;
    }

    setState(() {
      _rows.clear();
      _rows.addAll(generated);
    });
  }

  void _addRow() {
    String nextStart = '09:00';
    String nextEnd = '10:00';
    if (_rows.isNotEmpty) {
      nextStart = _rows.last.end;
      final nextEndMin = _timeToMinutes(_rows.last.end) + 60;
      nextEnd = _minutesToTime(nextEndMin);
    }

    final defaultDate = _genSelectedDates.isNotEmpty
        ? _genSelectedDates.first
        : DateTime.now().toIso8601String().substring(0, 10);

    setState(() {
      _rows.add(BulkSlotRow(
        id: 'row-${DateTime.now().millisecondsSinceEpoch}',
        date: defaultDate,
        start: nextStart,
        end: nextEnd,
        period: _detectPeriod(nextStart),
        roomId: _genScopeType == 'multiple' && _genSelectedRooms.length == 1
            ? _genSelectedRooms.first
            : null,
      ));
    });
  }

  Future<void> _handleSubmit() async {
    setState(() => _errorMessage = null);

    if (_rows.isEmpty) {
      setState(() => _errorMessage = 'Please add or generate at least one time slot row.');
      return;
    }

    for (int i = 0; i < _rows.length; i++) {
      final r = _rows[i];
      if (r.date.isEmpty) {
        setState(() => _errorMessage = 'Row ${i + 1} has missing calendar date.');
        return;
      }
      final sMin = _timeToMinutes(r.start);
      final eMin = _timeToMinutes(r.end);
      if (eMin <= sMin) {
        setState(() => _errorMessage =
            'Row ${i + 1} (${r.start} to ${r.end}): End time must be after start time.');
        return;
      }
    }

    setState(() => _isSaving = true);

    try {
      final payload = _rows.asMap().entries.map((entry) {
        final idx = entry.key;
        final r = entry.value;
        return <String, dynamic>{
          'date': r.date,
          'start_time': r.start.length == 5 ? '${r.start}:00' : r.start,
          'end_time': r.end.length == 5 ? '${r.end}:00' : r.end,
          'label': r.label.trim(),
          'period': r.period.isNotEmpty ? r.period : _detectPeriod(r.start),
          'room': r.roomId,
          'is_active': r.isActive,
          'sort_order': idx,
        };
      }).toList();

      await widget.onSaveBulk(payload);
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
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      backgroundColor: Colors.white,
      insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 820, maxHeight: 850),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // 1. Modal Header (Image 3)
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
                      Icons.more_time_rounded,
                      color: AppTheme.primary,
                      size: 22,
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: const [
                        Text(
                          'Add Multiple Time Slots at Once',
                          style: TextStyle(
                            fontFamily: 'Inter',
                            fontSize: 17,
                            fontWeight: FontWeight.w700,
                            color: Color(0xFF0F172A),
                          ),
                        ),
                        SizedBox(height: 2),
                        Text(
                          'Generate interval-based slots or add a batch of custom meeting slots in bulk.',
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

            // 2. Tab Selectors (⚡ Auto-Generate By Interval | 📋 Batch Row List)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 6),
              decoration: const BoxDecoration(
                color: Color(0xFFF8FAFC),
                border: Border(bottom: BorderSide(color: Color(0xFFE2E8F0))),
              ),
              child: Row(
                children: [
                  _buildTabButton(
                    id: 'generator',
                    icon: Icons.bolt_rounded,
                    label: 'Auto-Generate By Interval',
                  ),
                  const SizedBox(width: 8),
                  _buildTabButton(
                    id: 'manual',
                    icon: Icons.format_list_bulleted_rounded,
                    label: 'Batch Row List (${_rows.length})',
                  ),
                ],
              ),
            ),

            // 3. Scrollable Content Area
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

                    // A. INTERVAL GENERATOR SETTINGS (Image 3)
                    if (_mode == 'generator') ...[
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF8FAFC),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: const [
                                Text(
                                  'INTERVAL GENERATOR SETTINGS',
                                  style: TextStyle(
                                    fontFamily: 'Inter',
                                    fontSize: 11,
                                    fontWeight: FontWeight.w800,
                                    color: Color(0xFF475569),
                                    letterSpacing: 0.5,
                                  ),
                                ),
                                Text(
                                  'Calculates slots between start and end times',
                                  style: TextStyle(
                                    fontFamily: 'Inter',
                                    fontSize: 11,
                                    color: Color(0xFF64748B),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 12),

                            // Grid of Window Start, Window End, Duration, Break
                            LayoutBuilder(
                              builder: (context, constraints) {
                                final isWide = constraints.maxWidth >= 540;
                                return GridView.count(
                                  shrinkWrap: true,
                                  physics: const NeverScrollableScrollPhysics(),
                                  crossAxisCount: isWide ? 4 : 2,
                                  mainAxisSpacing: 10,
                                  crossAxisSpacing: 10,
                                  childAspectRatio: isWide ? 2.1 : 2.4,
                                  children: [
                                    _buildPickerField(
                                      label: 'Window Start',
                                      value: _genStart,
                                      onTap: () => _pickTime(isStart: true),
                                    ),
                                    _buildPickerField(
                                      label: 'Window End',
                                      value: _genEnd,
                                      onTap: () => _pickTime(isStart: false),
                                    ),
                                    _buildDropdownField<int>(
                                      label: 'Slot Duration',
                                      value: _genDuration,
                                      items: const [
                                        DropdownMenuItem(value: 30, child: Text('30 Mins')),
                                        DropdownMenuItem(value: 45, child: Text('45 Mins')),
                                        DropdownMenuItem(value: 60, child: Text('60 Mins (1 hr)')),
                                        DropdownMenuItem(value: 90, child: Text('90 Mins (1.5 hrs)')),
                                        DropdownMenuItem(value: 120, child: Text('120 Mins (2 hrs)')),
                                      ],
                                      onChanged: (val) {
                                        if (val != null) setState(() => _genDuration = val);
                                      },
                                    ),
                                    _buildDropdownField<int>(
                                      label: 'Buffer / Break',
                                      value: _genBreak,
                                      items: const [
                                        DropdownMenuItem(value: 0, child: Text('No Break (0m)')),
                                        DropdownMenuItem(value: 5, child: Text('5 Mins')),
                                        DropdownMenuItem(value: 10, child: Text('10 Mins')),
                                        DropdownMenuItem(value: 15, child: Text('15 Mins')),
                                        DropdownMenuItem(value: 30, child: Text('30 Mins')),
                                      ],
                                      onChanged: (val) {
                                        if (val != null) setState(() => _genBreak = val);
                                      },
                                    ),
                                  ],
                                );
                              },
                            ),
                            const SizedBox(height: 14),

                            // Date Applicability (Specific Dates)
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                const Text(
                                  'DATE APPLICABILITY (SPECIFIC DATES)',
                                  style: TextStyle(
                                    fontFamily: 'Inter',
                                    fontSize: 11,
                                    fontWeight: FontWeight.w800,
                                    color: Color(0xFF475569),
                                  ),
                                ),
                                Text(
                                  '📅 Generating for ${_genSelectedDates.length} date${_genSelectedDates.length == 1 ? '' : 's'}',
                                  style: const TextStyle(
                                    fontFamily: 'Inter',
                                    fontSize: 11,
                                    color: Color(0xFF64748B),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: Colors.white,
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
                                      _buildQuickDateChip('Today', () => _addQuickDays(1)),
                                      _buildQuickDateChip('Tomorrow', () {
                                        final d = DateTime.now().add(const Duration(days: 1));
                                        final s =
                                            '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';
                                        if (!_genSelectedDates.contains(s)) {
                                          setState(() => _genSelectedDates = [..._genSelectedDates, s]..sort());
                                        }
                                      }),
                                      _buildQuickDateChip('+ Next 7 Days', () => _addQuickDays(7)),
                                      _buildQuickDateChip('+ Next 14 Days', () => _addQuickDays(14)),
                                      _buildQuickDateChip('+ Next Month', () => _addQuickDays(30)),
                                      if (_genSelectedDates.isNotEmpty)
                                        TextButton(
                                          onPressed: () => setState(() => _genSelectedDates = []),
                                          child: const Text('Clear', style: TextStyle(color: Color(0xFFDC2626), fontSize: 11)),
                                        ),
                                    ],
                                  ),
                                  if (_genSelectedDates.isNotEmpty) ...[
                                    const SizedBox(height: 10),
                                    Wrap(
                                      spacing: 6,
                                      runSpacing: 6,
                                      children: _genSelectedDates.map((dStr) {
                                        return Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                          decoration: BoxDecoration(
                                            color: const Color(0xFFF8FAFC),
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
                                                  setState(() => _genSelectedDates.remove(dStr));
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
                            const SizedBox(height: 14),

                            // Room Scope Selection
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                const Text(
                                  'ROOM SCOPE SELECTION',
                                  style: TextStyle(
                                    fontFamily: 'Inter',
                                    fontSize: 11,
                                    fontWeight: FontWeight.w800,
                                    color: Color(0xFF475569),
                                  ),
                                ),
                                Text(
                                  _genScopeType == 'global'
                                      ? '🌐 Generating for All Rooms (Global)'
                                      : '📍 Generating for ${_genSelectedRooms.length} room${_genSelectedRooms.length == 1 ? '' : 's'}',
                                  style: const TextStyle(
                                    fontFamily: 'Inter',
                                    fontSize: 11,
                                    color: Color(0xFF64748B),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            Row(
                              children: [
                                _buildScopeToggleButton(
                                  label: 'Global (All Rooms)',
                                  icon: Icons.public_rounded,
                                  isSelected: _genScopeType == 'global',
                                  onTap: () {
                                    setState(() {
                                      _genScopeType = 'global';
                                      _genSelectedRooms = [];
                                    });
                                  },
                                ),
                                const SizedBox(width: 8),
                                _buildScopeToggleButton(
                                  label: 'Multiple Rooms (${_genSelectedRooms.length})',
                                  icon: Icons.meeting_room_rounded,
                                  isSelected: _genScopeType == 'multiple',
                                  onTap: () {
                                    setState(() {
                                      _genScopeType = 'multiple';
                                      if (_genSelectedRooms.isEmpty && widget.rooms.isNotEmpty) {
                                        _genSelectedRooms = widget.rooms.map((r) => r.id).toList();
                                      }
                                    });
                                  },
                                ),
                                const Spacer(),
                                ElevatedButton.icon(
                                  onPressed: _runGenerator,
                                  icon: const Icon(Icons.bolt_rounded, size: 16),
                                  label: const Text('Generate Slots into Review Table'),
                                  style: ElevatedButton.styleFrom(
                                    foregroundColor: Colors.white,
                                    backgroundColor: AppTheme.primary,
                                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                    textStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
                                  ),
                                ),
                              ],
                            ),
                            if (_genScopeType == 'multiple') ...[
                              const SizedBox(height: 10),
                              Container(
                                padding: const EdgeInsets.all(10),
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  border: Border.all(color: const Color(0xFFE2E8F0)),
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: Wrap(
                                  spacing: 8,
                                  runSpacing: 4,
                                  children: widget.rooms.map((r) {
                                    final checked = _genSelectedRooms.contains(r.id);
                                    return FilterChip(
                                      label: Text(r.name, style: const TextStyle(fontSize: 11)),
                                      selected: checked,
                                      selectedColor: AppTheme.primary.withValues(alpha: 0.15),
                                      checkmarkColor: AppTheme.primary,
                                      onSelected: (val) {
                                        setState(() {
                                          if (val) {
                                            _genSelectedRooms.add(r.id);
                                          } else {
                                            _genSelectedRooms.remove(r.id);
                                          }
                                        });
                                      },
                                    );
                                  }).toList(),
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                      const SizedBox(height: 18),
                    ],

                    // B. REVIEW TABLE: SLOTS TO CREATE (N) (Image 3)
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'SLOTS TO CREATE (${_rows.length})',
                              style: const TextStyle(
                                fontFamily: 'Inter',
                                fontSize: 12,
                                fontWeight: FontWeight.w800,
                                color: Color(0xFF0F172A),
                              ),
                            ),
                            const Text(
                              'Review, edit, add, or delete individual rows before creating.',
                              style: TextStyle(
                                fontFamily: 'Inter',
                                fontSize: 11,
                                color: Color(0xFF64748B),
                              ),
                            ),
                          ],
                        ),
                        Row(
                          children: [
                            TextButton(
                              onPressed: _rows.isEmpty ? null : () => setState(() => _rows.clear()),
                              style: TextButton.styleFrom(
                                foregroundColor: const Color(0xFFDC2626),
                                textStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                              ),
                              child: const Text('Clear All'),
                            ),
                            const SizedBox(width: 8),
                            ElevatedButton.icon(
                              onPressed: _addRow,
                              icon: const Icon(Icons.add_rounded, size: 14),
                              label: const Text('Add Row'),
                              style: ElevatedButton.styleFrom(
                                foregroundColor: AppTheme.primary,
                                backgroundColor: AppTheme.primary.withValues(alpha: 0.1),
                                elevation: 0,
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                textStyle: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),

                    // Table Container
                    Container(
                      decoration: BoxDecoration(
                        border: Border.all(color: const Color(0xFFE2E8F0)),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(12),
                        child: SingleChildScrollView(
                          scrollDirection: Axis.horizontal,
                          child: ConstrainedBox(
                            constraints: const BoxConstraints(minWidth: 740),
                            child: DataTable(
                              headingRowColor: WidgetStateProperty.all(const Color(0xFFF8FAFC)),
                              headingTextStyle: const TextStyle(
                                fontFamily: 'Inter',
                                fontSize: 10,
                                fontWeight: FontWeight.w800,
                                color: Color(0xFF64748B),
                                letterSpacing: 0.5,
                              ),
                              dataRowMinHeight: 46,
                              dataRowMaxHeight: 52,
                              columnSpacing: 16,
                              columns: const [
                                DataColumn(label: Text('#')),
                                DataColumn(label: Text('DATE')),
                                DataColumn(label: Text('START')),
                                DataColumn(label: Text('END')),
                                DataColumn(label: Text('PERIOD')),
                                DataColumn(label: Text('CUSTOM LABEL (OPTIONAL)')),
                                DataColumn(label: Text('SCOPE')),
                                DataColumn(label: Text('DEL')),
                              ],
                              rows: _rows.asMap().entries.map((entry) {
                                final idx = entry.key;
                                final row = entry.value;

                                return DataRow(
                                  cells: [
                                    // #
                                    DataCell(Text(
                                      '${idx + 1}',
                                      style: const TextStyle(
                                        fontFamily: 'Inter',
                                        fontSize: 11,
                                        color: Color(0xFF64748B),
                                      ),
                                    )),

                                    // DATE
                                    DataCell(
                                      SizedBox(
                                        width: 105,
                                        child: TextFormField(
                                          initialValue: row.date,
                                          style: const TextStyle(fontSize: 11),
                                          decoration: InputDecoration(
                                            isDense: true,
                                            contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(6)),
                                          ),
                                          onChanged: (val) => row.date = val,
                                        ),
                                      ),
                                    ),

                                    // START
                                    DataCell(
                                      SizedBox(
                                        width: 75,
                                        child: TextFormField(
                                          initialValue: row.start,
                                          style: const TextStyle(fontSize: 11),
                                          decoration: InputDecoration(
                                            isDense: true,
                                            contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(6)),
                                          ),
                                          onChanged: (val) {
                                            row.start = val;
                                            row.period = _detectPeriod(val);
                                          },
                                        ),
                                      ),
                                    ),

                                    // END
                                    DataCell(
                                      SizedBox(
                                        width: 75,
                                        child: TextFormField(
                                          initialValue: row.end,
                                          style: const TextStyle(fontSize: 11),
                                          decoration: InputDecoration(
                                            isDense: true,
                                            contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(6)),
                                          ),
                                          onChanged: (val) => row.end = val,
                                        ),
                                      ),
                                    ),

                                    // PERIOD
                                    DataCell(
                                      DropdownButton<String>(
                                        value: row.period,
                                        underline: const SizedBox(),
                                        style: const TextStyle(fontSize: 11, color: Color(0xFF0F172A)),
                                        items: const [
                                          DropdownMenuItem(value: 'morning', child: Text('Morning')),
                                          DropdownMenuItem(value: 'afternoon', child: Text('Afternoon')),
                                          DropdownMenuItem(value: 'evening', child: Text('Evening')),
                                        ],
                                        onChanged: (val) {
                                          if (val != null) setState(() => row.period = val);
                                        },
                                      ),
                                    ),

                                    // CUSTOM LABEL
                                    DataCell(
                                      SizedBox(
                                        width: 130,
                                        child: TextFormField(
                                          initialValue: row.label,
                                          style: const TextStyle(fontSize: 11),
                                          decoration: InputDecoration(
                                            isDense: true,
                                            hintText: 'Auto-gen',
                                            hintStyle: const TextStyle(color: Color(0xFFCBD5E1), fontSize: 10),
                                            contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(6)),
                                          ),
                                          onChanged: (val) => row.label = val,
                                        ),
                                      ),
                                    ),

                                    // SCOPE
                                    DataCell(
                                      DropdownButton<String?>(
                                        value: row.roomId,
                                        underline: const SizedBox(),
                                        style: const TextStyle(fontSize: 11, color: Color(0xFF0F172A)),
                                        items: [
                                          const DropdownMenuItem<String?>(
                                            value: null,
                                            child: Text('Global'),
                                          ),
                                          ...widget.rooms.map(
                                            (r) => DropdownMenuItem<String?>(
                                              value: r.id,
                                              child: Text(r.name),
                                            ),
                                          ),
                                        ],
                                        onChanged: (val) {
                                          setState(() => row.roomId = val);
                                        },
                                      ),
                                    ),

                                    // DEL
                                    DataCell(
                                      IconButton(
                                        icon: const Icon(Icons.close_rounded, size: 16, color: Color(0xFFDC2626)),
                                        padding: EdgeInsets.zero,
                                        constraints: const BoxConstraints(),
                                        onPressed: () {
                                          setState(() => _rows.removeAt(idx));
                                        },
                                      ),
                                    ),
                                  ],
                                );
                              }).toList(),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // 4. Modal Footer (Ready to commit N time slots...)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
              decoration: const BoxDecoration(
                border: Border(top: BorderSide(color: Color(0xFFF1F5F9))),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Ready to commit ${_rows.length} time slot${_rows.length == 1 ? '' : 's'} to database.',
                    style: const TextStyle(
                      fontFamily: 'Inter',
                      fontSize: 12,
                      color: Color(0xFF64748B),
                    ),
                  ),
                  Row(
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
                        onPressed: _isSaving || _rows.isEmpty ? null : _handleSubmit,
                        icon: _isSaving
                            ? const SizedBox(
                                width: 14,
                                height: 14,
                                child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                              )
                            : const Icon(Icons.check_circle_rounded, size: 16),
                        label: Text(
                          _isSaving ? 'Creating Slots...' : 'Create All (${_rows.length}) Slots',
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
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTabButton({
    required String id,
    required IconData icon,
    required String label,
  }) {
    final isSelected = _mode == id;
    return InkWell(
      onTap: () => setState(() => _mode = id),
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? Colors.white : Colors.transparent,
          borderRadius: BorderRadius.circular(8),
          border: isSelected ? Border.all(color: const Color(0xFFCBD5E1)) : null,
        ),
        child: Row(
          children: [
            Icon(
              icon,
              size: 15,
              color: isSelected ? AppTheme.primary : const Color(0xFF64748B),
            ),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                fontFamily: 'Inter',
                fontSize: 12,
                fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                color: isSelected ? AppTheme.primary : const Color(0xFF64748B),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPickerField({
    required String label,
    required String value,
    required VoidCallback onTap,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: Color(0xFF64748B))),
        const SizedBox(height: 4),
        InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(8),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
            decoration: BoxDecoration(
              color: Colors.white,
              border: Border.all(color: const Color(0xFFCBD5E1)),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(value, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                const Icon(Icons.access_time_rounded, size: 14, color: Color(0xFF64748B)),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildDropdownField<T>({
    required String label,
    required T value,
    required List<DropdownMenuItem<T>> items,
    required ValueChanged<T?> onChanged,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: Color(0xFF64748B))),
        const SizedBox(height: 4),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 10),
          decoration: BoxDecoration(
            color: Colors.white,
            border: Border.all(color: const Color(0xFFCBD5E1)),
            borderRadius: BorderRadius.circular(8),
          ),
          child: DropdownButtonHideUnderline(
            child: DropdownButton<T>(
              value: value,
              isExpanded: true,
              style: const TextStyle(fontSize: 11, color: Color(0xFF0F172A), fontWeight: FontWeight.w500),
              items: items,
              onChanged: onChanged,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildScopeToggleButton({
    required String label,
    required IconData icon,
    required bool isSelected,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? AppTheme.primary : Colors.white,
          border: Border.all(color: isSelected ? AppTheme.primary : const Color(0xFFCBD5E1)),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Row(
          children: [
            Icon(icon, size: 14, color: isSelected ? Colors.white : const Color(0xFF64748B)),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                fontFamily: 'Inter',
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: isSelected ? Colors.white : const Color(0xFF475569),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildQuickDateChip(String label, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(6),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
        decoration: BoxDecoration(
          color: const Color(0xFFF1F5F9),
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
