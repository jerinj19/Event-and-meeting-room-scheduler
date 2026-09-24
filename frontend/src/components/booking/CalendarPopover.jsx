import React from 'react';

/**
 * 30-Day Calendar Popover aligned with Jerin's calendar styling
 * Allows users to choose any date from Today up to 30 days in advance.
 */
export default function CalendarPopover({ selectedDate, onSelectDate, onClose }) {
  const today = new Date();
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth();
  const todayDate = today.getDate();

  const todayMidnight = new Date(todayYear, todayMonth, todayDate).getTime();
  const maxMidnight = todayMidnight + 30 * 24 * 60 * 60 * 1000;

  const todayIso = `${todayYear}-${String(todayMonth + 1).padStart(2, '0')}-${String(todayDate).padStart(2, '0')}`;

  // Generate months that cover the next 30 days
  const months = [];
  const maxDate = new Date(maxMidnight);

  // Month 1: Current month
  months.push({
    year: todayYear,
    month: todayMonth,
  });

  // Month 2: Next month
  const nextMonthDate = new Date(todayYear, todayMonth + 1, 1);
  months.push({
    year: nextMonthDate.getFullYear(),
    month: nextMonthDate.getMonth(),
  });

  // Month 3 if the 30-day window spills past Month 2
  if (
    maxDate.getFullYear() > nextMonthDate.getFullYear() ||
    (maxDate.getFullYear() === nextMonthDate.getFullYear() && maxDate.getMonth() > nextMonthDate.getMonth())
  ) {
    const thirdMonthDate = new Date(todayYear, todayMonth + 2, 1);
    months.push({
      year: thirdMonthDate.getFullYear(),
      month: thirdMonthDate.getMonth(),
    });
  }

  const renderMonth = ({ year, month }) => {
    const monthObj = new Date(year, month, 1);
    const monthLabel = monthObj.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    // Monday-based offset (0 = Mon, ..., 6 = Sun)
    const firstDayIndex = (monthObj.getDay() + 6) % 7;

    const blanks = Array.from({ length: firstDayIndex });
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    return (
      <div key={`${year}-${month}`} className="mb-3.5 last:mb-0">
        <div className="text-xs font-bold text-slate-800 mb-1.5 flex items-center justify-between">
          <span>{monthLabel}</span>
          <span className="text-[10px] text-slate-400 font-normal">IST</span>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-slate-400 font-semibold mb-1">
          <div>M</div><div>T</div><div>W</div><div>T</div><div>F</div><div>S</div><div>S</div>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs">
          {blanks.map((_, idx) => (
            <span key={`blank-${idx}`} className="p-1"></span>
          ))}

          {days.map((day) => {
            const cellDate = new Date(year, month, day);
            const cellTime = cellDate.getTime();
            const isPast = cellTime < todayMidnight;
            const isTooFar = cellTime > maxMidnight;
            const isDisabled = isPast || isTooFar;

            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isSelected = selectedDate === dateStr;
            const isToday = cellTime === todayMidnight;

            if (isDisabled) {
              return (
                <span
                  key={day}
                  className="p-1 text-slate-300 select-none text-xs flex items-center justify-center"
                >
                  {day}
                </span>
              );
            }

            return (
              <button
                key={day}
                type="button"
                onClick={() => onSelectDate(dateStr)}
                className={`w-7 h-7 mx-auto flex items-center justify-center text-xs rounded-full transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-[#0051d5] text-white font-bold shadow-xs'
                    : isToday
                    ? 'text-[#0051d5] font-bold border border-[#0051d5]/40 hover:bg-blue-50'
                    : 'text-slate-700 hover:bg-slate-100 font-medium'
                }`}
                title={isToday ? `Today (${dateStr})` : dateStr}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div
      className="absolute right-0 top-full mt-2 w-[calc(100vw-2rem)] sm:w-80 max-w-sm bg-white rounded-2xl border border-slate-200 shadow-2xl p-3 sm:p-4 z-50 text-slate-800 animate-in fade-in zoom-in-95 duration-150"
      role="dialog"
      aria-label="30-Day Advance Booking Calendar"
    >
      {/* Popover Header */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
        <span className="font-semibold text-xs text-slate-800">Select Date (30-Day Window)</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onSelectDate(todayIso)}
            className="text-[11px] text-blue-600 hover:text-blue-800 font-medium cursor-pointer hover:underline"
          >
            Today
          </button>
          <button
            type="button"
            onClick={onClose}
            className="text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-2 py-0.5 rounded cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>

      {/* Scrollable Month Views */}
      <div className="max-h-[320px] overflow-y-auto pr-1 space-y-2">
        {months.map(renderMonth)}
      </div>

      {/* Popover Footer */}
      <div className="pt-2.5 mt-2 border-t border-slate-100 text-center">
        <span className="text-[11px] text-slate-400">
          Bookings open up to 30 days in advance
        </span>
      </div>
    </div>
  );
}
