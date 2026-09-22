import React from 'react';

const CAPACITY_OPTIONS = [
  { id: 'all', label: 'All Room Capacities', count: 18 },
  { id: 'small', label: 'Focus Sprint Pod (2–4 seats)', count: 4 },
  { id: 'medium', label: 'Team Meeting Room (6–10 seats)', count: 8 },
  { id: 'large', label: 'Executive Boardroom (12–20 seats)', count: 4 },
  { id: 'boardroom', label: 'All-Hands Auditorium (25+ seats)', count: 2 },
];

const POPULAR_FILTERS = [
  { id: 'Available', label: 'Available Right Now', count: 14, isStatus: true },
  { id: '4K', label: '4K Display / Dual OLED', count: 15 },
  { id: 'Video', label: 'Video Conference Suite', count: 12 },
  { id: 'Whiteboard', label: 'Whiteboard & Glass Walls', count: 10 },
  { id: 'Coffee Bar', label: 'Coffee Bar Included', count: 8 },
];

const ACOUSTIC_FILTERS = [
  { id: 'NRC', label: 'Ultra-Quiet NRC 0.9+ Felt', count: 5 },
  { id: 'Acoustic', label: 'Standard Acoustic Baffles', count: 13 },
];

const LOCATION_OPTIONS = [
  { id: 'all', label: 'All Bangalore Hubs', count: 18 },
  { id: 'Koramangala', label: 'Koramangala', count: 7 },
  { id: 'Indiranagar', label: 'Indiranagar', count: 5 },
  { id: 'MG Road', label: 'MG Road', count: 4 },
  { id: 'Whitefield', label: 'Whitefield', count: 2 },
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
  maxHourlyRate,
  onChangeMaxRate,
  onResetFilters,
}) {
  return (
    <aside className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs divide-y divide-slate-100 space-y-4 sticky top-20">
      
      {/* 1. Header & Reset Action */}
      <div className="flex items-center justify-between pb-1">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
          <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <span>Filter by:</span>
        </h2>
        <button
          type="button"
          onClick={onResetFilters}
          className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
        >
          Reset all
        </button>
      </div>

      {/* 2. Budget / Hourly Rate with Dynamic Frequency Histogram */}
      <div className="pt-4 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-900">Your budget (per hour)</span>
          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
            ${maxHourlyRate ? `Up to $${maxHourlyRate}/hr` : '$25 – $110/hr'}
          </span>
        </div>

        {/* Visual Frequency Histogram Bars */}
        <div className="pt-1">
          <div className="flex items-end justify-between gap-1 h-10 px-1">
            <div className="w-full bg-blue-100 hover:bg-blue-300 rounded-t transition-all h-[25%]" title="3 spaces ($20-30)"></div>
            <div className="w-full bg-blue-200 hover:bg-blue-400 rounded-t transition-all h-[45%]" title="5 spaces ($30-45)"></div>
            <div className="w-full bg-blue-500 hover:bg-blue-600 rounded-t transition-all h-[80%]" title="8 spaces ($45-60)"></div>
            <div className="w-full bg-blue-600 hover:bg-blue-700 rounded-t transition-all h-[100%]" title="12 spaces ($60-75)"></div>
            <div className="w-full bg-blue-500 hover:bg-blue-600 rounded-t transition-all h-[65%]" title="7 spaces ($75-90)"></div>
            <div className="w-full bg-blue-300 hover:bg-blue-500 rounded-t transition-all h-[35%]" title="4 spaces ($90-105)"></div>
            <div className="w-full bg-blue-200 hover:bg-blue-400 rounded-t transition-all h-[20%]" title="2 spaces ($105-120)"></div>
          </div>
          
          {/* Rate Range Slider */}
          <div className="relative mt-2">
            <input
              type="range"
              min="25"
              max="110"
              step="5"
              value={maxHourlyRate || 110}
              onChange={(e) => onChangeMaxRate(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1 font-medium">
              <span>$25</span>
              <span>$65</span>
              <span>$110+</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Popular Filters */}
      <div className="pt-4 space-y-2.5">
        <span className="text-xs font-bold text-slate-900 block">Popular filters</span>
        <div className="space-y-2 text-xs">
          {POPULAR_FILTERS.map((item) => {
            const isChecked = item.isStatus ? availableOnly : selectedAmenities.includes(item.id);
            return (
              <label key={item.id} className="flex items-center justify-between cursor-pointer group select-none">
                <span className="flex items-center gap-2 text-slate-700 group-hover:text-slate-900">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {
                      if (item.isStatus) {
                        onToggleAvailableOnly(!availableOnly);
                      } else {
                        onToggleAmenity(item.id);
                      }
                    }}
                    className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
                  />
                  <span>{item.label}</span>
                </span>
                <span className="text-slate-400 font-medium text-[11px]">{item.count}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* 4. Room Capacity & Format */}
      <div className="pt-4 space-y-2.5">
        <span className="text-xs font-bold text-slate-900 block">Room Capacity &amp; Format</span>
        <div className="space-y-2 text-xs">
          {CAPACITY_OPTIONS.map((cap) => (
            <label key={cap.id} className="flex items-center justify-between cursor-pointer group select-none">
              <span className="flex items-center gap-2 text-slate-700 group-hover:text-slate-900">
                <input
                  type="radio"
                  name="capacity"
                  checked={selectedCapacity === cap.id}
                  onChange={() => onSelectCapacity(cap.id)}
                  className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
                />
                <span className={selectedCapacity === cap.id ? 'font-semibold text-blue-700' : ''}>
                  {cap.label}
                </span>
              </span>
              <span className="text-slate-400 font-medium text-[11px]">{cap.count}</span>
            </label>
          ))}
        </div>
      </div>

      {/* 5. Acoustic Isolation (NRC) */}
      <div className="pt-4 space-y-2.5">
        <span className="text-xs font-bold text-slate-900 block">Acoustic Isolation (NRC)</span>
        <div className="space-y-2 text-xs">
          {ACOUSTIC_FILTERS.map((ac) => {
            const isChecked = selectedAmenities.includes(ac.id);
            return (
              <label key={ac.id} className="flex items-center justify-between cursor-pointer group select-none">
                <span className="flex items-center gap-2 text-slate-700 group-hover:text-slate-900">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => onToggleAmenity(ac.id)}
                    className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
                  />
                  <span>{ac.label}</span>
                </span>
                <span className="text-slate-400 font-medium text-[11px]">{ac.count}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* 6. Location / Area */}
      <div className="pt-4 space-y-2.5">
        <span className="text-xs font-bold text-slate-900 block">Location / Area</span>
        <div className="space-y-2 text-xs">
          {LOCATION_OPTIONS.map((loc) => (
            <label key={loc.id} className="flex items-center justify-between cursor-pointer group select-none">
              <span className="flex items-center gap-2 text-slate-700 group-hover:text-slate-900">
                <input
                  type="radio"
                  name="location_area"
                  checked={locationFilter === loc.id}
                  onChange={() => onChangeLocation(loc.id)}
                  className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
                />
                <span className={locationFilter === loc.id ? 'font-semibold text-blue-700' : ''}>
                  {loc.label}
                </span>
              </span>
              <span className="text-slate-400 font-medium text-[11px]">{loc.count}</span>
            </label>
          ))}
        </div>
      </div>

    </aside>
  );
}
