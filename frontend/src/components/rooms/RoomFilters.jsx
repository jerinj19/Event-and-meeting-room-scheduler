import React from 'react';

export default function RoomFilters({
  minRate = 0,
  maxRateLimit = 1000,
  currentMaxRate,
  onChangeMaxRate,
  histogramBuckets = [],
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

      {/* 2. Budget / Hourly Rate with Dynamic Frequency Histogram (in ₹ INR) */}
      <div className="pt-4 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-900">Your budget (per hour)</span>
          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
            ₹{minRate} – ₹{activeRate}/hr
          </span>
        </div>

        {/* Dynamic Visual Frequency Histogram Bars */}
        <div className="pt-1">
          <div className="flex items-end justify-between gap-1 h-10 px-1">
            {histogramBuckets.length > 0 ? (
              histogramBuckets.map((bucket, idx) => (
                <div
                  key={idx}
                  className={`w-full rounded-t transition-all ${
                    bucket.count > 0
                      ? 'bg-blue-500 hover:bg-blue-600'
                      : 'bg-slate-100'
                  }`}
                  style={{ height: `${Math.max(bucket.heightPct, 12)}%` }}
                  title={`${bucket.count} room(s) (${bucket.label})`}
                ></div>
              ))
            ) : (
              <div className="w-full bg-blue-200 rounded-t h-[50%]"></div>
            )}
          </div>
          
          {/* Rate Range Slider (0 to maxRateLimit) */}
          <div className="relative mt-2">
            <input
              type="range"
              min={minRate}
              max={maxRateLimit || 1000}
              step={maxRateLimit > 500 ? 50 : 10}
              value={activeRate}
              onChange={(e) => onChangeMaxRate && onChangeMaxRate(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1 font-medium">
              <span>₹{minRate}</span>
              <span>₹{Math.round(maxRateLimit / 2)}</span>
              <span>₹{maxRateLimit}+</span>
            </div>
          </div>
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
