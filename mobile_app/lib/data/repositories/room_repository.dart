import '../../core/network/api_client.dart';
import '../models/room_model.dart';

class RoomRepository {
  final ApiClient _client;

  RoomRepository({ApiClient? client}) : _client = client ?? ApiClient();

  Future<List<RoomModel>> getRooms({
    String? search,
    int? minCapacity,
    int? maxCapacity,
    String? location,
    String? amenity,
    bool? isActive,
  }) async {
    final queryParams = <String, dynamic>{};
    if (search != null && search.trim().isNotEmpty) {
      queryParams['search'] = search.trim();
    }
    if (minCapacity != null && minCapacity > 0) {
      queryParams['min_capacity'] = minCapacity;
    }
    if (maxCapacity != null && maxCapacity > 0) {
      queryParams['max_capacity'] = maxCapacity;
    }
    if (location != null && location.trim().isNotEmpty && location != 'all') {
      queryParams['location'] = location.trim();
    }
    if (amenity != null && amenity.trim().isNotEmpty) {
      queryParams['amenity'] = amenity.trim();
    }
    if (isActive != null) {
      queryParams['is_active'] = isActive;
    }

    final response = await _client.get('/rooms/', queryParams: queryParams);

    List<dynamic> list = [];
    if (response is List) {
      list = response;
    } else if (response is Map<String, dynamic> && response['results'] is List) {
      list = response['results'] as List<dynamic>;
    }

    return list.map((item) => RoomModel.fromJson(item as Map<String, dynamic>)).toList();
  }

  Future<RoomModel> getRoom(String id) async {
    final response = await _client.get('/rooms/$id/');
    if (response is Map<String, dynamic>) {
      return RoomModel.fromJson(response);
    }
    throw Exception('Failed to load room details.');
  }

  Future<RoomModel> createRoom({
    required String name,
    required int capacity,
    required String location,
    List<String> amenities = const [],
    double hourlyRate = 0.0,
    bool isActive = true,
    int? floorArea,
    List<String> avEquipment = const [],
    String acoustics = '',
    String connectivity = '',
    String? image,
  }) async {
    final body = <String, dynamic>{
      'name': name.trim(),
      'capacity': capacity,
      'location': location.trim(),
      'amenities': amenities,
      'hourly_rate': hourlyRate,
      'is_active': isActive,
      'av_equipment': avEquipment,
      'acoustics': acoustics,
      'connectivity': connectivity,
    };
    if (floorArea != null) {
      body['floor_area'] = floorArea;
    }
    if (image != null && image.isNotEmpty) {
      body['image'] = image;
    }

    final response = await _client.post('/rooms/', body: body);
    if (response is Map<String, dynamic>) {
      return RoomModel.fromJson(response);
    }
    throw Exception('Failed to create meeting room.');
  }

  Future<RoomModel> updateRoom(String id, Map<String, dynamic> updates) async {
    final response = await _client.patch('/rooms/$id/', body: updates);
    if (response is Map<String, dynamic>) {
      return RoomModel.fromJson(response);
    }
    throw Exception('Failed to update room.');
  }

  Future<RoomModel> toggleRoomStatus(String id, bool currentStatus) async {
    return await updateRoom(id, {'is_active': !currentStatus});
  }

  Future<void> deleteRoom(String id) async {
    await _client.delete('/rooms/$id/');
  }
}
