import '../../core/network/api_client.dart';
import '../models/time_slot_model.dart';

class TimeSlotPaginationResult {
  final List<TimeSlotModel> slots;
  final int totalCount;
  final int totalPages;
  final int currentPage;

  TimeSlotPaginationResult({
    required this.slots,
    required this.totalCount,
    required this.totalPages,
    required this.currentPage,
  });
}

class TimeSlotRepository {
  final ApiClient _client;

  TimeSlotRepository({ApiClient? client}) : _client = client ?? ApiClient();

  Future<TimeSlotPaginationResult> getTimeSlots({
    int page = 1,
    int pageSize = 12,
    String? search,
    String? session,
    bool? isActive,
    String? room,
    String? period,
    String? dateType,
    String? startDate,
    String? endDate,
  }) async {
    final queryParams = <String, dynamic>{
      'page': page,
      'page_size': pageSize,
    };

    if (search != null && search.trim().isNotEmpty) {
      queryParams['search'] = search.trim();
    }
    if (session != null && session != 'all') {
      queryParams['session'] = session;
    }
    if (isActive != null) {
      queryParams['is_active'] = isActive;
    }
    if (room != null && room != 'all') {
      queryParams['room'] = room;
    }
    if (dateType != null && dateType != 'all') {
      queryParams['date_type'] = dateType;
    } else {
      queryParams['include_recurring'] = true;
    }
    if (period != null && period != 'all' && period != 'custom') {
      queryParams['period'] = period;
    } else if (period == 'custom') {
      queryParams['period'] = 'custom';
      if (startDate != null && startDate.isNotEmpty) {
        queryParams['start_date'] = startDate;
      }
      if (endDate != null && endDate.isNotEmpty) {
        queryParams['end_date'] = endDate;
      }
    }

    final response = await _client.get('/bookings/time-slots/', queryParams: queryParams);

    List<TimeSlotModel> slots = [];
    int totalCount = 0;
    int totalPages = 1;

    if (response is List) {
      slots = response.map((item) => TimeSlotModel.fromJson(item as Map<String, dynamic>)).toList();
      totalCount = slots.length;
      totalPages = 1;
    } else if (response is Map<String, dynamic>) {
      if (response['results'] is List) {
        slots = (response['results'] as List)
            .map((item) => TimeSlotModel.fromJson(item as Map<String, dynamic>))
            .toList();
      }
      totalCount = response['count'] is int ? response['count'] as int : slots.length;
      totalPages = response['total_pages'] is int
          ? response['total_pages'] as int
          : ((totalCount / pageSize).ceil() > 0 ? (totalCount / pageSize).ceil() : 1);
    }

    return TimeSlotPaginationResult(
      slots: slots,
      totalCount: totalCount,
      totalPages: totalPages,
      currentPage: page,
    );
  }

  Future<TimeSlotModel> toggleSlotStatus(String slotId, bool currentStatus) async {
    final response = await _client.patch(
      '/bookings/time-slots/$slotId/',
      body: {'is_active': !currentStatus},
    );
    if (response is Map<String, dynamic>) {
      return TimeSlotModel.fromJson(response);
    }
    throw Exception('Failed to update slot status.');
  }

  Future<TimeSlotModel> createSlot(Map<String, dynamic> data) async {
    final response = await _client.post(
      '/bookings/time-slots/',
      body: data,
    );
    if (response is Map<String, dynamic>) {
      return TimeSlotModel.fromJson(response);
    }
    throw Exception('Failed to create time slot.');
  }

  Future<TimeSlotModel> updateSlot(String slotId, Map<String, dynamic> data) async {
    final response = await _client.patch(
      '/bookings/time-slots/$slotId/',
      body: data,
    );
    if (response is Map<String, dynamic>) {
      return TimeSlotModel.fromJson(response);
    }
    throw Exception('Failed to update time slot.');
  }

  Future<void> deleteSlot(String slotId) async {
    await _client.delete('/bookings/time-slots/$slotId/');
  }

  Future<void> resetDefaults() async {
    await _client.post('/bookings/time-slots/reset-defaults/');
  }

  Future<void> bulkCreateSlots(dynamic payload) async {
    await _client.post(
      '/bookings/time-slots/bulk-create/',
      body: payload,
    );
  }
}
