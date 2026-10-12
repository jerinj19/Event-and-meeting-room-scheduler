import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/validators.dart';
import '../../data/models/room_model.dart';
import '../../providers/room_provider.dart';

class AdminRoomFormScreen extends StatefulWidget {
  final RoomModel? roomToEdit;

  const AdminRoomFormScreen({super.key, this.roomToEdit});

  @override
  State<AdminRoomFormScreen> createState() => _AdminRoomFormScreenState();
}

class _AdminRoomFormScreenState extends State<AdminRoomFormScreen> {
  final _formKey = GlobalKey<FormState>();

  late final TextEditingController _nameController;
  late final TextEditingController _capacityController;
  late final TextEditingController _locationController;
  late final TextEditingController _rateController;
  late final TextEditingController _floorAreaController;
  late final TextEditingController _amenitiesController;
  late final TextEditingController _acousticsController;
  late final TextEditingController _connectivityController;

  late bool _isActive;
  bool _isSaving = false;

  bool get _isEditing => widget.roomToEdit != null;

  @override
  void initState() {
    super.initState();
    final r = widget.roomToEdit;
    _nameController = TextEditingController(text: r?.name ?? '');
    _capacityController = TextEditingController(text: r != null ? r.capacity.toString() : '10');
    _locationController = TextEditingController(text: r?.location ?? '');
    _rateController = TextEditingController(text: r != null ? r.hourlyRate.toStringAsFixed(0) : '0');
    _floorAreaController = TextEditingController(text: r?.floorArea != null ? r!.floorArea.toString() : '');
    _amenitiesController = TextEditingController(text: r != null ? r.amenities.join(', ') : 'WiFi 6, Whiteboard, 4K Display');
    _acousticsController = TextEditingController(text: r?.acoustics ?? '');
    _connectivityController = TextEditingController(text: r?.connectivity ?? '');
    _isActive = r?.isActive ?? true;
  }

  @override
  void dispose() {
    _nameController.dispose();
    _capacityController.dispose();
    _locationController.dispose();
    _rateController.dispose();
    _floorAreaController.dispose();
    _amenitiesController.dispose();
    _acousticsController.dispose();
    _connectivityController.dispose();
    super.dispose();
  }

  Future<void> _handleSave() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSaving = true);

    final roomProvider = Provider.of<RoomProvider>(context, listen: false);

    final amenitiesList = _amenitiesController.text
        .split(',')
        .map((s) => s.trim())
        .where((s) => s.isNotEmpty)
        .toList();

    final capacity = int.tryParse(_capacityController.text.trim()) ?? 10;
    final hourlyRate = double.tryParse(_rateController.text.trim()) ?? 0.0;
    final floorArea = int.tryParse(_floorAreaController.text.trim());

    bool success = false;
    if (_isEditing) {
      final updates = <String, dynamic>{
        'name': _nameController.text.trim(),
        'capacity': capacity,
        'location': _locationController.text.trim(),
        'hourly_rate': hourlyRate,
        'amenities': amenitiesList,
        'is_active': _isActive,
        'acoustics': _acousticsController.text.trim(),
        'connectivity': _connectivityController.text.trim(),
      };
      if (floorArea != null) {
        updates['floor_area'] = floorArea;
      }
      success = await roomProvider.updateRoom(
        widget.roomToEdit!.id,
        updates,
      );
    } else {
      success = await roomProvider.createRoom(
        name: _nameController.text.trim(),
        capacity: capacity,
        location: _locationController.text.trim(),
        hourlyRate: hourlyRate,
        amenities: amenitiesList,
        isActive: _isActive,
        floorArea: floorArea,
        acoustics: _acousticsController.text.trim(),
        connectivity: _connectivityController.text.trim(),
      );
    }

    setState(() => _isSaving = false);

    if (mounted) {
      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(_isEditing ? 'Room updated successfully.' : 'Room created successfully.'),
            backgroundColor: AppTheme.success,
          ),
        );
        Navigator.of(context).pop();
      } else if (roomProvider.errorMessage != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(roomProvider.errorMessage!),
            backgroundColor: AppTheme.error,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: Text(_isEditing ? 'Edit Room' : 'Add New Room'),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                TextFormField(
                  controller: _nameController,
                  textInputAction: TextInputAction.next,
                  decoration: const InputDecoration(
                    labelText: 'Room Name',
                    hintText: 'e.g. Athena Executive Hub 402',
                    prefixIcon: Icon(Icons.meeting_room_outlined),
                  ),
                  validator: (v) => Validators.requiredField(v, 'Room name'),
                ),
                const SizedBox(height: 16),

                Row(
                  children: [
                    Expanded(
                      child: TextFormField(
                        controller: _capacityController,
                        keyboardType: TextInputType.number,
                        textInputAction: TextInputAction.next,
                        decoration: const InputDecoration(
                          labelText: 'Capacity (Pax)',
                          hintText: '12',
                          prefixIcon: Icon(Icons.groups_outlined),
                        ),
                        validator: Validators.positiveInteger,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: TextFormField(
                        controller: _rateController,
                        keyboardType: TextInputType.number,
                        textInputAction: TextInputAction.next,
                        decoration: const InputDecoration(
                          labelText: 'Hourly Rate (₹)',
                          hintText: '500',
                          prefixIcon: Icon(Icons.currency_rupee_rounded),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),

                TextFormField(
                  controller: _locationController,
                  textInputAction: TextInputAction.next,
                  decoration: const InputDecoration(
                    labelText: 'Campus / Location',
                    hintText: 'e.g. Building B, 3rd Floor, West Wing',
                    prefixIcon: Icon(Icons.location_on_outlined),
                  ),
                  validator: (v) => Validators.requiredField(v, 'Location'),
                ),
                const SizedBox(height: 16),

                TextFormField(
                  controller: _amenitiesController,
                  textInputAction: TextInputAction.next,
                  decoration: const InputDecoration(
                    labelText: 'Amenities (Comma-separated)',
                    hintText: '4K Display, Video Conf, Whiteboard, WiFi 6',
                    prefixIcon: Icon(Icons.star_outline_rounded),
                    helperText: 'Separate assets with commas',
                  ),
                ),
                const SizedBox(height: 16),

                Row(
                  children: [
                    Expanded(
                      child: TextFormField(
                        controller: _floorAreaController,
                        keyboardType: TextInputType.number,
                        textInputAction: TextInputAction.next,
                        decoration: const InputDecoration(
                          labelText: 'Floor Area (sq ft)',
                          hintText: '250',
                          prefixIcon: Icon(Icons.square_foot_rounded),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: TextFormField(
                        controller: _connectivityController,
                        textInputAction: TextInputAction.next,
                        decoration: const InputDecoration(
                          labelText: 'Connectivity',
                          hintText: 'Wi-Fi 6E',
                          prefixIcon: Icon(Icons.wifi_rounded),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),

                TextFormField(
                  controller: _acousticsController,
                  textInputAction: TextInputAction.done,
                  decoration: const InputDecoration(
                    labelText: 'Acoustics Rating',
                    hintText: 'Soundproofed Glazing (NRC 0.88)',
                    prefixIcon: Icon(Icons.graphic_eq_rounded),
                  ),
                ),
                const SizedBox(height: 16),

                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  decoration: BoxDecoration(
                    color: AppTheme.surface,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppTheme.border),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Room Active & Schedulable',
                        style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
                      ),
                      Switch(
                        value: _isActive,
                        activeTrackColor: AppTheme.success,
                        onChanged: (val) {
                          setState(() => _isActive = val);
                        },
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 28),

                ElevatedButton(
                  onPressed: _isSaving ? null : _handleSave,
                  style: ElevatedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 16)),
                  child: _isSaving
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(strokeWidth: 2, valueColor: AlwaysStoppedAnimation(Colors.white)),
                        )
                      : Text(
                          _isEditing ? 'Save Changes' : 'Create Room',
                          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
                        ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
