import React from 'react';

export default function RoomFilters({
  minRate = 0,
  maxRateLimit = 1000,
  currentMaxRate,
  onChangeMaxRate,
  matchingRoomsCount,
  totalRoomsCount,
  availableAmenities = [],
  selectedAmenities = [],
  onToggleAmenity,
  availableOnly = false,
  onToggleAvailableOnly,
  availableLocations = [],
  locationFilter = 'all',
  onChangeLocation,
  onResetFilters,
}) {
  const activeRate = currentMaxRate !== undefined && currentMaxRate !== null ? currentMaxRate : maxRateLimit;
  const safeMax = maxRateLimit > minRate ? maxRateLimit : minRate + 1;
  const progressPercent = Math.min(100, Math.max(0, Math.round(((activeRate - minRate) / (safeMax - minRate)) * 100)));

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

      {/* 2. Budget / Hourly Rate with Continuous Line Track & Round Pointer */}
      <div className="pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-900">Your budget (per hour)</span>
          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100 shadow-2xs">
            Up to ₹{activeRate}/hr
          </span>
        </div>

        {/* Continuous Track Line with Custom Round Pointer */}
        <div className="relative pt-2 pb-1">
          <input
            type="range"
            min={minRate}
            max={safeMax}
            step={safeMax > 1000 ? 50 : 25}
            value={activeRate}
            onChange={(e) => onChangeMaxRate && onChangeMaxRate(Number(e.target.value))}
            style={{
              background: `linear-gradient(to right, #2563eb 0%, #2563eb ${progressPercent}%, #e2e8f0 ${progressPercent}%, #e2e8f0 100%)`,
            }}
            className="w-full h-2 rounded-full appearance-none cursor-pointer focus:outline-none transition-all
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-5
              [&::-webkit-slider-thumb]:h-5
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:bg-white
              [&::-webkit-slider-thumb]:border-[2.5px]
              [&::-webkit-slider-thumb]:border-blue-600
              [&::-webkit-slider-thumb]:shadow-md
              [&::-webkit-slider-thumb]:shadow-blue-500/20
              [&::-webkit-slider-thumb]:cursor-grab
              [&::-webkit-slider-thumb]:hover:scale-115
              [&::-webkit-slider-thumb]:active:cursor-grabbing
              [&::-webkit-slider-thumb]:active:scale-95
              [&::-webkit-slider-thumb]:transition-transform
              [&::-moz-range-thumb]:w-5
              [&::-moz-range-thumb]:h-5
              [&::-moz-range-thumb]:rounded-full
              [&::-moz-range-thumb]:bg-white
              [&::-moz-range-thumb]:border-[2.5px]
              [&::-moz-range-thumb]:border-blue-600
              [&::-moz-range-thumb]:shadow-md
              [&::-moz-range-thumb]:cursor-grab"
            aria-label="Filter maximum hourly budget"
          />

          {/* Scale Labels */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1.5 font-medium px-0.5">
            <span>₹{minRate}</span>
            <span>₹{Math.round((minRate + safeMax) / 2)}</span>
            <span>₹{safeMax}+</span>
          </div>

          {/* Real-time Matching Rooms Counter */}
          {matchingRoomsCount !== undefined && totalRoomsCount !== undefined && (
            <div className="mt-2.5 text-[11px] text-slate-600 flex items-center gap-1.5 font-medium bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
              <span className="text-blue-600 font-bold">✓</span>
              <span>
                {matchingRoomsCount === totalRoomsCount
                  ? `All ${totalRoomsCount} rooms fit this budget`
                  : `${matchingRoomsCount} of ${totalRoomsCount} rooms fit this budget`}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 3. Popular Filters & Dynamic Amenities from Admin-created rooms */}
      <div className="pt-4 space-y-2.5">
        <span className="text-xs font-bold text-slate-900 block">Popular Amenities</span>
        <div className="space-y-2 text-xs max-h-60 overflow-y-auto pr-1">
          {/* Available Status Toggle */}
          <label className="flex items-center justify-between cursor-pointer group select-none">
            <span className="flex items-center gap-2 text-slate-700 group-hover:text-slate-900">
              <input
                type="checkbox"
                checked={availableOnly}
                onChange={() => onToggleAvailableOnly && onToggleAvailableOnly(!availableOnly)}
                className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
              />
              <span className="font-medium text-emerald-700">Available Right Now</span>
            </span>
          </label>

          {/* Dynamic Amenities from real rooms */}
          {availableAmenities.length > 0 ? (
            availableAmenities.map((amenity) => {
              const isChecked = selectedAmenities.includes(amenity.id);
              return (
                <label key={amenity.id} className="flex items-center justify-between cursor-pointer group select-none">
                  <span className="flex items-center gap-2 text-slate-700 group-hover:text-slate-900">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => onToggleAmenity && onToggleAmenity(amenity.id)}
                      className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
                    />
                    <span className="capitalize">{amenity.label}</span>
                  </span>
                  <span className="text-slate-400 font-medium text-[11px]">{amenity.count}</span>
                </label>
              );
            })
          ) : (
            <p className="text-[11px] text-slate-400 italic">No amenities listed yet</p>
          )}
        </div>
      </div>

      {/* 4. Dynamic Locations / Area from available properties in the system */}
      <div className="pt-4 space-y-2.5">
        <span className="text-xs font-bold text-slate-900 block">Available Locations</span>
        <div className="space-y-2 text-xs max-h-52 overflow-y-auto pr-1">
          {/* All Locations Option */}
          <label className="flex items-center justify-between cursor-pointer group select-none">
            <span className="flex items-center gap-2 text-slate-700 group-hover:text-slate-900">
              <input
                type="radio"
                name="sidebar_location"
                checked={locationFilter === 'all' || !locationFilter}
                onChange={() => onChangeLocation && onChangeLocation('all')}
                className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
              />
              <span className={locationFilter === 'all' || !locationFilter ? 'font-semibold text-blue-700' : ''}>
                All Locations
              </span>
            </span>
          </label>

          {/* Dynamic Property Locations */}
          {availableLocations.map((loc) => {
            const isSelected = locationFilter.toLowerCase() === loc.id.toLowerCase();
            return (
              <label key={loc.id} className="flex items-center justify-between cursor-pointer group select-none">
                <span className="flex items-center gap-2 text-slate-700 group-hover:text-slate-900">
                  <input
                    type="radio"
                    name="sidebar_location"
                    checked={isSelected}
                    onChange={() => onChangeLocation && onChangeLocation(loc.id)}
                    className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
                  />
                  <span className={`capitalize ${isSelected ? 'font-semibold text-blue-700' : ''}`}>
                    {loc.label}
                  </span>
                </span>
                <span className="text-slate-400 font-medium text-[11px]">{loc.count}</span>
              </label>
            );
          })}
        </div>
      </div>

    </aside>
  );
}
