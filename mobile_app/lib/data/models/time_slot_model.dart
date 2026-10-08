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

  factory TimeSlotModel.fromJson(Map<String, dynamic> json) {
    return TimeSlotModel(
      id: json['id']?.toString() ?? '',
      start: json['start']?.toString() ?? '09:00',
      end: json['end']?.toString() ?? '10:00',
      label: json['label']?.toString() ?? '${json['start']} - ${json['end']}',
      duration: json['duration']?.toString() ?? '60 mins',
      period: json['period']?.toString() ?? 'morning',
      isBooked: json['is_booked'] == true,
      isPast: json['is_past'] == true,
      isCurrent: json['is_current'] == true,
      isActive: json['is_active'] != false,
    );
  }
}
