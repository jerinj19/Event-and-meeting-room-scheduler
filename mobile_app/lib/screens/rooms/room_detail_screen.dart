import 'package:flutter/material.dart';
import '../../core/config/api_config.dart';
import '../../core/theme/app_theme.dart';
import '../../data/models/room_model.dart';
import '../booking/book_room_screen.dart';

class RoomDetailScreen extends StatefulWidget {
  final RoomModel room;

  const RoomDetailScreen({super.key, required this.room});

  @override
  State<RoomDetailScreen> createState() => _RoomDetailScreenState();
}

class _RoomDetailScreenState extends State<RoomDetailScreen> {
  int _selectedPhotoIndex = 0;

  List<String> get _photos => widget.room.formattedImages;

  IconData _getAmenityIcon(String amenity) {
    final lower = amenity.toLowerCase();
    if (lower.contains('projector') || lower.contains('display') || lower.contains('screen') || lower.contains('oled')) {
      return Icons.tv_rounded;
    }
    if (lower.contains('wifi') || lower.contains('network') || lower.contains('internet')) {
      return Icons.wifi_rounded;
    }
    if (lower.contains('video') || lower.contains('camera') || lower.contains('conf')) {
      return Icons.videocam_rounded;
    }
    if (lower.contains('mic') || lower.contains('audio') || lower.contains('sound')) {
      return Icons.mic_rounded;
    }
    if (lower.contains('whiteboard') || lower.contains('board')) {
      return Icons.edit_note_rounded;
    }
    if (lower.contains('coffee') || lower.contains('tea') || lower.contains('water')) {
      return Icons.local_cafe_rounded;
    }
    if (lower.contains('table') || lower.contains('desk') || lower.contains('chair')) {
      return Icons.chair_rounded;
    }
    return Icons.check_circle_outline_rounded;
  }

  void _showFullScreenImage(String imageUrl) {
    showDialog(
      context: context,
      builder: (ctx) => Dialog(
        backgroundColor: Colors.transparent,
        insetPadding: const EdgeInsets.all(12),
        child: Stack(
          alignment: Alignment.topRight,
          children: [
            InteractiveViewer(
              panEnabled: true,
              boundaryMargin: const EdgeInsets.all(20),
              minScale: 0.5,
              maxScale: 4.0,
              child: ClipRRect(
                borderRadius: BorderRadius.circular(16),
                child: Image.network(
                  imageUrl,
                  fit: BoxFit.contain,
                  errorBuilder: (context, error, stackTrace) => Image.network(
                    ApiConfig.fallbackRoomImageUrl,
                    fit: BoxFit.contain,
                  ),
                ),
              ),
            ),
            Positioned(
              top: 8,
              right: 8,
              child: CircleAvatar(
                backgroundColor: Colors.black.withValues(alpha: 0.65),
                child: IconButton(
                  icon: const Icon(Icons.close_rounded, color: Colors.white),
                  onPressed: () => Navigator.of(ctx).pop(),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHeaderImage(String imageUrl) {
    if (imageUrl.isEmpty) {
      return _buildHeaderFallbackImage();
    }
    return Image.network(
      imageUrl,
      fit: BoxFit.cover,
      loadingBuilder: (context, child, loadingProgress) {
        if (loadingProgress == null) return child;
        return Container(
          color: AppTheme.primaryDark,
          child: const Center(
            child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
          ),
        );
      },
      errorBuilder: (context, error, stackTrace) => _buildHeaderFallbackImage(),
    );
  }

  Widget _buildHeaderFallbackImage() {
    return Image.network(
      ApiConfig.fallbackRoomImageUrl,
      fit: BoxFit.cover,
      errorBuilder: (context, error, stackTrace) => _buildHeaderPlaceholder(),
    );
  }

  Widget _buildHeaderPlaceholder() {
    return Container(
      color: AppTheme.primaryDark,
      child: const Center(
        child: Icon(Icons.meeting_room_rounded, size: 64, color: Colors.white30),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final room = widget.room;
    final photos = _photos;
    final currentPhoto = (_selectedPhotoIndex < photos.length)
        ? photos[_selectedPhotoIndex]
        : (photos.isNotEmpty ? photos.first : '');

    return Scaffold(
      backgroundColor: AppTheme.background,
      body: CustomScrollView(
        slivers: [
          // Collapsible Image Header
          SliverAppBar(
            expandedHeight: 250,
            pinned: true,
            backgroundColor: AppTheme.primary,
            foregroundColor: Colors.white,
            flexibleSpace: FlexibleSpaceBar(
              background: Stack(
                fit: StackFit.expand,
                children: [
                  GestureDetector(
                    onTap: () {
                      if (currentPhoto.isNotEmpty) {
                        _showFullScreenImage(currentPhoto);
                      }
                    },
                    child: AnimatedSwitcher(
                      duration: const Duration(milliseconds: 300),
                      child: SizedBox(
                        key: ValueKey<String>(currentPhoto),
                        width: double.infinity,
                        height: double.infinity,
                        child: _buildHeaderImage(currentPhoto),
                      ),
                    ),
                  ),
                  // Dark gradient overlay
                  Container(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [
                          Colors.black.withValues(alpha: 0.4),
                          Colors.transparent,
                          Colors.black.withValues(alpha: 0.7),
                        ],
                      ),
                    ),
                  ),

                  // Photo index & navigation controls
                  if (photos.length > 1) ...[
                    Positioned(
                      top: 40,
                      right: 16,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.black.withValues(alpha: 0.65),
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.photo_library_rounded, size: 12, color: Colors.white),
                            const SizedBox(width: 5),
                            Text(
                              '${_selectedPhotoIndex + 1} / ${photos.length}',
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    // Left arrow button
                    if (_selectedPhotoIndex > 0)
                      Positioned(
                        left: 8,
                        top: 110,
                        child: CircleAvatar(
                          radius: 18,
                          backgroundColor: Colors.black.withValues(alpha: 0.5),
                          child: IconButton(
                            padding: EdgeInsets.zero,
                            icon: const Icon(Icons.chevron_left_rounded, color: Colors.white, size: 24),
                            onPressed: () {
                              setState(() {
                                _selectedPhotoIndex--;
                              });
                            },
                          ),
                        ),
                      ),
                    // Right arrow button
                    if (_selectedPhotoIndex < photos.length - 1)
                      Positioned(
                        right: 8,
                        top: 110,
                        child: CircleAvatar(
                          radius: 18,
                          backgroundColor: Colors.black.withValues(alpha: 0.5),
                          child: IconButton(
                            padding: EdgeInsets.zero,
                            icon: const Icon(Icons.chevron_right_rounded, color: Colors.white, size: 24),
                            onPressed: () {
                              setState(() {
                                _selectedPhotoIndex++;
                              });
                            },
                          ),
                        ),
                      ),
                  ],

                  // Title and status badge
                  Positioned(
                    bottom: 16,
                    left: 20,
                    right: 20,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: room.isActive ? AppTheme.success : AppTheme.error,
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Text(
                            room.isActive ? 'Active & Available' : 'Under Maintenance',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          room.name,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 22,
                            fontWeight: FontWeight.w800,
                            letterSpacing: -0.5,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Details Body
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Photo Gallery Section (if multiple or even single photos exist)
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.photo_library_outlined, size: 18, color: AppTheme.primary),
                          const SizedBox(width: 8),
                          Text(
                            'Room Gallery (${photos.length} ${photos.length == 1 ? 'Photo' : 'Perspectives'})',
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w700,
                              color: AppTheme.textPrimary,
                            ),
                          ),
                        ],
                      ),
                      TextButton.icon(
                        onPressed: () => _showFullScreenImage(currentPhoto),
                        icon: const Icon(Icons.fullscreen_rounded, size: 16),
                        label: const Text('Expand', style: TextStyle(fontSize: 12)),
                        style: TextButton.styleFrom(
                          visualDensity: VisualDensity.compact,
                          padding: EdgeInsets.zero,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  SizedBox(
                    height: 85,
                    child: ListView.separated(
                      scrollDirection: Axis.horizontal,
                      itemCount: photos.length,
                      separatorBuilder: (_, _) => const SizedBox(width: 10),
                      itemBuilder: (ctx, idx) {
                        final isSelected = _selectedPhotoIndex == idx;
                        final photoUrl = photos[idx];
                        return GestureDetector(
                          onTap: () {
                            setState(() {
                              _selectedPhotoIndex = idx;
                            });
                          },
                          child: Container(
                            width: 120,
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: isSelected ? AppTheme.primary : AppTheme.border,
                                width: isSelected ? 2.5 : 1.0,
                              ),
                              boxShadow: [
                                if (isSelected)
                                  BoxShadow(
                                    color: AppTheme.primary.withValues(alpha: 0.3),
                                    blurRadius: 8,
                                    offset: const Offset(0, 2),
                                  ),
                              ],
                            ),
                            clipBehavior: Clip.antiAlias,
                            child: Stack(
                              fit: StackFit.expand,
                              children: [
                                Image.network(
                                  photoUrl,
                                  fit: BoxFit.cover,
                                  loadingBuilder: (c, child, progress) {
                                    if (progress == null) return child;
                                    return Container(
                                      color: AppTheme.borderSubtle,
                                      child: const Center(
                                        child: SizedBox(
                                          width: 16,
                                          height: 16,
                                          child: CircularProgressIndicator(strokeWidth: 2),
                                        ),
                                      ),
                                    );
                                  },
                                  errorBuilder: (c, err, trace) => Image.network(
                                    ApiConfig.fallbackRoomImageUrl,
                                    fit: BoxFit.cover,
                                  ),
                                ),
                                if (isSelected)
                                  Container(
                                    color: AppTheme.primary.withValues(alpha: 0.15),
                                    alignment: Alignment.topRight,
                                    padding: const EdgeInsets.all(4),
                                    child: const Icon(Icons.check_circle, size: 16, color: Colors.white),
                                  ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                  const SizedBox(height: 20),

                  // Location and Rate Summary Card
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: AppTheme.surface,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: AppTheme.border),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(10),
                                decoration: BoxDecoration(
                                  color: AppTheme.primaryLight,
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: const Icon(Icons.location_on_rounded, color: AppTheme.primary, size: 22),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text(
                                      'Location',
                                      style: TextStyle(fontSize: 11, color: AppTheme.textSecondary, fontWeight: FontWeight.w600),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      room.location,
                                      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppTheme.textPrimary),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                        if (room.hourlyRate > 0)
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              const Text(
                                'Rental Rate',
                                style: TextStyle(fontSize: 11, color: AppTheme.textSecondary, fontWeight: FontWeight.w600),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                '₹${room.hourlyRate.toStringAsFixed(0)}/hr',
                                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppTheme.primary),
                              ),
                            ],
                          ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),

                  // Room Specs Grid
                  const Text(
                    'Space Specifications',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: AppTheme.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: AppTheme.surface,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: AppTheme.border),
                    ),
                    child: Column(
                      children: [
                        _buildSpecRow(
                          icon: Icons.people_alt_rounded,
                          label: 'Seating Capacity',
                          value: '${room.capacity} Attendees',
                        ),
                        if (room.floorArea != null) ...[
                          const Divider(height: 20),
                          _buildSpecRow(
                            icon: Icons.square_foot_rounded,
                            label: 'Floor Area',
                            value: '${room.floorArea} sq ft',
                          ),
                        ],
                        if (room.connectivity.isNotEmpty) ...[
                          const Divider(height: 20),
                          _buildSpecRow(
                            icon: Icons.wifi_tethering_rounded,
                            label: 'Connectivity',
                            value: room.connectivity,
                          ),
                        ],
                        if (room.acoustics.isNotEmpty) ...[
                          const Divider(height: 20),
                          _buildSpecRow(
                            icon: Icons.graphic_eq_rounded,
                            label: 'Acoustics',
                            value: room.acoustics,
                          ),
                        ],
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Amenities List
                  const Text(
                    'Available Assets & Amenities',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: AppTheme.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 12),
                  if (room.amenities.isEmpty)
                    const Text('Standard meeting setup provided.', style: TextStyle(color: AppTheme.textSecondary))
                  else
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: room.amenities.map((amenity) {
                        return Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          decoration: BoxDecoration(
                            color: AppTheme.surface,
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: AppTheme.border),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(_getAmenityIcon(amenity), size: 16, color: AppTheme.primary),
                              const SizedBox(width: 8),
                              Text(
                                amenity,
                                style: const TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w600,
                                  color: AppTheme.textPrimary,
                                ),
                              ),
                            ],
                          ),
                        );
                      }).toList(),
                    ),
                  const SizedBox(height: 24),

                  // AV Equipment
                  if (room.avEquipment.isNotEmpty) ...[
                    const Text(
                      'Audio & Video Equipment',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: AppTheme.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: room.avEquipment.map((equip) {
                        return Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          decoration: BoxDecoration(
                            color: AppTheme.accentLight,
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: AppTheme.accent.withValues(alpha: 0.3)),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.settings_input_component_rounded, size: 16, color: AppTheme.accent),
                              const SizedBox(width: 8),
                              Text(
                                equip,
                                style: const TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w600,
                                  color: AppTheme.textPrimary,
                                ),
                              ),
                            ],
                          ),
                        );
                      }).toList(),
                    ),
                    const SizedBox(height: 24),
                  ],

                  const SizedBox(height: 60), // Space for bottom bar
                ],
              ),
            ),
          ),
        ],
      ),
      bottomNavigationBar: Container(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
        decoration: BoxDecoration(
          color: AppTheme.surface,
          border: const Border(top: BorderSide(color: AppTheme.border)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.05),
              blurRadius: 10,
              offset: const Offset(0, -2),
            ),
          ],
        ),
        child: SafeArea(
          child: ElevatedButton(
            onPressed: room.isActive
                ? () {
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => BookRoomScreen(preselectedRoom: room),
                      ),
                    );
                  }
                : null,
            style: ElevatedButton.styleFrom(
              minimumSize: const Size.fromHeight(50),
            ),
            child: Text(
              room.isActive ? 'Schedule This Room' : 'Currently Under Maintenance',
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSpecRow({
    required IconData icon,
    required String label,
    required String value,
  }) {
    return Row(
      children: [
        Icon(icon, size: 20, color: AppTheme.textSecondary),
        const SizedBox(width: 12),
        Expanded(
          child: Text(
            label,
            style: const TextStyle(fontSize: 13, color: AppTheme.textSecondary, fontWeight: FontWeight.w500),
          ),
        ),
        Text(
          value,
          style: const TextStyle(fontSize: 13, color: AppTheme.textPrimary, fontWeight: FontWeight.w700),
        ),
      ],
    );
  }
}
