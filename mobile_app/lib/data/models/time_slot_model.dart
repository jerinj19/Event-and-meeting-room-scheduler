class TimeSlotModel {
  final String id;
  final String start;
  final String end;
  final String label;
  final String duration;
  final String period;
  final bool isBooked;
  final bool isPast;
  final bool isCurrent;
  final bool isActive;
  final String? date;
  final String? room;
  final String? roomName;
  final bool isRecurring;
  final int durationMinutes;
  final String? formattedLabel;
  final int sortOrder;
  final String? startTime;
  final String? endTime;

  TimeSlotModel({
    required this.id,
    required this.start,
    required this.end,
    required this.label,
    required this.duration,
    required this.period,
    this.isBooked = false,
    this.isPast = false,
    this.isCurrent = false,
    this.isActive = true,
    this.date,
    this.room,
    this.roomName,
    this.isRecurring = false,
    this.durationMinutes = 60,
    this.formattedLabel,
    this.sortOrder = 0,
    this.startTime,
    this.endTime,
  });

  bool get isSelectable => !isBooked && !isPast && isActive;

  int get startHour {
    final parts = start.split(':');
    return parts.isNotEmpty ? int.tryParse(parts[0]) ?? 9 : 9;
  }

  int get startMinute {
    final parts = start.split(':');
    return parts.length > 1 ? int.tryParse(parts[1]) ?? 0 : 0;
  }

  int get endHour {
    final parts = end.split(':');
    return parts.isNotEmpty ? int.tryParse(parts[0]) ?? 10 : 10;
  }

  int get endMinute {
    final parts = end.split(':');
    return parts.length > 1 ? int.tryParse(parts[1]) ?? 0 : 0;
  }

  String get startTime12h => _formatTime12h(start);
  String get endTime12h => _formatTime12h(end);

  static String _formatTime12h(String timeStr) {
    if (timeStr.isEmpty) return '';
    final parts = timeStr.split(':');
    final h = int.tryParse(parts[0]) ?? 9;
    final m = parts.length > 1 ? parts[1].padLeft(2, '0').substring(0, 2) : '00';
    final ampm = h >= 12 ? 'PM' : 'AM';
    final h12 = h % 12 == 0 ? 12 : h % 12;
    return '${h12.toString().padLeft(2, '0')}:$m $ampm';
  }

  factory TimeSlotModel.fromJson(Map<String, dynamic> json) {
    final rawStart = json['start']?.toString() ??
        (json['start_time'] != null ? json['start_time'].toString().substring(0, 5) : '09:00');
    final rawEnd = json['end']?.toString() ??
        (json['end_time'] != null ? json['end_time'].toString().substring(0, 5) : '10:00');

    return TimeSlotModel(
      id: json['id']?.toString() ?? '',
      start: rawStart,
      end: rawEnd,
      label: json['label']?.toString() ?? (json['formatted_label']?.toString() ?? '$rawStart - $rawEnd'),
      duration: json['duration']?.toString() ?? '${json['duration_minutes'] ?? 60} mins',
      period: json['period']?.toString() ?? 'morning',
      isBooked: json['is_booked'] == true,
      isPast: json['is_past'] == true,
      isCurrent: json['is_current'] == true,
      isActive: json['is_active'] != false,
      date: json['date']?.toString(),
      room: json['room']?.toString(),
      roomName: json['room_name']?.toString(),
      isRecurring: json['is_recurring'] == true || json['date'] == null,
      durationMinutes: json['duration_minutes'] is int
          ? json['duration_minutes'] as int
          : (int.tryParse(json['duration_minutes']?.toString() ?? '60') ?? 60),
      formattedLabel: json['formatted_label']?.toString(),
      sortOrder: json['sort_order'] is int
          ? json['sort_order'] as int
          : (int.tryParse(json['sort_order']?.toString() ?? '0') ?? 0),
      startTime: json['start_time']?.toString(),
      endTime: json['end_time']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'label': label,
      'date': date,
      'start_time': startTime ?? (start.length == 5 ? '$start:00' : start),
      'end_time': endTime ?? (end.length == 5 ? '$end:00' : end),
      'period': period,
      'room': room,
      'is_active': isActive,
      'sort_order': sortOrder,
    };
  }

  TimeSlotModel copyWith({
    String? id,
    String? start,
    String? end,
    String? label,
    String? duration,
    String? period,
    bool? isBooked,
    bool? isPast,
    bool? isCurrent,
    bool? isActive,
    String? date,
    String? room,
    String? roomName,
    bool? isRecurring,
    int? durationMinutes,
    String? formattedLabel,
    int? sortOrder,
    String? startTime,
    String? endTime,
  }) {
    return TimeSlotModel(
      id: id ?? this.id,
      start: start ?? this.start,
      end: end ?? this.end,
      label: label ?? this.label,
      duration: duration ?? this.duration,
      period: period ?? this.period,
      isBooked: isBooked ?? this.isBooked,
      isPast: isPast ?? this.isPast,
      isCurrent: isCurrent ?? this.isCurrent,
      isActive: isActive ?? this.isActive,
      date: date ?? this.date,
      room: room ?? this.room,
      roomName: roomName ?? this.roomName,
      isRecurring: isRecurring ?? this.isRecurring,
      durationMinutes: durationMinutes ?? this.durationMinutes,
      formattedLabel: formattedLabel ?? this.formattedLabel,
      sortOrder: sortOrder ?? this.sortOrder,
      startTime: startTime ?? this.startTime,
      endTime: endTime ?? this.endTime,
    );
  }
}
