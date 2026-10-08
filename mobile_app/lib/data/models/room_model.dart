import 'dart:convert';
import '../../core/config/api_config.dart';

class RoomModel {
  final String id;
  final String name;
  final int capacity;
  final String location;
  final List<String> amenities;
  final double hourlyRate;
  final int? floorArea;
  final List<String> avEquipment;
  final String acoustics;
  final String connectivity;
  final bool isActive;
  final String? image;
  final List<String> images;
  final String? createdByEmail;
  final DateTime? createdAt;

  RoomModel({
    required this.id,
    required this.name,
    required this.capacity,
    required this.location,
    required this.amenities,
    this.hourlyRate = 0.0,
    this.floorArea,
    this.avEquipment = const [],
    this.acoustics = '',
    this.connectivity = '',
    this.isActive = true,
    this.image,
    this.images = const [],
    this.createdByEmail,
    this.createdAt,
  });

  String get formattedImageUrl {
    if (image != null && image!.trim().isNotEmpty) {
      final formatted = ApiConfig.formatImageUrl(image);
      if (formatted.isNotEmpty) return formatted;
    }
    if (images.isNotEmpty) {
      final formatted = ApiConfig.formatImageUrl(images.first);
      if (formatted.isNotEmpty) return formatted;
    }
    return ApiConfig.fallbackRoomImageUrl;
  }

  /// Returns all available photos for this space (cover photo + perspective gallery photos)
  List<String> get formattedImages {
    final list = <String>[];
    if (image != null && image!.trim().isNotEmpty) {
      final formatted = ApiConfig.formatImageUrl(image);
      if (formatted.isNotEmpty && !list.contains(formatted)) {
        list.add(formatted);
      }
    }
    for (final img in images) {
      final formatted = ApiConfig.formatImageUrl(img);
      if (formatted.isNotEmpty && !list.contains(formatted)) {
        list.add(formatted);
      }
    }
    if (list.isEmpty) {
      list.add(ApiConfig.fallbackRoomImageUrl);
    }
    return list;
  }

  factory RoomModel.fromJson(Map<String, dynamic> json) {
    // Parse amenities safely
    List<String> parsedAmenities = [];
    final rawAmenities = json['amenities'];
    if (rawAmenities is List) {
      parsedAmenities = rawAmenities.map((e) => e.toString().trim()).where((e) => e.isNotEmpty).toList();
    } else if (rawAmenities is String && rawAmenities.isNotEmpty) {
      try {
        final decoded = jsonDecode(rawAmenities);
        if (decoded is List) {
          parsedAmenities = decoded.map((e) => e.toString().trim()).where((e) => e.isNotEmpty).toList();
        }
      } catch (_) {
        parsedAmenities = rawAmenities.split(',').map((e) => e.trim()).where((e) => e.isNotEmpty).toList();
      }
    }

    // Parse av_equipment safely
    List<String> parsedAv = [];
    final rawAv = json['av_equipment'];
    if (rawAv is List) {
      parsedAv = rawAv.map((e) => e.toString().trim()).where((e) => e.isNotEmpty).toList();
    }

    // Parse perspective images
    List<String> parsedImages = [];
    final rawImages = json['images'];
    if (rawImages is List) {
      for (final img in rawImages) {
        if (img is Map<String, dynamic>) {
          final url = img['image_url'] ?? img['image'];
          if (url != null) parsedImages.add(url.toString());
        } else if (img is String) {
          parsedImages.add(img);
        }
      }
    }

    // Parse hourly rate
    double rate = 0.0;
    final rawRate = json['hourly_rate'] ?? json['hourlyRate'];
    if (rawRate != null) {
      rate = double.tryParse(rawRate.toString()) ?? 0.0;
    }

    return RoomModel(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? 'Meeting Room',
      capacity: json['capacity'] is int ? json['capacity'] : int.tryParse(json['capacity']?.toString() ?? '1') ?? 1,
      location: json['location']?.toString() ?? '',
      amenities: parsedAmenities,
      hourlyRate: rate,
      floorArea: json['floor_area'] is int ? json['floor_area'] : int.tryParse(json['floor_area']?.toString() ?? ''),
      avEquipment: parsedAv,
      acoustics: json['acoustics']?.toString() ?? '',
      connectivity: json['connectivity']?.toString() ?? '',
      isActive: json['is_active'] != false,
      image: json['image']?.toString(),
      images: parsedImages,
      createdByEmail: json['created_by_email']?.toString(),
      createdAt: json['created_at'] != null ? DateTime.tryParse(json['created_at'].toString()) : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'capacity': capacity,
      'location': location,
      'amenities': amenities,
      'hourly_rate': hourlyRate,
      'floor_area': floorArea,
      'av_equipment': avEquipment,
      'acoustics': acoustics,
      'connectivity': connectivity,
      'is_active': isActive,
      'image': image,
    };
  }
}
