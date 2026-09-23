import React, { useState, useRef, useEffect } from 'react';

export default function SearchCommandBar({
  locationQuery = '',
  onChangeLocationQuery,
  selectedDate = '2026-09-22',
  onChangeDate,
  onSearch,
}) {
  const [isDateOpen, setIsDateOpen] = useState(false);
  const datePopoverRef = useRef(null);

  // Close calendar popover on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (datePopoverRef.current && !datePopoverRef.current.contains(event.target)) {
        setIsDateOpen(false);
      }
    }
    if (isDateOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDateOpen]);

  // Format display text for date
  const getDateDisplay = () => {
    if (!selectedDate) return 'Any Date (Click to choose)';
    if (selectedDate === '2026-09-22') return 'Today, 22 Sep 2026';
    const parts = selectedDate.split('-');
    if (parts.length === 3) {
      const year = parts[0];
      const monthNum = parseInt(parts[1], 10);
      const day = parseInt(parts[2], 10);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${day} ${months[monthNum - 1]} ${year}`;
    }
    return selectedDate;
  };

  const handleSelectDate = (dateStr) => {
    if (onChangeDate) {
      onChangeDate(dateStr);
    }
  };

  const handleClearDate = (e) => {
    e.stopPropagation();
    if (onChangeDate) {
      onChangeDate('');
    }
  };

  return (
    <section className="bg-white rounded-xl md:rounded-2xl border border-slate-200 shadow-sm p-2 md:p-3 relative z-30">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-3 items-center">
        
        {/* Column 1: Location Keyword Blankspace Input (col-span-7) */}
        <div className="md:col-span-7 flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors border border-slate-100 group focus-within:border-blue-300 focus-within:ring-2 focus-within:ring-blue-100">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <label htmlFor="search-location-input" className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block cursor-pointer">
              LOCATION
            </label>
            <div className="relative flex items-center">
              <input
                id="search-location-input"
                type="text"
                value={locationQuery}
                onChange={(e) => onChangeLocationQuery && onChangeLocationQuery(e.target.value)}
                placeholder="Enter location (e.g. Madiwala, Silkboard, Kerala, Bangalore)..."
                className="w-full bg-transparent text-xs font-semibold text-slate-900 border-none p-0 focus:ring-0 placeholder:text-slate-400 placeholder:font-normal"
              />
              {locationQuery && (
                <button
                  type="button"
                  onClick={() => onChangeLocationQuery && onChangeLocationQuery('')}
                  className="text-slate-400 hover:text-slate-600 p-0.5 ml-1 cursor-pointer"
                  title="Clear location"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Column 2: Date & Calendar Picker (col-span-4) */}
        <div className="md:col-span-4 relative" ref={datePopoverRef}>
          <button
            type="button"
            onClick={() => setIsDateOpen((prev) => !prev)}
            aria-expanded={isDateOpen}
            aria-label="Select Date for Availability Check"
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg border text-left transition-all cursor-pointer ${
              isDateOpen
                ? 'bg-blue-50/70 border-blue-300 ring-2 ring-blue-100'
                : 'border-slate-100 hover:bg-slate-50'
            }`}
          >
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                DATE &amp; AVAILABILITY
              </div>
              <div className={`text-xs font-semibold truncate ${isDateOpen ? 'text-blue-600' : 'text-slate-900'}`}>
                {getDateDisplay()}
              </div>
            </div>
            <svg
              className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${isDateOpen ? 'rotate-180 text-blue-600' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Interactive Floating Calendar Popover: ONLY APPEARS ON CLICK */}
          {isDateOpen && (
            <div
              className="absolute top-full left-0 mt-2 w-80 bg-white rounded-2xl border border-slate-200 shadow-2xl p-4 z-50 text-slate-800 animate-in fade-in zoom-in-95 duration-150"
              role="dialog"
              aria-label="Date Availability Picker"
            >
              {/* Popover Header */}
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                <span className="font-semibold text-xs text-slate-700">Select Date for Availability</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleClearDate}
                    className="text-[11px] text-blue-600 hover:text-blue-800 font-medium cursor-pointer hover:underline"
                  >
                    All Dates
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsDateOpen(false)}
                    className="text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-2 py-0.5 rounded cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>

              {/* Month 1: Sep 2026 */}
              <div className="text-xs font-bold text-slate-800 mb-1.5 flex items-center justify-between">
                <span>Sep 2026</span>
                <span className="text-[10px] text-slate-400 font-normal">IST</span>
              </div>

              {/* Days of Week Header */}
              <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-slate-400 font-semibold mb-1">
                <div>M</div><div>T</div><div>W</div><div>T</div><div>F</div><div>S</div><div>S</div>
              </div>

              {/* September Days Grid */}
              <div className="grid grid-cols-7 gap-1 text-center text-xs mb-3">
                <span className="p-1 text-slate-300"></span>
                <span className="p-1 text-slate-300"></span>
                <span className="p-1 text-slate-300"></span>
                <span className="p-1 text-slate-400 select-none">18</span>
                <span className="p-1 text-slate-400 select-none">19</span>
                <span className="p-1 text-slate-400 select-none">20</span>
                <button
                  type="button"
                  onClick={() => handleSelectDate('2026-09-21')}
                  className={`p-1 rounded-full cursor-pointer transition-colors ${
                    selectedDate === '2026-09-21'
                      ? 'w-7 h-7 mx-auto flex items-center justify-center bg-blue-600 text-white font-bold shadow-xs'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  21
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectDate('2026-09-22')}
                  className={`p-1 rounded-full cursor-pointer transition-colors ${
                    selectedDate === '2026-09-22'
                      ? 'w-7 h-7 mx-auto flex items-center justify-center bg-blue-600 text-white font-bold shadow-xs'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  22
                </button>
                {[23, 24, 25, 26, 27, 28, 29, 30].map((day) => {
                  const dateStr = `2026-09-${day}`;
                  const isSelected = selectedDate === dateStr;
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => handleSelectDate(dateStr)}
                      className={`p-1 rounded-full cursor-pointer transition-colors ${
                        isSelected
                          ? 'w-7 h-7 mx-auto flex items-center justify-center bg-blue-600 text-white font-bold shadow-xs'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>

              {/* Month 2: Oct 2026 Snippet */}
              <div className="text-xs font-bold text-slate-800 mb-1 flex items-center justify-between">
                <span>Oct 2026</span>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center text-xs mb-2 text-slate-600">
                {[1, 2, 3, 4, 5, 6, 7].map((day) => {
                  const dateStr = `2026-10-0${day}`;
                  const isSelected = selectedDate === dateStr;
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => handleSelectDate(dateStr)}
                      className={`p-1 rounded-full cursor-pointer transition-colors ${
                        isSelected
                          ? 'w-7 h-7 mx-auto flex items-center justify-center bg-blue-600 text-white font-bold shadow-xs'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>

              <div className="pt-2 border-t border-slate-100 text-center">
                <span className="text-[11px] text-slate-400">
                  Select a date to filter rooms with zero confirmed bookings
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Column 3: Action Search Button (col-span-1) */}
        <div className="md:col-span-1 flex items-center">
          <button
            type="button"
            onClick={onSearch}
            className="w-full h-10 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-lg font-semibold text-xs tracking-wide shadow-xs hover:shadow transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span>Search</span>
          </button>
        </div>

      </div>
    </section>
  );
}
