import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_app/core/config/api_config.dart';
import 'package:mobile_app/core/utils/date_formatter.dart';
import 'package:mobile_app/core/utils/validators.dart';
import 'package:mobile_app/data/models/booking_model.dart';
import 'package:mobile_app/data/models/conflict_model.dart';
import 'package:mobile_app/data/models/room_model.dart';
import 'package:mobile_app/data/models/stats_model.dart';
import 'package:mobile_app/data/models/time_slot_model.dart';
import 'package:mobile_app/data/models/user_model.dart';

void main() {
  group('UserModel Tests', () {
    test('Parses UserModel from Django JSON response correctly', () {
      final json = {
        'id': '919983e4-40da-4273-a271-2902f973a3d4',
        'email': 'alex@innovyx.com',
        'first_name': 'Alex',
        'last_name': 'Morgan',
        'department': 'Engineering',
        'is_active': true,
        'is_staff': false,
        'is_owner': false,
        'date_joined': '2026-09-18T09:30:00Z',
      };

      final user = UserModel.fromJson(json);
      expect(user.id, '919983e4-40da-4273-a271-2902f973a3d4');
      expect(user.email, 'alex@innovyx.com');
      expect(user.fullName, 'Alex Morgan');
      expect(user.department, 'Engineering');
      expect(user.isStaff, false);
    });

    test('Identifies admin role if email contains admin', () {
      final json = {
        'id': 'admin-uuid',
        'email': 'admin@innovyx.com',
        'first_name': 'Super',
        'last_name': 'Admin',
        'is_staff': false,
      };

      final user = UserModel.fromJson(json);
      expect(user.isStaff, true);
    });
  });

  group('RoomModel Tests', () {
    test('Parses room with list amenities and hourly rate', () {
      final json = {
        'id': 'room-1',
        'name': 'Apollo Conference Hall',
        'capacity': 16,
        'location': 'Floor 2, Wing B',
        'amenities': ['4K Projector', 'Whiteboard'],
        'hourly_rate': '1100.00',
        'is_active': true,
      };

      final room = RoomModel.fromJson(json);
      expect(room.name, 'Apollo Conference Hall');
      expect(room.capacity, 16);
      expect(room.hourlyRate, 1100.0);
      expect(room.amenities.length, 2);
      expect(room.isActive, true);
    });

    test('Parses string amenities if returned as JSON string', () {
      final json = {
        'id': 'room-2',
        'name': 'Focus Pod Gamma',
        'capacity': 4,
        'location': 'Koramangala',
        'amenities': '["Display Screen", "WiFi 6"]',
        'hourly_rate': 350,
      };

      final room = RoomModel.fromJson(json);
      expect(room.amenities, ['Display Screen', 'WiFi 6']);
      expect(room.hourlyRate, 350.0);
    });

    test('Formats room cover and gallery perspective images properly', () {
      final json = {
        'id': 'room-3',
        'name': 'Executive Suite',
        'capacity': 10,
        'location': 'Wing A',
        'amenities': [],
        'image': 'http://127.0.0.1:8000/media/room_images/1.jpg',
        'images': [
          {'image_url': 'http://127.0.0.1:8000/media/room_images/room2.jpg'},
          {'image_url': '/media/room_images/thub.jpg'},
        ],
      };

      final room = RoomModel.fromJson(json);
      expect(room.formattedImageUrl.contains('/media/room_images/1.jpg'), true);
      expect(room.formattedImages.length, 3);
      expect(room.formattedImages[0].contains('/media/room_images/1.jpg'), true);
      expect(room.formattedImages[1].contains('/media/room_images/room2.jpg'), true);
      expect(room.formattedImages[2].contains('/media/room_images/thub.jpg'), true);
    });

    test('Provides fallback image when room image is missing', () {
      final json = {
        'id': 'room-4',
        'name': 'Basic Pod',
        'capacity': 2,
        'location': 'Wing B',
        'amenities': [],
        'image': null,
        'images': [],
      };

      final room = RoomModel.fromJson(json);
      expect(room.formattedImageUrl, ApiConfig.fallbackRoomImageUrl);
      expect(room.formattedImages, [ApiConfig.fallbackRoomImageUrl]);
    });
  });

  group('BookingModel & ConflictModel Tests', () {
    test('Calculates booking duration, status, and labels', () {
      final now = DateTime.now();
      final startTime = now.add(const Duration(hours: 1));
      final endTime = startTime.add(const Duration(minutes: 90));

      final json = {
        'id': 'bkg-1',
        'room': 'room-1',
        'room_name': 'Apollo Conference Hall',
        'room_location': 'Floor 2',
        'room_capacity': 16,
        'title': 'Sprint Review',
        'start_time': startTime.toIso8601String(),
        'end_time': endTime.toIso8601String(),
        'attendees_count': 6,
        'status': 'CONFIRMED',
      };

      final booking = BookingModel.fromJson(json);
      expect(booking.title, 'Sprint Review');
      expect(booking.durationMinutes, 90);
      expect(booking.isConfirmed, true);
      expect(booking.isCancelled, false);
      expect(booking.isPast, false);
    });

    test('Parses conflict details accurately', () {
      final json = {
        'id': 'conflict-uuid',
        'title': 'Design Review',
        'start_time': '2026-10-10T10:00:00Z',
        'end_time': '2026-10-10T11:00:00Z',
        'booked_by': 'lead@innovyx.com',
        'status': 'CONFIRMED',
      };

      final conflict = ConflictModel.fromJson(json);
      expect(conflict.title, 'Design Review');
      expect(conflict.bookedBy, 'lead@innovyx.com');
      expect(conflict.timeInterval.isNotEmpty, true);
    });
  });

  group('StatsModel Tests', () {
    test('Parses backend statistics payload', () {
      final json = {
        'total_bookings': 42,
        'confirmed_bookings': 35,
        'cancelled_bookings': 7,
        'today_bookings': 6,
        'upcoming_bookings': 18,
        'utilization_rate': 78.5,
      };

      final stats = StatsModel.fromJson(json);
      expect(stats.totalBookings, 42);
      expect(stats.confirmedBookings, 35);
      expect(stats.cancelledBookings, 7);
      expect(stats.utilizationRate, 78.5);
    });
  });

  group('Validators & DateFormatter Tests', () {
    test('Email validator enforces valid syntax', () {
      expect(Validators.email(''), 'Email address is required');
      expect(Validators.email('not-an-email'), 'Please enter a valid email address');
      expect(Validators.email('alex@innovyx.com'), null);
    });

    test('Password validator enforces 8-character minimum', () {
      expect(Validators.password('short'), 'Password must be at least 8 characters long');
      expect(Validators.password('StrongPassword123!'), null);
    });

    test('Confirm password validator ensures equality', () {
      expect(Validators.confirmPassword('pass1', 'pass2'), 'Passwords do not match');
      expect(Validators.confirmPassword('secure123', 'secure123'), null);
    });

    test('DateFormatter formats duration labels nicely', () {
      expect(DateFormatter.formatDurationMinutes(45), '45 mins');
      expect(DateFormatter.formatDurationMinutes(60), '1h');
      expect(DateFormatter.formatDurationMinutes(90), '1h 30m');
    });
  });

  group('TimeSlotModel Tests', () {
    test('Parses TimeSlotModel and computes start/end times and selectability', () {
      final json = {
        'id': 'slot-1',
        'start': '09:00',
        'end': '10:30',
        'label': '09:00 – 10:30 AM',
        'duration': '90 mins',
        'period': 'morning',
        'is_booked': false,
        'is_past': false,
        'is_current': false,
        'is_active': true,
      };

      final slot = TimeSlotModel.fromJson(json);
      expect(slot.id, 'slot-1');
      expect(slot.startHour, 9);
      expect(slot.startMinute, 0);
      expect(slot.endHour, 10);
      expect(slot.endMinute, 30);
      expect(slot.isSelectable, true);
    });

    test('Marks booked or past slots as non-selectable', () {
      final booked = TimeSlotModel(
        id: 'slot-2',
        start: '11:00',
        end: '12:00',
        label: '11:00 – 12:00 PM',
        duration: '60 mins',
        period: 'morning',
        isBooked: true,
      );
      expect(booked.isSelectable, false);

      final past = TimeSlotModel(
        id: 'slot-3',
        start: '08:00',
        end: '09:00',
        label: '08:00 – 09:00 AM',
        duration: '60 mins',
        period: 'morning',
        isPast: true,
      );
      expect(past.isSelectable, false);
    });
  });
}
