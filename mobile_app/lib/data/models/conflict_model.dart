import '../../core/utils/date_formatter.dart';

class ConflictModel {
  final String? id;
  final String title;
  final DateTime? startTime;
  final DateTime? endTime;
  final String? bookedBy;
  final String? status;

  ConflictModel({
    this.id,
    required this.title,
    this.startTime,
    this.endTime,
    this.bookedBy,
    this.status,
  });

  String get timeInterval {
    if (startTime == null || endTime == null) return '';
    return DateFormatter.formatTimeInterval(startTime!, endTime!);
  }

  factory ConflictModel.fromJson(Map<String, dynamic> json) {
    return ConflictModel(
      id: json['id']?.toString(),
      title: json['title']?.toString() ?? 'Reserved Meeting',
      startTime: DateFormatter.tryParseIso(json['start_time']?.toString()),
      endTime: DateFormatter.tryParseIso(json['end_time']?.toString()),
      bookedBy: json['booked_by']?.toString() ?? json['user']?.toString(),
      status: json['status']?.toString() ?? 'CONFIRMED',
    );
  }
}
