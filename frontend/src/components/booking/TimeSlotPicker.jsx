import React from 'react';
import { DEFAULT_SLOTS, getUpcomingDays } from './bookingConstants';

export default function TimeSlotPicker({
  selectedDate,
  onSelectDate,
  selectedSlot,
  onSelectSlot,
  bookedSlots = [],
  isLoading = false,
}) {
  const upcomingDays = getUpcomingDays();

  // Helper to check if a slot is booked
  const getBookingForSlot = (slot) => {
    return bookedSlots.find((b) => {
      if (b.start === slot.start) return true;
      if (b.start_time && b.end_time) {
        const bStart = new Date(b.start_time).toTimeString().slice(0, 5);
        return bStart === slot.start;
      }
      return false;
    });
  };

  return (
    <div className="space-y-6">
      {/* 1. DATE SELECTOR STRIP */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[10px] font-bold flex items-center justify-center">
              1
            </span>
            Step 1: Select Date
          </label>
          <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
            <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Upcoming Days
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {upcomingDays.map((day) => {
            const isActive = selectedDate === day.isoDate;
            return (
              <button
                key={day.isoDate}
                type="button"
                onClick={() => onSelectDate(day.isoDate)}
                className={`py-3 px-3 rounded-xl text-center transition flex flex-col items-center justify-center gap-1 border ${
                  isActive
                    ? 'bg-[#0051d5] text-white border-[#0051d5] shadow-md shadow-blue-600/25 ring-2 ring-[#0051d5] ring-offset-1'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-xs'
                }`}
              >
                <span className={`text-xs font-semibold flex items-center gap-1 ${isActive ? 'text-blue-100' : 'text-slate-500'}`}>
                  {isActive && (
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  {day.dayName}
                </span>
                <span className={`text-sm font-bold ${isActive ? 'text-white' : 'text-slate-900'}`}>
                  {day.formattedDate}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. VISUAL TIME-SLOT MATRIX */}
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[10px] font-bold flex items-center justify-center">
              2
            </span>
            Step 2: Interactive Time-Slot Picker Grid
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 text-xs font-medium text-slate-600">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              Available
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-300"></span>
              Booked / Unavailable
            </span>
            <span className="flex items-center gap-1.5 text-[#0051d5] font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-[#0051d5]"></span>
              Selected
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl">
            Checking real-time slot availability...
          </div>
        ) : (
          <>
            {/* Morning Slots */}
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-700 mb-2.5">
                <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                Morning Slots <span className="text-slate-400 font-normal">(09:00 AM – 12:30 PM)</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {DEFAULT_SLOTS.morning.map((slot) => {
                  const booked = getBookingForSlot(slot);
                  const isSelected = selectedSlot?.start === slot.start;

                  if (booked) {
                    return (
                      <div
                        key={slot.id}
                        className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/90 cursor-not-allowed opacity-80 flex flex-col justify-between select-none"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-slate-400 line-through">
                            {slot.label}
                          </span>
                          <span className="text-[10px] font-semibold text-slate-500 bg-slate-200/80 px-2 py-0.5 rounded-md">
                            Booked
                          </span>
                        </div>
                        <div className="mt-2.5 flex items-center justify-between text-xs text-slate-500">
                          <span className="flex items-center gap-1 text-[11px] text-slate-600 font-medium truncate max-w-[140px]">
                            <svg className="w-3 h-3 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                            {booked.title || 'Reserved'}
                          </span>
                          <span className="text-[10px] font-medium text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded">
                            Unavailable
                          </span>
                        </div>
                      </div>
                    );
                  }

                  if (isSelected) {
                    return (
                      <div
                        key={slot.id}
                        onClick={() => onSelectSlot(slot)}
                        className="p-3.5 rounded-xl bg-[#0051d5] text-white shadow-md shadow-blue-700/25 flex flex-col justify-between ring-2 ring-[#0051d5] ring-offset-2 cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5 text-blue-200" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                            {slot.label}
                          </span>
                          <span className="text-[10px] font-bold bg-white text-[#0051d5] px-2 py-0.5 rounded-md shadow-xs">
                            Selected
                          </span>
                        </div>
                        <div className="mt-2.5 flex items-center justify-between text-xs text-blue-100 font-medium">
                          <span>{slot.duration}</span>
                          <span className="text-[11px] font-bold text-white bg-blue-600/60 px-2 py-0.5 rounded">
                            Active
                          </span>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={slot.id}
                      onClick={() => onSelectSlot(slot)}
                      className="p-3.5 rounded-xl border-2 border-emerald-400 bg-white hover:bg-emerald-50/20 cursor-pointer transition flex flex-col justify-between shadow-xs group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">{slot.label}</span>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          Available
                        </span>
                      </div>
                      <div className="mt-2.5 flex items-center justify-between text-xs text-slate-500">
                        <span>{slot.duration}</span>
                        <span className="text-[11px] font-semibold text-emerald-700 group-hover:underline">
                          Select Slot →
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Afternoon Slots */}
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-700 mb-2.5">
                <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
                Afternoon Slots <span className="text-slate-400 font-normal">(01:00 PM – 05:30 PM)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {DEFAULT_SLOTS.afternoon.map((slot) => {
                  const booked = getBookingForSlot(slot);
                  const isSelected = selectedSlot?.start === slot.start;

                  if (booked) {
                    return (
                      <div
                        key={slot.id}
                        className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/80 cursor-not-allowed opacity-75 flex flex-col justify-between select-none"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-slate-400 line-through">{slot.label}</span>
                          <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        </div>
                        <div className="mt-2 text-[10px] text-slate-500 truncate font-medium">
                          {booked.title || 'Reserved'}
                        </div>
                      </div>
                    );
                  }

                  if (isSelected) {
                    return (
                      <div
                        key={slot.id}
                        onClick={() => onSelectSlot(slot)}
                        className="p-3.5 rounded-xl bg-[#0051d5] text-white shadow-md shadow-blue-700/25 flex flex-col justify-between ring-2 ring-[#0051d5] ring-offset-2 cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white">{slot.label}</span>
                          <span className="text-[10px] font-bold bg-white text-[#0051d5] px-1.5 py-0.5 rounded">
                            Selected
                          </span>
                        </div>
                        <div className="mt-2 text-[11px] text-blue-100 font-medium">
                          {slot.duration}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={slot.id}
                      onClick={() => onSelectSlot(slot)}
                      className="p-3.5 rounded-xl border border-emerald-400 bg-white hover:bg-emerald-50/20 cursor-pointer transition flex flex-col justify-between shadow-xs group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">{slot.label}</span>
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                        <span>{slot.duration}</span>
                        <span className="font-semibold text-emerald-700 group-hover:underline">
                          Select →
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* 3. DOUBLE-BOOKING PROTECTION CALLOUT */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3 text-slate-600">
          <div className="w-7 h-7 rounded-lg bg-blue-100 text-[#0051d5] flex items-center justify-center shrink-0 mt-0.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900">Double-Booking Protection</div>
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
              Slots are verified against database exclusion constraints in real time. If another colleague reserves a slot simultaneously, you will be prompted to pick an alternate time.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
