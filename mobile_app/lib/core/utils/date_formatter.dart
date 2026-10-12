import 'package:flutter/material.dart' show TimeOfDay;
import 'package:intl/intl.dart';

class DateFormatter {
  static final DateFormat _dateFormat = DateFormat('EEE, MMM d, yyyy');
  static final DateFormat _shortDateFormat = DateFormat('MMM d, yyyy');
  static final DateFormat _timeFormat = DateFormat('h:mm a');
  static final DateFormat _dateOnlyFormat = DateFormat('yyyy-MM-dd');

  static String formatFullDate(DateTime dateTime) {
    return _dateFormat.format(dateTime.toLocal());
  }

  static String formatShortDate(DateTime dateTime) {
    return _shortDateFormat.format(dateTime.toLocal());
  }

  static String formatTime(DateTime dateTime) {
    return _timeFormat.format(dateTime.toLocal());
  }

  static String formatDateOnly(DateTime dateTime) {
    return _dateOnlyFormat.format(dateTime.toLocal());
  }

  static String formatIsoDate(DateTime dateTime) {
    return _dateOnlyFormat.format(dateTime.toLocal());
  }

  static String formatTimeInterval(DateTime start, DateTime end) {
    final startStr = formatTime(start);
    final endStr = formatTime(end);
    return '$startStr – $endStr';
  }

  static String formatDurationMinutes(int minutes) {
    if (minutes < 60) return '$minutes mins';
    final hours = minutes ~/ 60;
    final remainingMinutes = minutes % 60;
    if (remainingMinutes == 0) return '${hours}h';
    return '${hours}h ${remainingMinutes}m';
  }

  static DateTime? tryParseIso(String? isoString) {
    if (isoString == null || isoString.isEmpty) return null;
    try {
      return DateTime.parse(isoString).toLocal();
    } catch (_) {
      return null;
    }
  }

  /// Converts a local date and time to ISO 8601 UTC string for Django
  static String toUtcIsoString(DateTime date, TimeOfDay time) {
    final combined = DateTime(
      date.year,
      date.month,
      date.day,
      time.hour,
      time.minute,
    );
    return combined.toUtc().toIso8601String();
  }

  static bool isPastTime(DateTime dateTime) {
    return dateTime.isBefore(DateTime.now());
  }
}
