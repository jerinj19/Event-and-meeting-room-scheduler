import React, { useState, useRef, useEffect } from 'react';

export default function SearchCommandBar({
  locationFilter = 'all',
  onChangeLocation,
  selectedCapacity = 'all',
  onChangeCapacity,
  onSearch,
}) {
  const [isDateOpen, setIsDateOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState(22);
  const [selectedMonth, setSelectedMonth] = useState('Sep');
  const [selectedDuration, setSelectedDuration] = useState('2 hrs');
  
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

  const dateDisplayText = selectedMonth === 'Sep' && selectedDay === 22
    ? `Today (22 Sep)`
    : `${selectedDay} ${selectedMonth}`;

  const handleSelectDate = (day, month) => {
    setSelectedDay(day);
    setSelectedMonth(month);
  };

  const handleDurationClick = (dur) => {
    setSelectedDuration(dur);
  };

  const handleResetDate = (e) => {
    e.stopPropagation();
    setSelectedDay(22);
    setSelectedMonth('Sep');
    setSelectedDuration('2 hrs');
  };

  return (
    <section className="bg-white rounded-xl md:rounded-2xl border border-slate-200 shadow-sm p-2 md:p-3 relative z-30">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-3 items-center">
        
        {/* Column 1: Location (col-span-4) */}
        <div className="md:col-span-4 flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors border border-slate-100 group">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <label htmlFor="search-location-select" className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block cursor-pointer">
              LOCATION
            </label>
            <div className="relative">
              <select
                id="search-location-select"
                value={locationFilter}
                onChange={(e) => onChangeLocation && onChangeLocation(e.target.value)}
                aria-label="Filter by Location"
                className="w-full bg-transparent text-xs font-semibold text-slate-900 border-none p-0 focus:ring-0 cursor-pointer truncate appearance-none pr-5"
              >
                <option value="all">Bangalore (Koramangala, Indiranagar, MG Road)</option>
                <option value="Koramangala">Bangalore • Koramangala</option>
                <option value="Indiranagar">Bangalore • Indiranagar</option>
                <option value="MG Road">Bangalore • MG Road</option>
                <option value="Whitefield">Bangalore • Whitefield</option>
              </select>
              <svg className="w-3.5 h-3.5 text-slate-400 absolute right-0 top-0.5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Column 2: Date & Duration with Floating Calendar Popover (col-span-4) */}
        <div className="md:col-span-4 relative" ref={datePopoverRef}>
          <button
            type="button"
            onClick={() => setIsDateOpen((prev) => !prev)}
            aria-expanded={isDateOpen}
            aria-label="Select Date and Meeting Duration"
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
                DATE &amp; DURATION
              </div>
              <div className={`text-xs font-semibold truncate ${isDateOpen ? 'text-blue-600' : 'text-slate-900'}`}>
                {dateDisplayText}, {selectedDuration}
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
              className="absolute top-full left-0 mt-2 w-80 sm:w-88 bg-white rounded-2xl border border-slate-200 shadow-2xl p-4 z-50 text-slate-800 animate-in fade-in zoom-in-95 duration-150"
              role="dialog"
              aria-label="Date and Duration Picker"
            >
              {/* Popover Header */}
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                <span className="font-semibold text-xs text-slate-700">Date &amp; Duration</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleResetDate}
                    className="text-[11px] text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
                  >
                    Reset
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
                  onClick={() => handleSelectDate(21, 'Sep')}
                  className={`p-1 rounded-full cursor-pointer transition-colors ${
                    selectedDay === 21 && selectedMonth === 'Sep'
                      ? 'w-7 h-7 mx-auto flex items-center justify-center bg-blue-600 text-white font-bold shadow-xs'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  21
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectDate(22, 'Sep')}
                  className={`p-1 rounded-full cursor-pointer transition-colors ${
                    selectedDay === 22 && selectedMonth === 'Sep'
                      ? 'w-7 h-7 mx-auto flex items-center justify-center bg-blue-600 text-white font-bold shadow-xs'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  22
                </button>
                {[23, 24, 25, 26, 27, 28, 29, 30].map((day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => handleSelectDate(day, 'Sep')}
                    className={`p-1 rounded-full cursor-pointer transition-colors ${
                      selectedDay === day && selectedMonth === 'Sep'
                        ? 'w-7 h-7 mx-auto flex items-center justify-center bg-blue-600 text-white font-bold shadow-xs'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>

              {/* Month 2: Oct 2026 Snippet */}
              <div className="text-xs font-bold text-slate-800 mb-1 flex items-center justify-between">
                <span>Oct 2026</span>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center text-xs mb-3 text-slate-600">
                {[1, 2, 3, 4].map((day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => handleSelectDate(day, 'Oct')}
                    className={`p-1 rounded-full cursor-pointer transition-colors ${
                      selectedDay === day && selectedMonth === 'Oct'
                        ? 'w-7 h-7 mx-auto flex items-center justify-center bg-blue-600 text-white font-bold shadow-xs'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>

              {/* Duration Selector Pills */}
              <div className="pt-2 border-t border-slate-100">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Meeting Duration
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {['1 hr', '2 hrs', 'Half Day (4h)', 'Full Day (8h)'].map((dur) => (
                    <button
                      key={dur}
                      type="button"
                      onClick={() => handleDurationClick(dur)}
                      className={`px-2.5 py-1 text-xs rounded-lg font-medium cursor-pointer transition-all ${
                        selectedDuration === dur
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'border border-slate-200 text-slate-600 hover:border-blue-300 hover:text-slate-900 bg-white'
                      }`}
                    >
                      {dur}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Column 3: Capacity (col-span-3) */}
        <div className="md:col-span-3 flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors border border-slate-100 group">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <label htmlFor="search-capacity-select" className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block cursor-pointer">
              CAPACITY
            </label>
            <div className="relative">
              <select
                id="search-capacity-select"
                value={selectedCapacity}
                onChange={(e) => onChangeCapacity && onChangeCapacity(e.target.value)}
                aria-label="Filter by Capacity"
                className="w-full bg-transparent text-xs font-semibold text-slate-900 border-none p-0 focus:ring-0 cursor-pointer truncate appearance-none pr-5"
              >
                <option value="all">All Capacities</option>
                <option value="small">4+ Seats (Focus Pod)</option>
                <option value="medium">8+ Seats (Team Room)</option>
                <option value="large">14+ Seats (Boardroom)</option>
                <option value="boardroom">25+ Seats (Auditorium)</option>
              </select>
              <svg className="w-3.5 h-3.5 text-slate-400 absolute right-0 top-0.5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Column 4: Action Search Button (col-span-1) */}
        <div className="md:col-span-2 lg:col-span-1 flex items-center">
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
