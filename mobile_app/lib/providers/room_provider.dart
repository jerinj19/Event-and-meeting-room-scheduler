import 'package:flutter/material.dart';
import '../core/network/api_exceptions.dart';
import '../data/models/room_model.dart';
import '../data/repositories/room_repository.dart';

class RoomProvider extends ChangeNotifier {
  final RoomRepository _repository;

  List<RoomModel> _rooms = [];
  RoomModel? _selectedRoom;
  bool _isLoading = false;
  String? _errorMessage;

  // Filter state
  String _searchQuery = '';
  int? _minCapacity;
  int? _maxCapacity;
  String? _selectedLocation;
  String? _selectedAmenity;
  bool? _isActiveFilter;

  RoomProvider({RoomRepository? repository})
      : _repository = repository ?? RoomRepository();

  List<RoomModel> get rooms => _rooms;
  RoomModel? get selectedRoom => _selectedRoom;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  String get searchQuery => _searchQuery;
  int? get minCapacity => _minCapacity;
  int? get maxCapacity => _maxCapacity;
  String? get selectedLocation => _selectedLocation;
  String? get selectedAmenity => _selectedAmenity;
  bool? get isActiveFilter => _isActiveFilter;

  bool get hasActiveFilters =>
      _searchQuery.isNotEmpty ||
      _minCapacity != null ||
      _maxCapacity != null ||
      (_selectedLocation != null && _selectedLocation != 'all') ||
      (_selectedAmenity != null && _selectedAmenity!.isNotEmpty) ||
      _isActiveFilter != null;

  List<String> get availableLocations {
    final locs = <String>{};
    for (final r in _rooms) {
      if (r.location.isNotEmpty) {
        locs.add(r.location);
      }
    }
    return locs.toList()..sort();
  }

  void clearError() {
    _errorMessage = null;
    notifyListeners();
  }

  Future<void> fetchRooms({bool resetFilterState = false}) async {
    if (resetFilterState) {
      _searchQuery = '';
      _minCapacity = null;
      _maxCapacity = null;
      _selectedLocation = null;
      _selectedAmenity = null;
      _isActiveFilter = null;
    }

    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      _rooms = await _repository.getRooms(
        search: _searchQuery,
        minCapacity: _minCapacity,
        maxCapacity: _maxCapacity,
        location: _selectedLocation,
        amenity: _selectedAmenity,
        isActive: _isActiveFilter,
      );
      _isLoading = false;
      notifyListeners();
    } on ApiException catch (e) {
      _errorMessage = e.message;
      _isLoading = false;
      notifyListeners();
    } catch (_) {
      _errorMessage = 'Failed to load rooms list.';
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> fetchRoomDetails(String id) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      _selectedRoom = await _repository.getRoom(id);
      _isLoading = false;
      notifyListeners();
    } on ApiException catch (e) {
      _errorMessage = e.message;
      _isLoading = false;
      notifyListeners();
    } catch (_) {
      _errorMessage = 'Failed to load room details.';
      _isLoading = false;
      notifyListeners();
    }
  }

  void setSearchQuery(String query) {
    _searchQuery = query;
    fetchRooms();
  }

  void setFilters({
    int? minCap,
    int? maxCap,
    String? location,
    String? amenity,
    bool? isActive,
  }) {
    _minCapacity = minCap;
    _maxCapacity = maxCap;
    _selectedLocation = location;
    _selectedAmenity = amenity;
    _isActiveFilter = isActive;
    fetchRooms();
  }

  void clearFilters() {
    _searchQuery = '';
    _minCapacity = null;
    _maxCapacity = null;
    _selectedLocation = null;
    _selectedAmenity = null;
    _isActiveFilter = null;
    fetchRooms();
  }

  // Admin Room Management
  Future<bool> createRoom({
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
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      await _repository.createRoom(
        name: name,
        capacity: capacity,
        location: location,
        amenities: amenities,
        hourlyRate: hourlyRate,
        isActive: isActive,
        floorArea: floorArea,
        avEquipment: avEquipment,
        acoustics: acoustics,
        connectivity: connectivity,
        image: image,
      );
      await fetchRooms();
      return true;
    } on ApiException catch (e) {
      _errorMessage = e.message;
      _isLoading = false;
      notifyListeners();
      return false;
    } catch (_) {
      _errorMessage = 'Failed to create room.';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> createRoomFromPayload(Map<String, dynamic> data) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      await _repository.createRoomPayload(data);
      await fetchRooms();
      return true;
    } on ApiException catch (e) {
      _errorMessage = e.message;
      _isLoading = false;
      notifyListeners();
      return false;
    } catch (_) {
      _errorMessage = 'Failed to create room.';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> updateRoom(String id, Map<String, dynamic> updates) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      await _repository.updateRoom(id, updates);
      await fetchRooms();
      return true;
    } on ApiException catch (e) {
      _errorMessage = e.message;
      _isLoading = false;
      notifyListeners();
      return false;
    } catch (_) {
      _errorMessage = 'Failed to update room.';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> toggleRoomStatus(String id, bool currentStatus) async {
    try {
      await _repository.toggleRoomStatus(id, currentStatus);
      await fetchRooms();
      return true;
    } catch (e) {
      _errorMessage = 'Failed to update room status.';
      notifyListeners();
      return false;
    }
  }

  Future<bool> deleteRoom(String id) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      await _repository.deleteRoom(id);
      await fetchRooms();
      return true;
    } on ApiException catch (e) {
      _errorMessage = e.message;
      _isLoading = false;
      notifyListeners();
      return false;
    } catch (_) {
      _errorMessage = 'Failed to delete room.';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }
}
