import '../../core/config/api_config.dart';
import '../../core/utils/date_formatter.dart';

class BookingModel {
  final String id;
  final String roomId;
  final String roomName;
  final String roomLocation;
  final int roomCapacity;
  final double roomHourlyRate;
  final String? roomImage;
  final String userId;
  final String userEmail;
  final String userName;
  final String? userDepartment;
  final bool userIsStaff;
  final String title;
  final String description;
  final DateTime startTime;
  final DateTime endTime;
  final int attendeesCount;
  final String status;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  BookingModel({
    required this.id,
    required this.roomId,
    required this.roomName,
    required this.roomLocation,
    required this.roomCapacity,
    this.roomHourlyRate = 0.0,
    this.roomImage,
    required this.userId,
    required this.userEmail,
    required this.userName,
    this.userDepartment,
    this.userIsStaff = false,
    required this.title,
    this.description = '',
    required this.startTime,
    required this.endTime,
    this.attendeesCount = 1,
    required this.status,
    this.createdAt,
    this.updatedAt,
  });

  bool get isConfirmed => status.toUpperCase() == 'CONFIRMED';
  bool get isCancelled => status.toUpperCase() == 'CANCELLED';
  bool get isPast => endTime.isBefore(DateTime.now());

  int get durationMinutes {
    return endTime.difference(startTime).inMinutes;
  }

  String get timeSlotLabel {
    return DateFormatter.formatTimeInterval(startTime, endTime);
  }

  String get dateLabel {
    return DateFormatter.formatFullDate(startTime);
  }

  String get formattedRoomImage {
    return ApiConfig.formatImageUrl(roomImage);
  }

  factory BookingModel.fromJson(Map<String, dynamic> json) {
    // Room ID can come from 'room' (uuid or object) or 'room_id'
    String rId = '';
    String rName = json['room_name']?.toString() ?? 'Meeting Room';
    String rLoc = json['room_location']?.toString() ?? 'Campus';
    int rCap = json['room_capacity'] is int
        ? json['room_capacity']
        : int.tryParse(json['room_capacity']?.toString() ?? '1') ?? 1;

    if (json['room'] is Map<String, dynamic>) {
      final rMap = json['room'] as Map<String, dynamic>;
      rId = rMap['id']?.toString() ?? '';
      rName = rMap['name']?.toString() ?? rName;
      rLoc = rMap['location']?.toString() ?? rLoc;
      if (rMap['capacity'] != null) {
        rCap = int.tryParse(rMap['capacity'].toString()) ?? rCap;
      }
    } else if (json['room'] != null) {
      rId = json['room'].toString();
    } else if (json['room_id'] != null) {
      rId = json['room_id'].toString();
    }

    // User data
    String uId = '';
    String uEmail = json['user_email']?.toString() ?? '';
    String uName = json['user_name']?.toString() ?? '';
    String? uDept = json['user_department']?.toString();
    bool uStaff = json['user_is_staff'] == true;

    if (json['user'] is Map<String, dynamic>) {
      final uMap = json['user'] as Map<String, dynamic>;
      uId = uMap['id']?.toString() ?? '';
      uEmail = uMap['email']?.toString() ?? uEmail;
      uName = '${uMap['first_name'] ?? ''} ${uMap['last_name'] ?? ''}'.trim();
      uDept = uMap['department']?.toString() ?? uDept;
      uStaff = uMap['is_staff'] == true;
    } else if (json['user'] != null) {
      uId = json['user'].toString();
    }

    final sTime = DateFormatter.tryParseIso(json['start_time']?.toString()) ?? DateTime.now();
    final eTime = DateFormatter.tryParseIso(json['end_time']?.toString()) ??
        sTime.add(const Duration(hours: 1));

    return BookingModel(
      id: json['id']?.toString() ?? '',
      roomId: rId,
      roomName: rName,
      roomLocation: rLoc,
      roomCapacity: rCap,
      roomHourlyRate: double.tryParse(json['room_hourly_rate']?.toString() ?? '0') ?? 0.0,
      roomImage: json['room_image']?.toString() ??
          (json['room'] is Map
              ? ((json['room'] as Map)['image']?.toString() ??
                  (json['room'] as Map)['image_url']?.toString())
              : null) ??
          json['room_image_url']?.toString() ??
          json['image']?.toString(),
      userId: uId,
      userEmail: uEmail,
      userName: uName.isNotEmpty ? uName : (uEmail.isNotEmpty ? uEmail : 'Member'),
      userDepartment: uDept,
      userIsStaff: uStaff,
      title: json['title']?.toString() ?? 'Reserved Meeting',
      description: json['description']?.toString() ?? '',
      startTime: sTime,
      endTime: eTime,
      attendeesCount: json['attendees_count'] is int
          ? json['attendees_count']
          : int.tryParse(json['attendees_count']?.toString() ?? '1') ?? 1,
      status: json['status']?.toString() ?? 'CONFIRMED',
      createdAt: DateFormatter.tryParseIso(json['created_at']?.toString()),
      updatedAt: DateFormatter.tryParseIso(json['updated_at']?.toString()),
    );
  }
}
