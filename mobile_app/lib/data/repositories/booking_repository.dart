import '../../core/network/api_client.dart';
import '../../core/utils/date_formatter.dart';
import '../models/booking_model.dart';
import '../models/conflict_model.dart';
import '../models/stats_model.dart';
import '../models/time_slot_model.dart';

class AvailabilityCheckResult {
  final bool isAvailable;
  final String roomName;
  final List<ConflictModel> conflicts;

  AvailabilityCheckResult({
    required this.isAvailable,
    required this.roomName,
    required this.conflicts,
  });
}

class BookingRepository {
  final ApiClient _client;

  BookingRepository({ApiClient? client}) : _client = client ?? ApiClient();

  Future<AvailabilityCheckResult> checkAvailability({
    required String roomId,
    required DateTime startTime,
    required DateTime endTime,
  }) async {
    final response = await _client.get(
      '/bookings/check-availability/',
      queryParams: {
        'room_id': roomId,
        'start_time': startTime.toUtc().toIso8601String(),
        'end_time': endTime.toUtc().toIso8601String(),
      },
    );

    if (response is Map<String, dynamic>) {
      final isAvail = response['is_available'] == true;
      final roomName = response['room_name']?.toString() ?? '';
      final rawConflicts = response['conflicts'] as List<dynamic>? ?? [];
      final conflicts = rawConflicts
          .map((c) => ConflictModel.fromJson(c as Map<String, dynamic>))
          .toList();

      return AvailabilityCheckResult(
        isAvailable: isAvail,
        roomName: roomName,
        conflicts: conflicts,
      );
    }

    throw Exception('Failed to check room availability.');
  }

  Future<BookingModel> createBooking({
    required String roomId,
    required String title,
    required DateTime startTime,
    required DateTime endTime,
    int attendeesCount = 1,
    String description = '',
  }) async {
    final body = {
      'room': roomId,
      'title': title.trim(),
      'start_time': startTime.toUtc().toIso8601String(),
      'end_time': endTime.toUtc().toIso8601String(),
      'attendees_count': attendeesCount,
      'description': description.trim(),
    };

    final response = await _client.post('/bookings/', body: body);

    if (response is Map<String, dynamic>) {
      return BookingModel.fromJson(response);
    }

    throw Exception('Failed to reserve room.');
  }

  Future<List<BookingModel>> getMyBookings({
    bool? upcoming,
    String? status,
  }) async {
    final queryParams = <String, dynamic>{};
    if (upcoming != null) {
      queryParams['upcoming'] = upcoming;
    }
    if (status != null && status.isNotEmpty && status != 'all') {
      queryParams['status'] = status;
    }

    final response = await _client.get('/my-bookings/', queryParams: queryParams);

    List<dynamic> list = [];
    if (response is List) {
      list = response;
    } else if (response is Map<String, dynamic> && response['results'] is List) {
      list = response['results'] as List<dynamic>;
    }

    return list.map((item) => BookingModel.fromJson(item as Map<String, dynamic>)).toList();
  }

  Future<List<BookingModel>> getAllBookings({
    String? search,
    String? status,
    String? date,
    String? startDate,
    String? endDate,
  }) async {
    final queryParams = <String, dynamic>{};
    if (search != null && search.trim().isNotEmpty) {
      queryParams['search'] = search.trim();
    }
    if (status != null && status.isNotEmpty && status != 'all') {
      queryParams['status'] = status;
    }
    if (date != null && date.isNotEmpty) {
      queryParams['date'] = date;
    }
    if (startDate != null && startDate.isNotEmpty) {
      queryParams['start_date'] = startDate;
    }
    if (endDate != null && endDate.isNotEmpty) {
      queryParams['end_date'] = endDate;
    }

    final response = await _client.get('/bookings/', queryParams: queryParams);

    List<dynamic> list = [];
    if (response is List) {
      list = response;
    } else if (response is Map<String, dynamic> && response['results'] is List) {
      list = response['results'] as List<dynamic>;
    }

    return list.map((item) => BookingModel.fromJson(item as Map<String, dynamic>)).toList();
  }

  Future<BookingModel> cancelBooking(String bookingId) async {
    final response = await _client.patch('/bookings/$bookingId/cancel/');
    if (response is Map<String, dynamic>) {
      if (response['booking'] is Map<String, dynamic>) {
        return BookingModel.fromJson(response['booking']);
      }
      return BookingModel.fromJson(response);
    }
    throw Exception('Failed to cancel booking.');
  }

  Future<StatsModel> getStats() async {
    final response = await _client.get('/bookings/stats/');
    if (response is Map<String, dynamic>) {
      return StatsModel.fromJson(response);
    }
    return StatsModel();
  }

  Future<List<TimeSlotModel>> getAvailableSlots({
    required DateTime date,
    String? roomId,
  }) async {
    final dateStr = DateFormatter.formatIsoDate(date);
    final queryParams = <String, dynamic>{
      'date': dateStr,
    };
    if (roomId != null && roomId.isNotEmpty) {
      queryParams['room_id'] = roomId;
    }

    final response = await _client.get(
      '/bookings/available-slots/',
      queryParams: queryParams,
      requiresAuth: false,
    );

    if (response is Map<String, dynamic> && response['slots'] is List) {
      final list = response['slots'] as List<dynamic>;
      return list
          .map((item) => TimeSlotModel.fromJson(item as Map<String, dynamic>))
          .toList();
    }
    return [];
  }
}
