import 'package:flutter/material.dart';
import '../data/models/time_slot_model.dart';
import '../data/repositories/time_slot_repository.dart';

class TimeSlotProvider extends ChangeNotifier {
  final TimeSlotRepository _repository;

  TimeSlotProvider({TimeSlotRepository? repository})
      : _repository = repository ?? TimeSlotRepository();

  List<TimeSlotModel> _slots = [];
  bool _loading = false;
  String? _actionLoadingId;
  String? _error;

  int _currentPage = 1;
  int _pageSize = 12;
  int _totalCount = 0;
  int _totalPages = 1;

  // Filters
  String _searchTerm = '';
  String _sessionFilter = 'all'; // all | morning | afternoon | evening
  String _roomFilter = 'all'; // all | global | roomId
  String _periodFilter = 'all'; // all | today | tomorrow | this_week | this_month | custom
  String _dateTypeFilter = 'all'; // all | recurring | dated
  String _customStartDate = '';
  String _customEndDate = '';
  String _statusFilter = 'all'; // all | active | inactive
  String _viewMode = 'grid'; // grid | table

  // Getters
  List<TimeSlotModel> get slots => _slots;
  bool get loading => _loading;
  String? get actionLoadingId => _actionLoadingId;
  String? get error => _error;

  int get currentPage => _currentPage;
  int get pageSize => _pageSize;
  int get totalCount => _totalCount;
  int get totalPages => _totalPages;

  String get searchTerm => _searchTerm;
  String get sessionFilter => _sessionFilter;
  String get roomFilter => _roomFilter;
  String get periodFilter => _periodFilter;
  String get dateTypeFilter => _dateTypeFilter;
  String get customStartDate => _customStartDate;
  String get customEndDate => _customEndDate;
  String get statusFilter => _statusFilter;
  String get viewMode => _viewMode;

  bool get hasActiveFilters =>
      _searchTerm.isNotEmpty ||
      _sessionFilter != 'all' ||
      _roomFilter != 'all' ||
      _periodFilter != 'all' ||
      _dateTypeFilter != 'all' ||
      _customStartDate.isNotEmpty ||
      _customEndDate.isNotEmpty ||
      _statusFilter != 'all';

  // KPI calculations matching Web AdminTimeSlotsPage.jsx
  int get kpiTotal => _totalCount;
  int get kpiActive => _slots.where((s) => s.isActive).length;
  int get kpiMorning => _slots.where((s) => s.period.toLowerCase() == 'morning').length;
  int get kpiAfternoon => _slots.where((s) => s.period.toLowerCase() == 'afternoon').length;
  int get kpiEvening => _slots.where((s) => s.period.toLowerCase() == 'evening').length;
  int get kpiDated => _slots.where((s) => s.date != null && s.date!.isNotEmpty).length;

  Future<void> fetchSlots() async {
    _loading = true;
    _error = null;
    notifyListeners();

    try {
      bool? activeParam;
      if (_statusFilter == 'active') activeParam = true;
      if (_statusFilter == 'inactive') activeParam = false;

      final result = await _repository.getTimeSlots(
        page: _currentPage,
        pageSize: _pageSize,
        search: _searchTerm,
        session: _sessionFilter,
        isActive: activeParam,
        room: _roomFilter,
        period: _periodFilter,
        dateType: _dateTypeFilter,
        startDate: _customStartDate,
        endDate: _customEndDate,
      );

      _slots = result.slots;
      _totalCount = result.totalCount;
      _totalPages = result.totalPages;
    } catch (e) {
      _error = e.toString();
      _slots = [];
      _totalCount = 0;
      _totalPages = 1;
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  void setSearchTerm(String term) {
    _searchTerm = term;
    _currentPage = 1;
    fetchSlots();
  }

  void setSessionFilter(String session) {
    _sessionFilter = session;
    _currentPage = 1;
    fetchSlots();
  }

  void setRoomFilter(String room) {
    _roomFilter = room;
    _currentPage = 1;
    fetchSlots();
  }

  void setPeriodFilter(String period) {
    _periodFilter = period;
    _currentPage = 1;
    fetchSlots();
  }

  void setDateTypeFilter(String dateType) {
    _dateTypeFilter = dateType;
    _currentPage = 1;
    fetchSlots();
  }

  void setCustomDateRange(String start, String end) {
    _customStartDate = start;
    _customEndDate = end;
    _currentPage = 1;
    fetchSlots();
  }

  void setStatusFilter(String status) {
    _statusFilter = status;
    _currentPage = 1;
    fetchSlots();
  }

  void setViewMode(String mode) {
    _viewMode = mode;
    notifyListeners();
  }

  void setPage(int page) {
    if (page < 1 || page > _totalPages) return;
    _currentPage = page;
    fetchSlots();
  }

  void setPageSize(int size) {
    _pageSize = size;
    _currentPage = 1;
    fetchSlots();
  }

  void clearFilters() {
    _searchTerm = '';
    _sessionFilter = 'all';
    _roomFilter = 'all';
    _periodFilter = 'all';
    _dateTypeFilter = 'all';
    _customStartDate = '';
    _customEndDate = '';
    _statusFilter = 'all';
    _currentPage = 1;
    fetchSlots();
  }

  Future<bool> toggleSlotStatus(TimeSlotModel slot) async {
    _actionLoadingId = slot.id;
    notifyListeners();

    try {
      final updated = await _repository.toggleSlotStatus(slot.id, slot.isActive);
      final index = _slots.indexWhere((s) => s.id == slot.id);
      if (index != -1) {
        _slots[index] = updated;
      } else {
        await fetchSlots();
      }
      return true;
    } catch (e) {
      _error = e.toString();
      return false;
    } finally {
      _actionLoadingId = null;
      notifyListeners();
    }
  }

  Future<bool> createSlot(Map<String, dynamic> data) async {
    try {
      await _repository.createSlot(data);
      await fetchSlots();
      return true;
    } catch (e) {
      _error = e.toString();
      return false;
    }
  }

  Future<bool> updateSlot(String id, Map<String, dynamic> data) async {
    try {
      final updated = await _repository.updateSlot(id, data);
      final index = _slots.indexWhere((s) => s.id == id);
      if (index != -1) {
        _slots[index] = updated;
        notifyListeners();
      } else {
        await fetchSlots();
      }
      return true;
    } catch (e) {
      _error = e.toString();
      return false;
    }
  }

  Future<bool> deleteSlot(String id) async {
    try {
      await _repository.deleteSlot(id);
      await fetchSlots();
      return true;
    } catch (e) {
      _error = e.toString();
      return false;
    }
  }

  Future<bool> resetDefaults() async {
    try {
      await _repository.resetDefaults();
      await fetchSlots();
      return true;
    } catch (e) {
      _error = e.toString();
      return false;
    }
  }

  Future<bool> bulkCreate(dynamic payload) async {
    try {
      await _repository.bulkCreateSlots(payload);
      await fetchSlots();
      return true;
    } catch (e) {
      _error = e.toString();
      return false;
    }
  }
}
