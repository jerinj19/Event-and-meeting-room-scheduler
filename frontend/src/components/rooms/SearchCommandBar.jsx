import React, { useState, useRef, useEffect } from 'react';
import { getTodayDateString, formatDisplayDate } from '../../utils/dateUtils';

export default function SearchCommandBar({
  locationQuery = '',
  onChangeLocationQuery,
  selectedDate = getTodayDateString(),
  onChangeDate,
  onSearch,
}) {
  const [isDateOpen, setIsDateOpen] = useState(false);
  const datePopoverRef = useRef(null);

  const todayStr = getTodayDateString(0);
  const tomorrowStr = getTodayDateString(1);

  // Dynamic calendar view state
  const [viewYear, setViewYear] = useState(() => {
    if (selectedDate) {
      const parts = selectedDate.split('-');
      if (parts.length === 3) return parseInt(parts[0], 10);
    }
    return new Date().getFullYear();
  });

  const [viewMonth, setViewMonth] = useState(() => {
    if (selectedDate) {
      const parts = selectedDate.split('-');
      if (parts.length === 3) return parseInt(parts[1], 10) - 1;
    }
    return new Date().getMonth();
  });

  // Sync calendar view month when selectedDate or popover opens
  useEffect(() => {
    if (selectedDate) {
      const parts = selectedDate.split('-');
      if (parts.length === 3) {
        setViewYear(parseInt(parts[0], 10));
        setViewMonth(parseInt(parts[1], 10) - 1);
      }
    }
  }, [selectedDate, isDateOpen]);

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

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const getDateDisplay = () => {
    return formatDisplayDate(selectedDate);
  };

  const handleSelectDate = (dateStr) => {
    if (onChangeDate) {
      onChangeDate(dateStr);
    }
  };

  const handleClearDate = (e) => {
    if (e) e.stopPropagation();
    if (onChangeDate) {
      onChangeDate('');
    }
  };

  return (
    <section className="bg-white rounded-xl md:rounded-2xl border border-slate-200 shadow-sm p-2 md:p-3 relative z-10">
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
              <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-100">
                <span className="font-semibold text-xs text-slate-700">Select Date for Availability</span>
                <button
                  type="button"
                  onClick={() => setIsDateOpen(false)}
                  className="text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-2 py-0.5 rounded cursor-pointer"
                >
                  Done
                </button>
              </div>

              {/* Quick Shortcuts: Today, Tomorrow, All Dates */}
              <div className="flex items-center gap-1.5 mb-3">
                <button
                  type="button"
                  onClick={() => {
                    handleSelectDate(todayStr);
                    const now = new Date();
                    setViewYear(now.getFullYear());
                    setViewMonth(now.getMonth());
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    selectedDate === todayStr
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleSelectDate(tomorrowStr);
                    const tm = new Date();
                    tm.setDate(tm.getDate() + 1);
                    setViewYear(tm.getFullYear());
                    setViewMonth(tm.getMonth());
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    selectedDate === tomorrowStr
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  Tomorrow
                </button>
                <button
                  type="button"
                  onClick={handleClearDate}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ml-auto cursor-pointer ${
                    !selectedDate
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  All Dates
                </button>
              </div>

              {/* Month Navigation Header */}
              <div className="text-xs font-bold text-slate-800 mb-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  aria-label="Previous month"
                  className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-600 cursor-pointer font-bold"
                >
                  ‹
                </button>
                <span className="font-semibold text-sm text-slate-800">
                  {new Date(viewYear, viewMonth).toLocaleString('default', { month: 'short' })} {viewYear}
                </span>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  aria-label="Next month"
                  className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-600 cursor-pointer font-bold"
                >
                  ›
                </button>
              </div>

              {/* Days of Week Header */}
              <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-slate-400 font-semibold mb-1">
                <div>M</div><div>T</div><div>W</div><div>T</div><div>F</div><div>S</div><div>S</div>
              </div>

              {/* Dynamic Month Days Grid */}
              <div className="grid grid-cols-7 gap-1 text-center text-xs mb-3">
                {Array.from({ length: (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7 }).map((_, idx) => (
                  <span key={`blank-${idx}`} className="p-1"></span>
                ))}
                {Array.from({ length: new Date(viewYear, viewMonth + 1, 0).getDate() }, (_, i) => i + 1).map((day) => {
                  const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const isSelected = selectedDate === dateStr;
                  const isToday = todayStr === dateStr;

                  return (
                    <button
                      key={dateStr}
                      type="button"
                      onClick={() => handleSelectDate(dateStr)}
                      className={`h-7 w-7 mx-auto rounded-full cursor-pointer transition-colors flex items-center justify-center text-xs ${
                        isSelected
                          ? 'bg-blue-600 text-white font-bold shadow-xs'
                          : isToday
                          ? 'border border-blue-500 text-blue-600 font-bold hover:bg-blue-50'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>

              {/* Footer with direct date input fallback */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span className="truncate">Zero-booking filter</span>
                <input
                  type="date"
                  value={selectedDate || ''}
                  onChange={(e) => handleSelectDate(e.target.value)}
                  className="text-[11px] text-slate-700 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                  title="Direct date input"
                />
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
