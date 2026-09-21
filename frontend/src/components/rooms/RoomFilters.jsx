import React from 'react';

const CAPACITY_OPTIONS = [
  { id: 'all', label: 'All Rooms', min: 0 },
  { id: 'small', label: '2–4 Seats', min: 2, max: 4 },
  { id: 'medium', label: '6–10 Seats', min: 6, max: 10 },
  { id: 'large', label: '12–20 Seats', min: 12, max: 20 },
  { id: 'boardroom', label: '25+ Boardrooms', min: 25 },
];

const AMENITY_CHIPS = [
  { id: '4K Display', icon: '📺', label: '4K Display' },
  { id: 'Glass Whiteboard', icon: '🖊️', label: 'Glass Whiteboard' },
  { id: 'Polycom Video', icon: '🎙️', label: 'Polycom Video' },
  { id: 'High-Speed WiFi', icon: '📶', label: 'High-Speed WiFi' },
  { id: 'Coffee Bar', icon: '☕', label: 'Coffee Bar' },
];

export default function RoomFilters({
  selectedCapacity,
  onSelectCapacity,
  selectedAmenities,
  onToggleAmenity,
  availableOnly,
  onToggleAvailableOnly,
  locationFilter,
  onChangeLocation,
}) {
  return (
    <div className="sticky top-20 bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl p-4 shadow-xs z-20 space-y-3">
      {/* Top Row: Capacity & Location / Availability */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Capacity Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 shrink-0">
            Capacity:
          </span>
          {CAPACITY_OPTIONS.map((cap) => {
            const isActive = selectedCapacity === cap.id;
            return (
              <button
                key={cap.id}
                type="button"
                onClick={() => onSelectCapacity(cap.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs shadow-blue-500/20'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/80'
                }`}
              >
                {cap.label}
              </button>
            );
          })}
        </div>

        {/* Right Filter Actions */}
        <div className="flex items-center gap-3 pt-1 lg:pt-0 border-t border-slate-100 lg:border-t-0 justify-between lg:justify-end">
          <select
            value={locationFilter}
            onChange={(e) => onChangeLocation(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Wings & Floors</option>
            <option value="Building A">Building A</option>
            <option value="Building B">Building B</option>
          </select>

          <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={availableOnly}
              onChange={(e) => onToggleAvailableOnly(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
            />
            <span>Available Only</span>
          </label>
        </div>
      </div>

      {/* Bottom Row: Amenity Chips */}
      <div className="flex items-center gap-2 pt-2 border-t border-slate-100 overflow-x-auto scrollbar-none">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 shrink-0">
          Amenities:
        </span>
        {AMENITY_CHIPS.map((amenity) => {
          const isSelected = selectedAmenities.includes(amenity.id);
          return (
            <button
              key={amenity.id}
              type="button"
              onClick={() => onToggleAmenity(amenity.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium shrink-0 flex items-center gap-1.5 transition ${
                isSelected
                  ? 'bg-blue-50 text-blue-700 border border-blue-200 font-semibold'
                  : 'bg-slate-50 text-slate-600 border border-slate-200/80 hover:bg-slate-100'
              }`}
            >
              <span>{amenity.icon}</span>
              <span>{amenity.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
