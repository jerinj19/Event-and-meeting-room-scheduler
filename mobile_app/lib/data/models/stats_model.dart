class StatsModel {
  final int totalBookings;
  final int confirmedBookings;
  final int cancelledBookings;
  final int todayBookings;
  final int upcomingBookings;
  final double utilizationRate;
  final double efficiencyRate;
  final int totalRoomsCount;
  final int maintenanceRoomsCount;
  final String peakTime;
  final double cancelledHours;
  final double confirmedHours;

  StatsModel({
    this.totalBookings = 0,
    this.confirmedBookings = 0,
    this.cancelledBookings = 0,
    this.todayBookings = 0,
    this.upcomingBookings = 0,
    this.utilizationRate = 0.0,
    this.efficiencyRate = 0.0,
    this.totalRoomsCount = 0,
    this.maintenanceRoomsCount = 0,
    this.peakTime = 'N/A',
    this.cancelledHours = 0.0,
    this.confirmedHours = 0.0,
  });

  int get activeRooms => totalRoomsCount - maintenanceRoomsCount;

  factory StatsModel.fromJson(Map<String, dynamic> json) {
    return StatsModel(
      totalBookings: int.tryParse(json['total_bookings']?.toString() ?? '0') ?? 0,
      confirmedBookings: int.tryParse(json['confirmed_bookings']?.toString() ?? '0') ?? 0,
      cancelledBookings: int.tryParse(json['cancelled_bookings']?.toString() ?? '0') ?? 0,
      todayBookings: int.tryParse(json['today_bookings']?.toString() ?? '0') ?? 0,
      upcomingBookings: int.tryParse(json['upcoming_bookings']?.toString() ?? '0') ?? 0,
      utilizationRate: double.tryParse(json['utilization_rate']?.toString() ?? '0') ?? 0.0,
      efficiencyRate: double.tryParse(json['efficiency_rate']?.toString() ?? '0') ?? 0.0,
      totalRoomsCount: int.tryParse(json['total_rooms_count']?.toString() ?? '0') ?? 0,
      maintenanceRoomsCount: int.tryParse(json['maintenance_rooms_count']?.toString() ?? '0') ?? 0,
      peakTime: json['peak_time']?.toString() ?? 'N/A',
      cancelledHours: double.tryParse(json['cancelled_hours']?.toString() ?? '0') ?? 0.0,
      confirmedHours: double.tryParse(json['confirmed_hours']?.toString() ?? '0') ?? 0.0,
    );
  }
}
