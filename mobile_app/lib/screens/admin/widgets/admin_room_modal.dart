import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';
import '../../../data/india_locations.dart';
import '../../../data/models/room_model.dart';

class AdminRoomModal extends StatefulWidget {
  final RoomModel? room;
  final Future<void> Function(Map<String, dynamic> data) onSave;
  final VoidCallback? onDeleteRequest;

  const AdminRoomModal({
    super.key,
    this.room,
    required this.onSave,
    this.onDeleteRequest,
  });

  @override
  State<AdminRoomModal> createState() => _AdminRoomModalState();
}

class _AdminRoomModalState extends State<AdminRoomModal> {
  final _formKey = GlobalKey<FormState>();

  bool get isEditMode => widget.room != null;

  // Controllers
  late final TextEditingController _nameController;
  late final TextEditingController _codeController;
  late final TextEditingController _capacityController;
  late final TextEditingController _floorAreaController;
  late final TextEditingController _billingRateController;
  final TextEditingController _customAvController = TextEditingController();
  final TextEditingController _customAmenityController = TextEditingController();
  final TextEditingController _imageUrlController = TextEditingController();

  // Location State
  String _selectedState = '';
  String _selectedCity = '';

  // Operational State
  bool _isActive = true;

  // Specifications
  List<String> _selectedAvEquipment = [];
  String _acoustics = '';
  String _connectivity = '';
  List<String> _selectedAmenities = [];

  // Photography State: list of maps { 'url': String, 'isPrimary': bool }
  List<Map<String, dynamic>> _photos = [];

  bool _isSaving = false;
  bool _isAvDropdownOpen = false;

  static const List<String> presetAmenities = [
    'Display Screen',
    'Wi-Fi 6',
    'Standing Desk',
    '4K Display Screen',
    'Polycom PTZ Video Conf',
    'Magnetic Glass Whiteboard',
    'Soundproof Acoustic Paneling',
    'High-Speed Wi-Fi 6E',
    'Beamforming Mic Array',
    'Conference Phone Station',
    'Coffee / Refreshment Bar',
  ];

  static const List<String> presetAvEquipment = [
    'Dual 65" 4K Sony Bravia Commercial Displays',
    'Polycom Studio 4K Auto-Tracking PTZ Camera',
    'Biamp Beamforming Ceiling Array Microphones',
    'Wireless Screen Sharing (AirPlay, Miracast, HDMI/USB-C)',
  ];

  static const List<Map<String, String>> acousticsOptions = [
    {
      'title': 'NRC 0.88 - Soundproofed Glazing',
      'subtitle': 'High acoustic absorption, soundproofed glass and quiet interior',
      'value': 'NRC 0.88 - Soundproofed Glazing',
    },
    {
      'title': 'None / Not Specified',
      'subtitle': 'Standard partition walls (rendered in dim mode on space view)',
      'value': '',
    },
  ];

  static const List<Map<String, String>> connectivityOptions = [
    {
      'title': 'Wi-Fi 6E - 1.2 Gbps Dedicated',
      'subtitle': 'Ultra-fast dedicated enterprise Wi-Fi 6E connectivity',
      'value': 'Wi-Fi 6E - 1.2 Gbps Dedicated',
    },
    {
      'title': 'None / Not Specified',
      'subtitle': 'Standard shared corporate network (rendered in dim mode on space view)',
      'value': '',
    },
  ];

  @override
  void initState() {
    super.initState();
    final r = widget.room;

    _nameController = TextEditingController(text: r?.name ?? '');
    _codeController = TextEditingController(text: r?.roomCode ?? '');
    _capacityController = TextEditingController(text: r != null ? r.capacity.toString() : '4');
    _floorAreaController = TextEditingController(text: r?.floorArea != null ? r!.floorArea.toString() : '');
    _billingRateController = TextEditingController(text: r != null ? r.hourlyRate.toStringAsFixed(0) : '0');

    if (r != null) {
      _isActive = r.isActive;
      _acoustics = r.acoustics;
      _connectivity = r.connectivity;
      _selectedAmenities = List<String>.from(r.amenities);
      _selectedAvEquipment = List<String>.from(r.avEquipment);

      // Parse location into State and City
      final parsed = IndiaLocations.parseLocation(r.location);
      _selectedState = parsed.state;
      _selectedCity = parsed.city;

      // Initialize photos
      _photos = [];
      if (r.image != null && r.image!.isNotEmpty) {
        _photos.add({'url': r.formattedImageUrl, 'isPrimary': true});
      }
      for (final img in r.images) {
        if (!_photos.any((p) => p['url'] == img)) {
          _photos.add({'url': img, 'isPrimary': _photos.isEmpty});
        }
      }
    } else {
      _isActive = true;
      _selectedAmenities = ['Display Screen', 'Wi-Fi 6', 'Standing Desk'];
      _selectedAvEquipment = [];
      _photos = [];
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _codeController.dispose();
    _capacityController.dispose();
    _floorAreaController.dispose();
    _billingRateController.dispose();
    _customAvController.dispose();
    _customAmenityController.dispose();
    _imageUrlController.dispose();
    super.dispose();
  }

  void _autoGenerateCode() {
    final prefix = _nameController.text.trim().isNotEmpty
        ? _nameController.text.trim().toUpperCase().replaceAll(RegExp(r'[^A-Z0-9]'), '').padRight(3, 'X').substring(0, 5)
        : 'ROOM';
    final rand = 100 + (DateTime.now().millisecondsSinceEpoch % 900);
    setState(() {
      _codeController.text = 'RM-$prefix-$rand';
    });
  }

  void _toggleAmenity(String amenity) {
    setState(() {
      if (_selectedAmenities.contains(amenity)) {
        _selectedAmenities.remove(amenity);
      } else {
        _selectedAmenities.add(amenity);
      }
    });
  }

  void _addCustomAmenity() {
    final text = _customAmenityController.text.trim();
    if (text.isNotEmpty && !_selectedAmenities.contains(text)) {
      setState(() {
        _selectedAmenities.add(text);
        _customAmenityController.clear();
      });
    }
  }

  void _toggleAvEquipment(String av) {
    setState(() {
      if (_selectedAvEquipment.contains(av)) {
        _selectedAvEquipment.remove(av);
      } else {
        _selectedAvEquipment.add(av);
      }
    });
  }

  void _addCustomAv() {
    final text = _customAvController.text.trim();
    if (text.isNotEmpty && !_selectedAvEquipment.contains(text)) {
      setState(() {
        _selectedAvEquipment.add(text);
        _customAvController.clear();
      });
    }
  }

  void _addPhotoFromUrl(String url) {
    final clean = url.trim();
    if (clean.isNotEmpty && !_photos.any((p) => p['url'] == clean)) {
      setState(() {
        final isFirst = _photos.isEmpty;
        _photos.add({'url': clean, 'isPrimary': isFirst});
        _imageUrlController.clear();
      });
    }
  }

  void _setPrimaryPhoto(int index) {
    setState(() {
      for (int i = 0; i < _photos.length; i++) {
        _photos[i]['isPrimary'] = (i == index);
      }
    });
  }

  void _removePhoto(int index) {
    setState(() {
      final wasPrimary = _photos[index]['isPrimary'] == true;
      _photos.removeAt(index);
      if (wasPrimary && _photos.isNotEmpty) {
        _photos[0]['isPrimary'] = true;
      }
    });
  }

  Future<void> _handleSubmit() async {
    if (!_formKey.currentState!.validate()) return;

    if (_selectedState.isEmpty || _selectedCity.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please select both a State and City for the room location.'),
          backgroundColor: AppTheme.error,
        ),
      );
      return;
    }

    setState(() => _isSaving = true);

    final capacity = int.tryParse(_capacityController.text.trim()) ?? 4;
    final hourlyRate = double.tryParse(_billingRateController.text.trim()) ?? 0.0;
    final floorArea = int.tryParse(_floorAreaController.text.trim());
    final location = '$_selectedCity, $_selectedState';

    // Find primary photo
    final primaryPhoto = _photos.firstWhere(
      (p) => p['isPrimary'] == true,
      orElse: () => _photos.isNotEmpty ? _photos.first : {'url': null},
    );
    final String? primaryImageUrl = primaryPhoto['url'];
    final List<String> allImages = _photos.map((p) => p['url'] as String).toList();

    final payload = <String, dynamic>{
      'name': _nameController.text.trim(),
      'code': _codeController.text.trim(),
      'capacity': capacity,
      'location': location,
      'hourly_rate': hourlyRate,
      'is_active': _isActive,
      'amenities': _selectedAmenities,
      'av_equipment': _selectedAvEquipment,
      'acoustics': _acoustics,
      'connectivity': _connectivity,
      'image': primaryImageUrl,
      'images': allImages,
    };
    if (floorArea != null) {
      payload['floor_area'] = floorArea;
    }

    try {
      await widget.onSave(payload);
      if (mounted) {
        Navigator.of(context).pop();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error saving room: $e'),
            backgroundColor: AppTheme.error,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isSaving = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final availableCities = IndiaLocations.getCitiesForState(_selectedState);

    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      backgroundColor: Colors.white,
      insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 820, maxHeight: 900),
        child: Column(
          children: [
            // ==========================================
            // Modal Header
            // ==========================================
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 18),
              decoration: const BoxDecoration(
                border: Border(bottom: BorderSide(color: Color(0xFFE2E8F0))),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Flexible(
                              child: Text(
                                isEditMode ? 'Edit Room: ${_nameController.text.isNotEmpty ? _nameController.text : widget.room?.name}' : 'Create New Meeting Room',
                                style: const TextStyle(
                                  fontFamily: 'Inter',
                                  fontSize: 18,
                                  fontWeight: FontWeight.w800,
                                  color: Color(0xFF0F172A),
                                ),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            const SizedBox(width: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(
                                color: AppTheme.primary.withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: AppTheme.primary.withValues(alpha: 0.25)),
                              ),
                              child: Text(
                                isEditMode ? 'Edit Mode' : 'Create Mode',
                                style: const TextStyle(
                                  fontFamily: 'Inter',
                                  fontSize: 11,
                                  fontWeight: FontWeight.w700,
                                  color: AppTheme.primary,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 3),
                        const Text(
                          'Configure room specifications, floor dimensions, AV equipment, acoustics, and photo perspectives.',
                          style: TextStyle(
                            fontFamily: 'Inter',
                            fontSize: 12,
                            color: Color(0xFF64748B),
                          ),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close_rounded, size: 20, color: Color(0xFF64748B)),
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                ],
              ),
            ),

            // ==========================================
            // Scrollable Modal Form
            // ==========================================
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Section 1: Spatial Identification & Location
                      _buildSectionHeader('1. SPATIAL IDENTIFICATION & LOCATION'),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                _buildFieldLabel('Room Name *'),
                                TextFormField(
                                  controller: _nameController,
                                  validator: (v) => v == null || v.trim().isEmpty ? 'Room name is required' : null,
                                  decoration: _inputDecoration('e.g. Focus Pod Gamma'),
                                  style: const TextStyle(fontSize: 13, fontFamily: 'Inter'),
                                  onChanged: (_) => setState(() {}),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    _buildFieldLabel('Room Identifier / Code'),
                                    InkWell(
                                      onTap: _autoGenerateCode,
                                      child: const Text(
                                        'Auto-generate',
                                        style: TextStyle(
                                          fontFamily: 'Inter',
                                          fontSize: 11,
                                          fontWeight: FontWeight.w700,
                                          color: AppTheme.primary,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                TextFormField(
                                  controller: _codeController,
                                  decoration: _inputDecoration('e.g. RM-FOCUS-POD'),
                                  style: const TextStyle(fontSize: 13, fontFamily: 'Inter', fontWeight: FontWeight.w600),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),

                      // Location cascading State & City
                      Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                _buildFieldLabel('State / Union Territory *'),
                                DropdownButtonFormField<String>(
                                  initialValue: _selectedState.isNotEmpty && IndiaLocations.getIndianStates().contains(_selectedState) ? _selectedState : null,
                                  items: IndiaLocations.getIndianStates().map((st) => DropdownMenuItem(value: st, child: Text(st, style: const TextStyle(fontSize: 13)))).toList(),
                                  onChanged: (val) {
                                    setState(() {
                                      _selectedState = val ?? '';
                                      _selectedCity = '';
                                    });
                                  },
                                  decoration: _inputDecoration('Select State / UT'),
                                  isExpanded: true,
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                _buildFieldLabel('City *'),
                                DropdownButtonFormField<String>(
                                  initialValue: _selectedCity.isNotEmpty && availableCities.contains(_selectedCity) ? _selectedCity : null,
                                  items: availableCities.map((ct) => DropdownMenuItem(value: ct, child: Text(ct, style: const TextStyle(fontSize: 13)))).toList(),
                                  onChanged: _selectedState.isEmpty
                                      ? null
                                      : (val) {
                                          setState(() => _selectedCity = val ?? '');
                                        },
                                  decoration: _inputDecoration(_selectedState.isEmpty ? 'Select State first' : 'Select City'),
                                  isExpanded: true,
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      if (_selectedState.isNotEmpty && _selectedCity.isNotEmpty) ...[
                        const SizedBox(height: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF0FDF4),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: const Color(0xFFBBF7D0)),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.location_on_rounded, size: 14, color: Color(0xFF16A34A)),
                              const SizedBox(width: 4),
                              Text(
                                'Configured Location: $_selectedCity, $_selectedState (India)',
                                style: const TextStyle(fontFamily: 'Inter', fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF15803D)),
                              ),
                            ],
                          ),
                        ),
                      ],

                      const SizedBox(height: 22),
                      const Divider(color: Color(0xFFF1F5F9)),
                      const SizedBox(height: 14),

                      // Section 2: Dimensions, Capacity & Financial Allocation
                      _buildSectionHeader('2. DIMENSIONS, CAPACITY & FINANCIAL ALLOCATION'),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                _buildFieldLabel('Seating Capacity *'),
                                TextFormField(
                                  controller: _capacityController,
                                  keyboardType: TextInputType.number,
                                  decoration: _inputDecoration('e.g. 10 Seats'),
                                  style: const TextStyle(fontSize: 13, fontFamily: 'Inter'),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                _buildFieldLabel('Floor Area (sq ft)'),
                                TextFormField(
                                  controller: _floorAreaController,
                                  keyboardType: TextInputType.number,
                                  decoration: _inputDecoration('e.g. 450 sq ft'),
                                  style: const TextStyle(fontSize: 13, fontFamily: 'Inter'),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                _buildFieldLabel('Billing Rate (₹ / hr)'),
                                TextFormField(
                                  controller: _billingRateController,
                                  keyboardType: TextInputType.number,
                                  decoration: _inputDecoration('e.g. 500'),
                                  style: const TextStyle(fontSize: 13, fontFamily: 'Inter', fontWeight: FontWeight.w700),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),

                      const SizedBox(height: 22),
                      const Divider(color: Color(0xFFF1F5F9)),
                      const SizedBox(height: 14),

                      // Section 3: Operational Status
                      _buildSectionHeader('3. OPERATIONAL STATUS'),
                      const SizedBox(height: 12),
                      Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: _isActive ? const Color(0xFFF0FDF4) : const Color(0xFFFFFBEB),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: _isActive ? const Color(0xFFBBF7D0) : const Color(0xFFFDE68A)),
                        ),
                        child: Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: _isActive ? const Color(0xFFDCFCE7) : const Color(0xFFFEF3C7),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Icon(
                                _isActive ? Icons.check_circle_rounded : Icons.build_rounded,
                                color: _isActive ? const Color(0xFF16A34A) : const Color(0xFFD97706),
                                size: 20,
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    _isActive ? 'Active & Ready for Instant Reservations' : 'Under Maintenance / Offline',
                                    style: TextStyle(
                                      fontFamily: 'Inter',
                                      fontSize: 13,
                                      fontWeight: FontWeight.w700,
                                      color: _isActive ? const Color(0xFF15803D) : const Color(0xFFB45309),
                                    ),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    _isActive
                                        ? 'Room will appear in catalog and permit seamless calendar scheduling.'
                                        : 'Room is hidden from regular booking queries and marked under maintenance.',
                                    style: const TextStyle(fontFamily: 'Inter', fontSize: 11, color: Color(0xFF64748B)),
                                  ),
                                ],
                              ),
                            ),
                            Switch.adaptive(
                              value: _isActive,
                              activeTrackColor: const Color(0xFF16A34A),
                              onChanged: (val) => setState(() => _isActive = val),
                            ),
                          ],
                        ),
                      ),

                      const SizedBox(height: 22),
                      const Divider(color: Color(0xFFF1F5F9)),
                      const SizedBox(height: 14),

                      // Section 4: Audio/Visual Equipment
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          _buildSectionHeader('4. AUDIO/VISUAL & CONFERENCING EQUIPMENT'),
                          Text(
                            '${_selectedAvEquipment.length} Selected',
                            style: const TextStyle(fontFamily: 'Inter', fontSize: 11, fontWeight: FontWeight.w700, color: AppTheme.primary),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      // AV Multiselect Expandable Box
                      Container(
                        decoration: BoxDecoration(
                          border: Border.all(color: const Color(0xFFCBD5E1)),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Column(
                          children: [
                            InkWell(
                              onTap: () => setState(() => _isAvDropdownOpen = !_isAvDropdownOpen),
                              child: Padding(
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 11),
                                child: Row(
                                  children: [
                                    const Icon(Icons.videocam_rounded, size: 18, color: AppTheme.primary),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: Text(
                                        _selectedAvEquipment.isEmpty
                                            ? 'Click to select Audio/Visual equipment from catalog...'
                                            : '${_selectedAvEquipment.length} AV equipment item(s) selected',
                                        style: TextStyle(
                                          fontFamily: 'Inter',
                                          fontSize: 12,
                                          color: _selectedAvEquipment.isEmpty ? const Color(0xFF94A3B8) : const Color(0xFF0F172A),
                                          fontWeight: _selectedAvEquipment.isEmpty ? FontWeight.normal : FontWeight.w600,
                                        ),
                                      ),
                                    ),
                                    Icon(
                                      _isAvDropdownOpen ? Icons.expand_less_rounded : Icons.expand_more_rounded,
                                      size: 18,
                                      color: const Color(0xFF64748B),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                            if (_isAvDropdownOpen) ...[
                              const Divider(height: 1, color: Color(0xFFE2E8F0)),
                              Container(
                                padding: const EdgeInsets.all(8),
                                color: const Color(0xFFF8FAFC),
                                child: Column(
                                  children: presetAvEquipment.map((item) {
                                    final isSelected = _selectedAvEquipment.contains(item);
                                    return InkWell(
                                      onTap: () => _toggleAvEquipment(item),
                                      child: Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                                        margin: const EdgeInsets.only(bottom: 4),
                                        decoration: BoxDecoration(
                                          color: isSelected ? AppTheme.primary.withValues(alpha: 0.1) : Colors.white,
                                          borderRadius: BorderRadius.circular(8),
                                          border: Border.all(
                                            color: isSelected ? AppTheme.primary.withValues(alpha: 0.4) : const Color(0xFFE2E8F0),
                                          ),
                                        ),
                                        child: Row(
                                          children: [
                                            Icon(
                                              isSelected ? Icons.check_box_rounded : Icons.check_box_outline_blank_rounded,
                                              size: 18,
                                              color: isSelected ? AppTheme.primary : const Color(0xFF94A3B8),
                                            ),
                                            const SizedBox(width: 10),
                                            Expanded(
                                              child: Text(
                                                item,
                                                style: TextStyle(
                                                  fontFamily: 'Inter',
                                                  fontSize: 12,
                                                  fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                                                  color: isSelected ? AppTheme.primary : const Color(0xFF0F172A),
                                                ),
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                    );
                                  }).toList(),
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                      if (_selectedAvEquipment.isNotEmpty) ...[
                        const SizedBox(height: 8),
                        Wrap(
                          spacing: 8,
                          runSpacing: 6,
                          children: _selectedAvEquipment.map((item) {
                            return Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                              decoration: BoxDecoration(
                                color: const Color(0xFFF0FDF4),
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(color: const Color(0xFFBBF7D0)),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  const Text('✓ ', style: TextStyle(color: Color(0xFF16A34A), fontWeight: FontWeight.bold, fontSize: 11)),
                                  Text(item, style: const TextStyle(fontFamily: 'Inter', fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF15803D))),
                                  const SizedBox(width: 6),
                                  InkWell(
                                    onTap: () => _toggleAvEquipment(item),
                                    child: const Icon(Icons.close_rounded, size: 14, color: Color(0xFF64748B)),
                                  ),
                                ],
                              ),
                            );
                          }).toList(),
                        ),
                      ],
                      const SizedBox(height: 8),
                      // Custom AV adder
                      Row(
                        children: [
                          Expanded(
                            child: TextField(
                              controller: _customAvController,
                              style: const TextStyle(fontFamily: 'Inter', fontSize: 12),
                              decoration: _inputDecoration('Add custom AV equipment (e.g. 85-inch 8K OLED Display)...'),
                              onSubmitted: (_) => _addCustomAv(),
                            ),
                          ),
                          const SizedBox(width: 8),
                          ElevatedButton(
                            onPressed: _addCustomAv,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppTheme.primary,
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                            ),
                            child: const Text('+ Add Custom AV', style: TextStyle(fontFamily: 'Inter', fontSize: 12, fontWeight: FontWeight.w700)),
                          ),
                        ],
                      ),

                      const SizedBox(height: 22),
                      const Divider(color: Color(0xFFF1F5F9)),
                      const SizedBox(height: 14),

                      // Section 5: Acoustics & Connectivity Configuration (Directly in Image 2!)
                      _buildSectionHeader('5. ACOUSTICS & CONNECTIVITY CONFIGURATION'),
                      const SizedBox(height: 12),
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Acoustic Specification Cards
                          Expanded(
                            child: Container(
                              padding: const EdgeInsets.all(14),
                              decoration: BoxDecoration(
                                color: const Color(0xFFF8FAFC),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: const Color(0xFFE2E8F0)),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      const Row(
                                        children: [
                                          Icon(Icons.volume_off_rounded, size: 16, color: Color(0xFF475569)),
                                          SizedBox(width: 6),
                                          Text(
                                            'Acoustic Specification',
                                            style: TextStyle(fontFamily: 'Inter', fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF0F172A)),
                                          ),
                                        ],
                                      ),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                        decoration: BoxDecoration(
                                          color: _acoustics.isNotEmpty ? const Color(0xFFDCFCE7) : const Color(0xFFF1F5F9),
                                          borderRadius: BorderRadius.circular(6),
                                        ),
                                        child: Text(
                                          _acoustics.isNotEmpty ? 'Active Highlighting' : 'Dim Mode',
                                          style: TextStyle(
                                            fontFamily: 'Inter',
                                            fontSize: 10,
                                            fontWeight: FontWeight.w700,
                                            color: _acoustics.isNotEmpty ? const Color(0xFF15803D) : const Color(0xFF64748B),
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 10),
                                  ...acousticsOptions.map((opt) {
                                    final isSelected = _acoustics == opt['value'];
                                    return InkWell(
                                      onTap: () => setState(() => _acoustics = opt['value']!),
                                      child: Container(
                                        padding: const EdgeInsets.all(10),
                                        margin: const EdgeInsets.only(bottom: 8),
                                        decoration: BoxDecoration(
                                          color: Colors.white,
                                          borderRadius: BorderRadius.circular(10),
                                          border: Border.all(
                                            color: isSelected ? AppTheme.primary : const Color(0xFFCBD5E1),
                                            width: isSelected ? 1.5 : 1,
                                          ),
                                        ),
                                        child: Row(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Icon(
                                              isSelected ? Icons.radio_button_checked_rounded : Icons.radio_button_off_rounded,
                                              size: 16,
                                              color: isSelected ? AppTheme.primary : const Color(0xFF94A3B8),
                                            ),
                                            const SizedBox(width: 8),
                                            Expanded(
                                              child: Column(
                                                crossAxisAlignment: CrossAxisAlignment.start,
                                                children: [
                                                  Text(
                                                    opt['title']!,
                                                    style: const TextStyle(fontFamily: 'Inter', fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF0F172A)),
                                                  ),
                                                  const SizedBox(height: 2),
                                                  Text(
                                                    opt['subtitle']!,
                                                    style: const TextStyle(fontFamily: 'Inter', fontSize: 11, color: Color(0xFF64748B)),
                                                  ),
                                                ],
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                    );
                                  }),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(width: 14),

                          // Connectivity Specification Cards
                          Expanded(
                            child: Container(
                              padding: const EdgeInsets.all(14),
                              decoration: BoxDecoration(
                                color: const Color(0xFFF8FAFC),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: const Color(0xFFE2E8F0)),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      const Row(
                                        children: [
                                          Icon(Icons.wifi_rounded, size: 16, color: Color(0xFF475569)),
                                          SizedBox(width: 6),
                                          Text(
                                            'Connectivity Specification',
                                            style: TextStyle(fontFamily: 'Inter', fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF0F172A)),
                                          ),
                                        ],
                                      ),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                        decoration: BoxDecoration(
                                          color: _connectivity.isNotEmpty ? const Color(0xFFDCFCE7) : const Color(0xFFF1F5F9),
                                          borderRadius: BorderRadius.circular(6),
                                        ),
                                        child: Text(
                                          _connectivity.isNotEmpty ? 'Active Highlighting' : 'Dim Mode',
                                          style: TextStyle(
                                            fontFamily: 'Inter',
                                            fontSize: 10,
                                            fontWeight: FontWeight.w700,
                                            color: _connectivity.isNotEmpty ? const Color(0xFF15803D) : const Color(0xFF64748B),
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 10),
                                  ...connectivityOptions.map((opt) {
                                    final isSelected = _connectivity == opt['value'];
                                    return InkWell(
                                      onTap: () => setState(() => _connectivity = opt['value']!),
                                      child: Container(
                                        padding: const EdgeInsets.all(10),
                                        margin: const EdgeInsets.only(bottom: 8),
                                        decoration: BoxDecoration(
                                          color: Colors.white,
                                          borderRadius: BorderRadius.circular(10),
                                          border: Border.all(
                                            color: isSelected ? AppTheme.primary : const Color(0xFFCBD5E1),
                                            width: isSelected ? 1.5 : 1,
                                          ),
                                        ),
                                        child: Row(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Icon(
                                              isSelected ? Icons.radio_button_checked_rounded : Icons.radio_button_off_rounded,
                                              size: 16,
                                              color: isSelected ? AppTheme.primary : const Color(0xFF94A3B8),
                                            ),
                                            const SizedBox(width: 8),
                                            Expanded(
                                              child: Column(
                                                crossAxisAlignment: CrossAxisAlignment.start,
                                                children: [
                                                  Text(
                                                    opt['title']!,
                                                    style: const TextStyle(fontFamily: 'Inter', fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF0F172A)),
                                                  ),
                                                  const SizedBox(height: 2),
                                                  Text(
                                                    opt['subtitle']!,
                                                    style: const TextStyle(fontFamily: 'Inter', fontSize: 11, color: Color(0xFF64748B)),
                                                  ),
                                                ],
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                    );
                                  }),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),

                      const SizedBox(height: 22),
                      const Divider(color: Color(0xFFF1F5F9)),
                      const SizedBox(height: 14),

                      // Section 6: Workplace Amenities & Hospitality (Directly in Image 2!)
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          _buildSectionHeader('6. WORKPLACE AMENITIES & HOSPITALITY'),
                          Text(
                            '${_selectedAmenities.length} Selected',
                            style: const TextStyle(fontFamily: 'Inter', fontSize: 11, fontWeight: FontWeight.w700, color: AppTheme.primary),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      // Amenities Pills Container
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          // Active Selected Amenities (Light Blue with check and 'x')
                          ..._selectedAmenities.map((amenity) {
                            return Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                              decoration: BoxDecoration(
                                color: AppTheme.primary.withValues(alpha: 0.12),
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(color: AppTheme.primary.withValues(alpha: 0.3)),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  const Icon(Icons.check_rounded, size: 14, color: AppTheme.primary),
                                  const SizedBox(width: 5),
                                  Text(
                                    amenity,
                                    style: const TextStyle(fontFamily: 'Inter', fontSize: 12, fontWeight: FontWeight.w700, color: AppTheme.primary),
                                  ),
                                  const SizedBox(width: 6),
                                  InkWell(
                                    onTap: () => _toggleAmenity(amenity),
                                    child: const Icon(Icons.close_rounded, size: 14, color: Color(0xFF64748B)),
                                  ),
                                ],
                              ),
                            );
                          }),

                          // Unselected Presets (Grey with '+' icon)
                          ...presetAmenities.where((a) => !_selectedAmenities.contains(a)).map((amenity) {
                            return InkWell(
                              onTap: () => _toggleAmenity(amenity),
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFF1F5F9),
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(color: const Color(0xFFCBD5E1)),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    const Icon(Icons.add_rounded, size: 14, color: Color(0xFF64748B)),
                                    const SizedBox(width: 4),
                                    Text(
                                      amenity,
                                      style: const TextStyle(fontFamily: 'Inter', fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF475569)),
                                    ),
                                  ],
                                ),
                              ),
                            );
                          }),
                        ],
                      ),
                      const SizedBox(height: 10),
                      // Custom Amenity Adder
                      Row(
                        children: [
                          Expanded(
                            child: TextField(
                              controller: _customAmenityController,
                              style: const TextStyle(fontFamily: 'Inter', fontSize: 12),
                              decoration: _inputDecoration('Type new custom amenity (e.g. 4K Laser Projector, Smart Board)...'),
                              onSubmitted: (_) => _addCustomAmenity(),
                            ),
                          ),
                          const SizedBox(width: 8),
                          ElevatedButton(
                            onPressed: _addCustomAmenity,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppTheme.primary,
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                            ),
                            child: const Text('+ Add Amenity', style: TextStyle(fontFamily: 'Inter', fontSize: 12, fontWeight: FontWeight.w700)),
                          ),
                        ],
                      ),

                      const SizedBox(height: 22),
                      const Divider(color: Color(0xFFF1F5F9)),
                      const SizedBox(height: 14),

                      // Section 7: Room Photography & Multiple Perspectives (Directly in Image 2!)
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              _buildSectionHeader('7. ROOM PHOTOGRAPHY & MULTIPLE PERSPECTIVES'),
                              const SizedBox(height: 2),
                              const Text(
                                'Upload multiple photos. Designate one as the "Primary Image" (shown as cover across listings and cards).',
                                style: TextStyle(fontFamily: 'Inter', fontSize: 11, color: Color(0xFF64748B)),
                              ),
                            ],
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: AppTheme.primary.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Text(
                              '${_photos.length} Photos Staged',
                              style: const TextStyle(fontFamily: 'Inter', fontSize: 11, fontWeight: FontWeight.w700, color: AppTheme.primary),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),

                      // Upload Zone Box
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 16),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: const Color(0xFFCBD5E1), style: BorderStyle.solid),
                        ),
                        child: Column(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(10),
                              decoration: BoxDecoration(
                                color: AppTheme.primary.withValues(alpha: 0.1),
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(Icons.add_photo_alternate_rounded, size: 28, color: AppTheme.primary),
                            ),
                            const SizedBox(height: 10),
                            const Text(
                              'Enter image web URL or drag and drop photos',
                              style: TextStyle(fontFamily: 'Inter', fontSize: 13, fontWeight: FontWeight.w700, color: AppTheme.primary),
                            ),
                            const SizedBox(height: 4),
                            const Text(
                              'PNG, JPG, or WEBP up to 10MB each • You can stage multiple photos',
                              style: TextStyle(fontFamily: 'Inter', fontSize: 11, color: Color(0xFF94A3B8)),
                            ),
                            const SizedBox(height: 12),
                            ConstrainedBox(
                              constraints: const BoxConstraints(maxWidth: 500),
                              child: Row(
                                children: [
                                  Expanded(
                                    child: TextField(
                                      controller: _imageUrlController,
                                      style: const TextStyle(fontFamily: 'Inter', fontSize: 12),
                                      decoration: _inputDecoration('https://images.unsplash.com/...'),
                                      onSubmitted: (url) => _addPhotoFromUrl(url),
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  ElevatedButton(
                                    onPressed: () => _addPhotoFromUrl(_imageUrlController.text),
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: AppTheme.primary,
                                      foregroundColor: Colors.white,
                                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                    ),
                                    child: const Text('Add Photo', style: TextStyle(fontFamily: 'Inter', fontSize: 12, fontWeight: FontWeight.w700)),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),

                      // Gallery Thumbnails (Perspectives & Gallery Thumbnails:)
                      if (_photos.isNotEmpty) ...[
                        const SizedBox(height: 16),
                        const Text(
                          'Perspectives & Gallery Thumbnails:',
                          style: TextStyle(fontFamily: 'Inter', fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF0F172A)),
                        ),
                        const SizedBox(height: 10),
                        Wrap(
                          spacing: 12,
                          runSpacing: 12,
                          children: List.generate(_photos.length, (idx) {
                            final photo = _photos[idx];
                            final isPrimary = photo['isPrimary'] == true;
                            final url = photo['url'] as String;

                            return Container(
                              width: 170,
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(
                                  color: isPrimary ? AppTheme.primary : const Color(0xFFE2E8F0),
                                  width: isPrimary ? 2 : 1,
                                ),
                                boxShadow: const [
                                  BoxShadow(color: Color(0x06000000), blurRadius: 4, offset: Offset(0, 1)),
                                ],
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Stack(
                                    children: [
                                      ClipRRect(
                                        borderRadius: const BorderRadius.vertical(top: Radius.circular(10)),
                                        child: Image.network(
                                          url,
                                          height: 95,
                                          width: 170,
                                          fit: BoxFit.cover,
                                          errorBuilder: (_, _, _) => Container(
                                            height: 95,
                                            width: 170,
                                            color: const Color(0xFFF1F5F9),
                                            child: const Center(
                                              child: Icon(Icons.broken_image_rounded, color: Color(0xFF94A3B8)),
                                            ),
                                          ),
                                        ),
                                      ),
                                      if (isPrimary)
                                        Positioned(
                                          top: 6,
                                          left: 6,
                                          child: Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                            decoration: BoxDecoration(
                                              color: const Color(0xFFF59E0B),
                                              borderRadius: BorderRadius.circular(4),
                                            ),
                                            child: const Row(
                                              mainAxisSize: MainAxisSize.min,
                                              children: [
                                                Icon(Icons.star_rounded, size: 12, color: Colors.white),
                                                SizedBox(width: 3),
                                                Text(
                                                  'Primary Cover',
                                                  style: TextStyle(
                                                    fontFamily: 'Inter',
                                                    fontSize: 9,
                                                    fontWeight: FontWeight.w800,
                                                    color: Colors.white,
                                                  ),
                                                ),
                                              ],
                                            ),
                                          ),
                                        ),
                                    ],
                                  ),
                                  Padding(
                                    padding: const EdgeInsets.all(8),
                                    child: Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        if (!isPrimary)
                                          InkWell(
                                            onTap: () => _setPrimaryPhoto(idx),
                                            child: const Text(
                                              'Set Primary',
                                              style: TextStyle(fontFamily: 'Inter', fontSize: 11, fontWeight: FontWeight.w700, color: AppTheme.primary),
                                            ),
                                          )
                                        else
                                          const Text(
                                            'Cover Photo',
                                            style: TextStyle(fontFamily: 'Inter', fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF64748B)),
                                          ),
                                        InkWell(
                                          onTap: () => _removePhoto(idx),
                                          child: const Icon(Icons.delete_outline_rounded, size: 16, color: AppTheme.error),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            );
                          }),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            ),

            // ==========================================
            // Sticky Modal Footer
            // ==========================================
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
              decoration: const BoxDecoration(
                color: Color(0xFFF8FAFC),
                border: Border(top: BorderSide(color: Color(0xFFE2E8F0))),
              ),
              child: Row(
                children: [
                  if (isEditMode && widget.onDeleteRequest != null)
                    TextButton.icon(
                      onPressed: _isSaving ? null : widget.onDeleteRequest,
                      icon: const Icon(Icons.delete_outline_rounded, size: 16, color: AppTheme.error),
                      label: const Text('Delete Room', style: TextStyle(color: AppTheme.error, fontWeight: FontWeight.w700, fontSize: 12)),
                    )
                  else
                    const SizedBox.shrink(),
                  const Spacer(),
                  OutlinedButton(
                    onPressed: _isSaving ? null : () => Navigator.of(context).pop(),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: const Color(0xFF475569),
                      side: const BorderSide(color: Color(0xFFCBD5E1)),
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 11),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    child: const Text('Cancel', style: TextStyle(fontFamily: 'Inter', fontSize: 12, fontWeight: FontWeight.w600)),
                  ),
                  const SizedBox(width: 10),
                  ElevatedButton.icon(
                    onPressed: _isSaving ? null : _handleSubmit,
                    icon: _isSaving
                        ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : const Icon(Icons.check_rounded, size: 16),
                    label: Text(_isSaving ? 'Saving...' : (isEditMode ? 'Save Changes' : 'Save & Publish Room')),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.primary,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 11),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      textStyle: const TextStyle(fontFamily: 'Inter', fontSize: 12, fontWeight: FontWeight.w700),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Text(
      title,
      style: const TextStyle(
        fontFamily: 'Inter',
        fontSize: 11,
        fontWeight: FontWeight.w800,
        color: Color(0xFF64748B),
        letterSpacing: 0.5,
      ),
    );
  }

  Widget _buildFieldLabel(String label) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 5),
      child: Text(
        label,
        style: const TextStyle(
          fontFamily: 'Inter',
          fontSize: 12,
          fontWeight: FontWeight.w600,
          color: Color(0xFF334155),
        ),
      ),
    );
  }

  InputDecoration _inputDecoration(String hint) {
    return InputDecoration(
      hintText: hint,
      hintStyle: const TextStyle(fontFamily: 'Inter', fontSize: 12, color: Color(0xFF94A3B8)),
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFCBD5E1))),
      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFCBD5E1))),
      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: AppTheme.primary, width: 1.5)),
      isDense: true,
      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 11),
      fillColor: Colors.white,
      filled: true,
    );
  }
}
