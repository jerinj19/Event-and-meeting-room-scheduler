import 'package:flutter/material.dart';
import '../core/network/api_exceptions.dart';
import '../data/models/booking_model.dart';
import '../data/models/conflict_model.dart';
import '../data/models/stats_model.dart';
import '../data/models/time_slot_model.dart';
import '../data/repositories/booking_repository.dart';

class BookingProvider extends ChangeNotifier {
  final BookingRepository _repository;

  List<BookingModel> _myBookings = [];
  List<BookingModel> _allAdminBookings = [];
  StatsModel _stats = StatsModel();

  AvailabilityCheckResult? _availabilityResult;
  bool _isCheckingAvailability = false;

  List<TimeSlotModel> _availableSlots = [];
  bool _isLoadingSlots = false;

  bool _isLoading = false;
  bool _isSubmitting = false;
  String? _errorMessage;
  List<ConflictModel> _lastConflictDetails = [];

  BookingProvider({BookingRepository? repository})
      : _repository = repository ?? BookingRepository();

  List<BookingModel> get myBookings => _myBookings;

  List<BookingModel> get upcomingBookings =>
      _myBookings.where((b) => !b.isPast && !b.isCancelled).toList();

  List<BookingModel> get pastBookings =>
      _myBookings.where((b) => b.isPast || b.isCancelled).toList();

  List<BookingModel> get allAdminBookings => _allAdminBookings;
  StatsModel get stats => _stats;

  AvailabilityCheckResult? get availabilityResult => _availabilityResult;
  bool get isCheckingAvailability => _isCheckingAvailability;
  List<TimeSlotModel> get availableSlots => _availableSlots;
  bool get isLoadingSlots => _isLoadingSlots;
  bool get isLoading => _isLoading;
  bool get isSubmitting => _isSubmitting;
  String? get errorMessage => _errorMessage;
  List<ConflictModel> get lastConflictDetails => _lastConflictDetails;

  void clearError() {
    _errorMessage = null;
    _lastConflictDetails = [];
    notifyListeners();
  }

  void clearAvailability() {
    _availabilityResult = null;
    _isCheckingAvailability = false;
    notifyListeners();
  }

  Future<void> fetchStats() async {
    try {
      _stats = await _repository.getStats();
      notifyListeners();
    } catch (_) {}
  }

  Future<void> fetchDashboardStats() => fetchStats();

  Future<void> fetchMyBookings() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      _myBookings = await _repository.getMyBookings();
      _isLoading = false;
      notifyListeners();
      // Also silently refresh stats
      fetchStats();
    } on ApiException catch (e) {
      _errorMessage = e.message;
      _isLoading = false;
      notifyListeners();
    } catch (_) {
      _errorMessage = 'Failed to load reservations.';
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> fetchAllAdminBookings({
    String? search,
    String? status,
    String? date,
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      _allAdminBookings = await _repository.getAllBookings(
        search: search,
        status: status,
        date: date,
      );
      _isLoading = false;
      notifyListeners();
      fetchStats();
    } on ApiException catch (e) {
      _errorMessage = e.message;
      _isLoading = false;
      notifyListeners();
    } catch (_) {
      _errorMessage = 'Failed to load enterprise bookings.';
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<AvailabilityCheckResult?> checkAvailability({
    required String roomId,
    required DateTime startTime,
    required DateTime endTime,
  }) async {
    _isCheckingAvailability = true;
    notifyListeners();

    try {
      final result = await _repository.checkAvailability(
        roomId: roomId,
        startTime: startTime,
        endTime: endTime,
      );
      _availabilityResult = result;
      _isCheckingAvailability = false;
      notifyListeners();
      return result;
    } on ApiException catch (e) {
      _errorMessage = e.message;
      _isCheckingAvailability = false;
      notifyListeners();
      return null;
    } catch (_) {
      _isCheckingAvailability = false;
      notifyListeners();
      return null;
    }
  }

  Future<void> fetchAvailableSlots({
    required DateTime date,
    String? roomId,
  }) async {
    _isLoadingSlots = true;
    notifyListeners();

    try {
      _availableSlots = await _repository.getAvailableSlots(
        date: date,
        roomId: roomId,
      );
    } catch (_) {
      _availableSlots = [];
    } finally {
      _isLoadingSlots = false;
      notifyListeners();
    }
  }

  Future<BookingModel?> createBooking({
    required String roomId,
    required String title,
    required DateTime startTime,
    required DateTime endTime,
    int attendeesCount = 1,
    String description = '',
  }) async {
    _isSubmitting = true;
    _errorMessage = null;
    _lastConflictDetails = [];
    notifyListeners();

    try {
      final booking = await _repository.createBooking(
        roomId: roomId,
        title: title,
        startTime: startTime,
        endTime: endTime,
        attendeesCount: attendeesCount,
        description: description,
      );

      _isSubmitting = false;
      // Refresh my bookings list
      await fetchMyBookings();
      notifyListeners();
      return booking;
    } on ApiException catch (e) {
      _isSubmitting = false;
      _errorMessage = e.message;

      if (e.isConflict && e.conflicts != null) {
        _lastConflictDetails = e.conflicts!
            .map((c) => ConflictModel.fromJson(c as Map<String, dynamic>))
            .toList();
      }

      notifyListeners();
      return null;
    } catch (e) {
      _isSubmitting = false;
      _errorMessage = 'An error occurred while reserving the meeting room.';
      notifyListeners();
      return null;
    }
  }

  Future<bool> cancelBooking(String bookingId) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final updatedBooking = await _repository.cancelBooking(bookingId);

      // Update in myBookings list
      final index = _myBookings.indexWhere((b) => b.id == bookingId);
      if (index != -1) {
        _myBookings[index] = updatedBooking;
      }

      // Update in admin list if present
      final adminIndex = _allAdminBookings.indexWhere((b) => b.id == bookingId);
      if (adminIndex != -1) {
        _allAdminBookings[adminIndex] = updatedBooking;
      }

      _isLoading = false;
      notifyListeners();
      fetchStats();
      return true;
    } on ApiException catch (e) {
      _errorMessage = e.message;
      _isLoading = false;
      notifyListeners();
      return false;
    } catch (_) {
      _errorMessage = 'Failed to cancel reservation.';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }
}
