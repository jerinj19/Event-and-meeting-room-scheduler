import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';

class RoomFilterSheet extends StatefulWidget {
  final List<String> locations;
  final int? currentMinCapacity;
  final int? currentMaxCapacity;
  final String? currentLocation;
  final bool? currentIsActive;
  final Function({
    int? minCap,
    int? maxCap,
    String? location,
    bool? isActive,
  }) onApply;

  const RoomFilterSheet({
    super.key,
    required this.locations,
    this.currentMinCapacity,
    this.currentMaxCapacity,
    this.currentLocation,
    this.currentIsActive,
    required this.onApply,
  });

  @override
  State<RoomFilterSheet> createState() => _RoomFilterSheetState();
}

class _RoomFilterSheetState extends State<RoomFilterSheet> {
  late double _minCapacity;
  late double _maxCapacity;
  String? _selectedLocation;
  bool? _isActive;

  @override
  void initState() {
    super.initState();
    _minCapacity = (widget.currentMinCapacity ?? 1).toDouble();
    _maxCapacity = (widget.currentMaxCapacity ?? 100).toDouble();
    _selectedLocation = widget.currentLocation;
    _isActive = widget.currentIsActive;
  }

  void _reset() {
    setState(() {
      _minCapacity = 1;
      _maxCapacity = 100;
      _selectedLocation = null;
      _isActive = null;
    });
  }

  void _apply() {
    widget.onApply(
      minCap: _minCapacity > 1 ? _minCapacity.round() : null,
      maxCap: _maxCapacity < 100 ? _maxCapacity.round() : null,
      location: _selectedLocation,
      isActive: _isActive,
    );
    Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
      decoration: const BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Drag handle
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: AppTheme.border,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Filter Meeting Rooms',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                  color: AppTheme.textPrimary,
                ),
              ),
              TextButton(
                onPressed: _reset,
                child: const Text('Reset All'),
              ),
            ],
          ),
          const Divider(),
          const SizedBox(height: 12),

          // Capacity Range
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Capacity Range',
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
              ),
              Text(
                '${_minCapacity.round()} - ${_maxCapacity.round()} people',
                style: const TextStyle(fontSize: 13, color: AppTheme.primary, fontWeight: FontWeight.w600),
              ),
            ],
          ),
          RangeSlider(
            values: RangeValues(_minCapacity, _maxCapacity),
            min: 1,
            max: 100,
            divisions: 99,
            activeColor: AppTheme.primary,
            inactiveColor: AppTheme.primaryLight,
            onChanged: (values) {
              setState(() {
                _minCapacity = values.start;
                _maxCapacity = values.end;
              });
            },
          ),
          const SizedBox(height: 16),

          // Location Dropdown
          const Text(
            'Location / Campus',
            style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 8),
          DropdownButtonFormField<String?>(
            initialValue: _selectedLocation,
            decoration: const InputDecoration(
              hintText: 'All Locations',
              prefixIcon: Icon(Icons.location_on_outlined),
            ),
            items: [
              const DropdownMenuItem<String?>(
                value: null,
                child: Text('All Locations'),
              ),
              ...widget.locations.map(
                (loc) => DropdownMenuItem<String?>(
                  value: loc,
                  child: Text(loc, overflow: TextOverflow.ellipsis),
                ),
              ),
            ],
            onChanged: (val) {
              setState(() {
                _selectedLocation = val;
              });
            },
          ),
          const SizedBox(height: 16),

          // Availability Filter Switch
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Active Rooms Only',
                    style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
                  ),
                  Text(
                    'Exclude rooms under scheduled maintenance',
                    style: TextStyle(fontSize: 12, color: AppTheme.textSecondary),
                  ),
                ],
              ),
              Switch(
                value: _isActive == true,
                activeTrackColor: AppTheme.primary,
                onChanged: (val) {
                  setState(() {
                    _isActive = val ? true : null;
                  });
                },
              ),
            ],
          ),
          const SizedBox(height: 24),

          // Apply Button
          ElevatedButton(
            onPressed: _apply,
            style: ElevatedButton.styleFrom(
              minimumSize: const Size.fromHeight(48),
            ),
            child: const Text('Apply Filters', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
          ),
        ],
      ),
    );
  }
}
