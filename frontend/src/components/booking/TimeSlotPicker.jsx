import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  DEFAULT_SLOTS,
  getUpcomingDays,
  isSlotCompleted,
  isSlotCurrent,
} from './bookingConstants';
import CalendarPopover from './CalendarPopover';
import timeSlotService from '../../services/timeSlotService';

export default function TimeSlotPicker({
  roomId,
  selectedDate,
  onSelectDate,
  selectedSlot,
  onSelectSlot,
  bookedSlots = [],
  isLoading = false,
}) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const calendarRef = useRef(null);

  const upcomingDays = getUpcomingDays();

  // ============================================================
  // KEEP CURRENT TIME UPDATED
  // ============================================================
  // Refresh every 15 seconds so a slot automatically disappears
  // when its start time is reached.
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 15000);

    return () => clearInterval(timer);
  }, []);

  // ============================================================
  // CLOSE CALENDAR WHEN CLICKING OUTSIDE
  // ============================================================
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        calendarRef.current &&
        !calendarRef.current.contains(event.target)
      ) {
        setIsCalendarOpen(false);
      }
    }

    if (isCalendarOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCalendarOpen]);

  // ============================================================
  // TODAY DATE
  // ============================================================
  const now = currentTime;

  const todayIso = `${now.getFullYear()}-${String(
    now.getMonth() + 1
  ).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const isToday = selectedDate === todayIso;

  // ============================================================
  // PREVENT PAST DATE SELECTION
  // ============================================================
  useEffect(() => {
    if (!selectedDate || selectedDate < todayIso) {
      onSelectDate(todayIso);
    }
  }, [selectedDate, todayIso, onSelectDate]);

  // ============================================================
  // CUSTOM DATE CHECK
  // ============================================================
  const isCustomDate = !upcomingDays.some(
    (d) => d.isoDate === selectedDate
  );

  const getCustomDateLabel = () => {
    try {
      const [y, m, d] = selectedDate.split('-');

      const dateObj = new Date(
        Number(y),
        Number(m) - 1,
        Number(d)
      );

      return dateObj.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return selectedDate;
    }
  };

  // ============================================================
  // CHECK IF SLOT IS BOOKED
  // ============================================================
  const getBookingForSlot = (slot) => {
    if (
      !slot ||
      !bookedSlots ||
      bookedSlots.length === 0
    ) {
      return null;
    }

    const slotStart = new Date(
      `${selectedDate}T${slot.start}:00`
    ).getTime();

    const slotEnd = new Date(
      `${selectedDate}T${slot.end}:00`
    ).getTime();

    return bookedSlots.find((b) => {
      // Support local/fallback booking format
      if (b.start && b.start === slot.start) {
        return true;
      }

      // Support backend booking format
      if (b.start_time && b.end_time) {
        const bStart = new Date(b.start_time).getTime();
        const bEnd = new Date(b.end_time).getTime();

        return slotStart < bEnd && slotEnd > bStart;
      }

      return false;
    });
  };

  // ============================================================
  // CHECK WHETHER SLOT IS COMPLETED / CURRENT
  // ============================================================
  const isCompleted = useCallback(
    (slot) => isSlotCompleted(slot, selectedDate, currentTime),
    [selectedDate, currentTime]
  );

  const isCurrent = useCallback(
    (slot) => isSlotCurrent(slot, selectedDate, currentTime),
    [selectedDate, currentTime]
  );

  // ============================================================
  // AUTO-DESELECT INVALID SELECTED SLOT
  // ============================================================
  useEffect(() => {
    if (!selectedSlot) return;

    // Disabled by admin
    if (selectedSlot.is_active === false) {
      onSelectSlot(null);
      return;
    }

    // Slot has already completed (end time passed)
    if (isCompleted(selectedSlot)) {
      onSelectSlot(null);
      return;
    }

    // Slot became booked
    if (getBookingForSlot(selectedSlot)) {
      onSelectSlot(null);
    }
  }, [
    selectedSlot,
    selectedDate,
    currentTime,
    bookedSlots,
    isCompleted,
    onSelectSlot,
  ]);

  // ============================================================
  // BACKEND SLOT DATA
  // ============================================================
  const [backendSlots, setBackendSlots] = useState(null);

  const fetchSlots = useCallback(() => {
    let isMounted = true;

    timeSlotService
      .getAvailableSlots(selectedDate, roomId)
      .then((data) => {
        if (
          isMounted &&
          data &&
          data.grouped
        ) {
          setBackendSlots(data.grouped);
        }
      })
      .catch(() => {
        // Fall back to DEFAULT_SLOTS if API fails
      });

    return () => {
      isMounted = false;
    };
  }, [selectedDate, roomId]);

  // ============================================================
  // FETCH WHEN DATE / ROOM CHANGES
  // ============================================================
  useEffect(() => {
    return fetchSlots();
  }, [fetchSlots]);

  // ============================================================
  // AUTO REFRESH SLOT DATA
  // ============================================================
  // Poll backend every 10 seconds.
  // Also refresh when browser regains focus.
  useEffect(() => {
    const timer = setInterval(() => {
      fetchSlots();
    }, 10000);

    const handleFocus = () => {
      fetchSlots();
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener(
      'visibilitychange',
      handleFocus
    );

    return () => {
      clearInterval(timer);

      window.removeEventListener(
        'focus',
        handleFocus
      );

      document.removeEventListener(
        'visibilitychange',
        handleFocus
      );
    };
  }, [fetchSlots]);

  // ============================================================
  // HIDE COMPLETED SLOTS FOR TODAY (SHOW ONLY CURRENT & FUTURE)
  // ============================================================
  const filterVisibleSlots = (slots = []) => {
    // Future date:
    // show every configured slot.
    if (!isToday) {
      return slots;
    }

    // Today:
    // completely remove slots which have already completed.
    // Keep current ongoing slots and future slots.
    return slots.filter(
      (slot) => !isCompleted(slot)
    );
  };

  // Original slot lists (strictly prioritize real backend database slots)
  const allMorningSlots =
    backendSlots !== null
      ? backendSlots?.morning || []
      : DEFAULT_SLOTS.morning || [];

  const allAfternoonSlots =
    backendSlots !== null
      ? backendSlots?.afternoon || []
      : DEFAULT_SLOTS.afternoon || [];

  const allEveningSlots =
    backendSlots !== null
      ? backendSlots?.evening || []
      : DEFAULT_SLOTS.evening || [];

  // Visible slot lists
  const morningSlots =
    filterVisibleSlots(allMorningSlots);

  const afternoonSlots =
    filterVisibleSlots(allAfternoonSlots);

  const eveningSlots =
    filterVisibleSlots(allEveningSlots);

  const totalVisibleSlots =
    morningSlots.length +
    afternoonSlots.length +
    eveningSlots.length;

  // ============================================================
  // RENDER INDIVIDUAL SLOT
  // ============================================================
  const renderSlotItem = (slot) => {
    // Safety net: never render completed slots for today
    if (isCompleted(slot)) {
      return null;
    }

    const isCurrentSlot = isCurrent(slot);
    const booked =
      slot.is_booked ||
      getBookingForSlot(slot);

    const isSelected =
      selectedSlot?.start === slot.start;

    // ----------------------------------------------------------
    // DISABLED SLOT
    // ----------------------------------------------------------
    if (slot.is_active === false) {
      return (
        <div
          key={slot.id}
          className="p-3.5 rounded-xl border border-dashed border-rose-300 bg-rose-50/50 cursor-not-allowed opacity-85 flex flex-col justify-between select-none"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 line-through">
              {slot.label}
            </span>

            <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md border border-rose-200">
              Disabled
            </span>
          </div>

          <div className="mt-2.5 flex items-center justify-between text-xs text-rose-600">
            <span className="text-[11px] font-medium text-slate-500">
              Closed by admin
            </span>

            <span className="text-[10px] font-semibold text-rose-600 bg-rose-100/80 px-1.5 py-0.5 rounded">
              Unavailable
            </span>
          </div>
        </div>
      );
    }

    // ----------------------------------------------------------
    // BOOKED SLOT
    // ----------------------------------------------------------
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
              <svg
                className="w-3 h-3 text-slate-400 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
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

    // ----------------------------------------------------------
    // SELECTED SLOT
    // ----------------------------------------------------------
    if (isSelected) {
      return (
        <div
          key={slot.id}
          onClick={() => onSelectSlot(slot)}
          className="p-3.5 rounded-xl bg-[#0051d5] text-white shadow-md shadow-blue-700/25 flex flex-col justify-between ring-2 ring-[#0051d5] ring-offset-2 cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <svg
                className="w-3.5 h-3.5 text-blue-200"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
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

    // ----------------------------------------------------------
    // CURRENT ONGOING SLOT (ACTIVE NOW)
    // ----------------------------------------------------------
    if (isCurrentSlot) {
      return (
        <div
          key={slot.id}
          onClick={() => onSelectSlot(slot)}
          className="p-3.5 rounded-xl border-2 border-emerald-500 bg-emerald-50/50 hover:bg-emerald-50/80 cursor-pointer transition flex flex-col justify-between shadow-xs group ring-2 ring-emerald-400/30"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900">
              {slot.label}
            </span>

            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-300 flex items-center gap-1 shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
              Active Now
            </span>
          </div>

          <div className="mt-2.5 flex items-center justify-between text-xs text-slate-500">
            <span>{slot.duration}</span>

            <span className="text-[11px] font-bold text-emerald-700 group-hover:underline">
              Book Current Slot →
            </span>
          </div>
        </div>
      );
    }

    // ----------------------------------------------------------
    // AVAILABLE SLOT (FUTURE)
    // ----------------------------------------------------------
    return (
      <div
        key={slot.id}
        onClick={() => onSelectSlot(slot)}
        className="p-3.5 rounded-xl border-2 border-emerald-400 bg-white hover:bg-emerald-50/20 cursor-pointer transition flex flex-col justify-between shadow-xs group"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-900">
            {slot.label}
          </span>

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
  };

  // ============================================================
  // UI
  // ============================================================
  return (
    <div className="space-y-6">

      {/* ====================================================== */}
      {/* STEP 1: DATE SELECTOR */}
      {/* ====================================================== */}

      <div className="space-y-2.5">

        <div className="flex items-center justify-between relative">

          <label className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">

            <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[10px] font-bold flex items-center justify-center">
              1
            </span>

            Step 1: Select Date

          </label>

          {/* Calendar Picker */}
          <div
            className="relative"
            ref={calendarRef}
          >

            <button
              type="button"
              onClick={() =>
                setIsCalendarOpen((prev) => !prev)
              }
              aria-expanded={isCalendarOpen}
              className={`text-xs font-semibold px-3 py-1.5 rounded-xl border flex items-center gap-1.5 transition cursor-pointer ${
                isCalendarOpen || isCustomDate
                  ? 'bg-blue-50 text-[#0051d5] border-blue-200 ring-2 ring-blue-100 shadow-xs'
                  : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200 shadow-xs'
              }`}
              title="Select any date up to 30 days in advance"
            >

              <svg
                className="w-3.5 h-3.5 text-[#0051d5]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>

              <span>
                {isCustomDate
                  ? getCustomDateLabel()
                  : 'Upcoming Days (Calendar)'}
              </span>

              <svg
                className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${
                  isCalendarOpen
                    ? 'rotate-180 text-[#0051d5]'
                    : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M19 9l-7 7-7-7"
                />
              </svg>

            </button>

            {/* Calendar Popover */}
            {isCalendarOpen && (
              <CalendarPopover
                selectedDate={selectedDate}
                onSelectDate={(newDate) => {
                  onSelectDate(newDate);
                  setIsCalendarOpen(false);
                }}
                onClose={() =>
                  setIsCalendarOpen(false)
                }
              />
            )}

          </div>
        </div>

        {/* ==================================================== */}
        {/* QUICK DATE BUTTONS */}
        {/* ==================================================== */}

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-2.5">

          {upcomingDays.map((day, idx) => {
            const isActive =
              selectedDate === day.isoDate;
            const isLastOdd = idx === 4;

            return (
              <button
                key={day.isoDate}
                type="button"
                onClick={() =>
                  onSelectDate(day.isoDate)
                }
                className={`py-2.5 sm:py-3 px-2 sm:px-3 rounded-xl text-center transition flex flex-col items-center justify-center gap-1 border cursor-pointer ${
                  isLastOdd ? 'col-span-2 sm:col-span-1' : ''
                } ${
                  isActive
                    ? 'bg-[#0051d5] text-white border-[#0051d5] shadow-md shadow-blue-600/25 ring-2 ring-[#0051d5] ring-offset-1'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-xs'
                }`}
              >

                <span
                  className={`text-xs font-semibold flex items-center gap-1 ${
                    isActive
                      ? 'text-blue-100'
                      : 'text-slate-500'
                  }`}
                >

                  {isActive && (
                    <svg
                      className="w-3 h-3 text-white"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}

                  {day.dayName}

                </span>

                <span
                  className={`text-sm font-bold ${
                    isActive
                      ? 'text-white'
                      : 'text-slate-900'
                  }`}
                >
                  {day.formattedDate}
                </span>

              </button>
            );
          })}

        </div>

        {/* Custom Selected Date */}
        {isCustomDate && (
          <div className="flex items-center justify-between px-3.5 py-2.5 bg-blue-50/90 border border-blue-200 rounded-xl text-xs text-blue-950 animate-in fade-in duration-150">

            <div className="flex items-center gap-2">

              <span className="w-2 h-2 rounded-full bg-[#0051d5] shrink-0"></span>

              <span>
                Active Date:{' '}
                <strong className="font-bold text-[#0051d5]">
                  {getCustomDateLabel()}
                </strong>{' '}
                (Selected from 30-day calendar)
              </span>

            </div>

            <button
              type="button"
              onClick={() =>
                onSelectDate(
                  upcomingDays[0].isoDate
                )
              }
              className="text-xs font-semibold text-[#0051d5] hover:text-blue-800 hover:underline cursor-pointer"
            >
              Reset to Today
            </button>

          </div>
        )}

      </div>

      {/* ====================================================== */}
      {/* STEP 2: TIME SLOT MATRIX */}
      {/* ====================================================== */}

      <div className="space-y-5">

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">

          <div className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">

            <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[10px] font-bold flex items-center justify-center">
              2
            </span>

            Step 2: Interactive Time-Slot Picker Grid

            {isToday && (
              <span className="normal-case font-normal text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                Live • Showing current & future availability
              </span>
            )}

          </div>

          {/* Legend */}
          <div className="flex items-center gap-3 sm:gap-4 text-xs font-medium text-slate-600 flex-wrap">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              Available
            </span>

            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse"></span>
              Active Now
            </span>

            <span className="flex items-center gap-1.5 text-[#0051d5] font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-[#0051d5]"></span>
              Selected
            </span>

            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-300"></span>
              Booked
            </span>

            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
              Disabled
            </span>
          </div>
        </div>

        {/* ==================================================== */}
        {/* LOADING */}
        {/* ==================================================== */}

        {isLoading ? (

          <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl">
            Checking real-time slot availability...
          </div>

        ) : totalVisibleSlots === 0 ? (

          /* ================================================== */
          /* NO FUTURE SLOTS */
          /* ================================================== */

          <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-2xl space-y-3 animate-in fade-in duration-200">

            <div className="w-12 h-12 mx-auto rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">

              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>

            </div>

            <div className="text-sm font-bold text-slate-800">
              {isToday
                ? 'No More Time Slots Available Today'
                : 'No Time Slots Found for this Date'}
            </div>

            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {isToday
                ? 'All configured time slots for today have already started or passed. Please select another date.'
                : 'No active time slots have been configured for this date or room. Please select another date or room.'}
            </p>

          </div>

        ) : (

          <>
            {/* ================================================= */}
            {/* MORNING */}
            {/* ================================================= */}

            {morningSlots.length > 0 && (
              <div>

                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-700 mb-2.5">

                  <svg
                    className="w-4 h-4 text-amber-500"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                  </svg>

                  Morning Slots

                  <span className="text-slate-400 font-normal">
                    ({morningSlots.length}{' '}
                    slot
                    {morningSlots.length === 1
                      ? ''
                      : 's'}
                    )
                  </span>

                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5 sm:gap-3">

                  {morningSlots.map((slot) =>
                    renderSlotItem(slot)
                  )}

                </div>

              </div>
            )}

            {/* ================================================= */}
            {/* AFTERNOON */}
            {/* ================================================= */}

            {afternoonSlots.length > 0 && (
              <div>

                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-700 mb-2.5">

                  <svg
                    className="w-4 h-4 text-amber-500"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 3v2m0 14v2m9-9h-2M5 12H3m15.364-6.364l-1.414 1.414M7.05 16.95l-1.414 1.414M16.95 16.95l1.414 1.414M7.05 7.05L5.636 5.636M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                  </svg>

                  Afternoon Slots

                  <span className="text-slate-400 font-normal">
                    ({afternoonSlots.length}{' '}
                    slot
                    {afternoonSlots.length === 1
                      ? ''
                      : 's'}
                    )
                  </span>

                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5 sm:gap-3">

                  {afternoonSlots.map((slot) =>
                    renderSlotItem(slot)
                  )}

                </div>

              </div>
            )}

            {/* ================================================= */}
            {/* EVENING */}
            {/* ================================================= */}

            {eveningSlots.length > 0 && (
              <div>

                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-700 mb-2.5">

                  <svg
                    className="w-4 h-4 text-indigo-500"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                    />
                  </svg>

                  Evening Slots

                  <span className="text-slate-400 font-normal">
                    ({eveningSlots.length}{' '}
                    slot
                    {eveningSlots.length === 1
                      ? ''
                      : 's'}
                    )
                  </span>

                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5 sm:gap-3">

                  {eveningSlots.map((slot) =>
                    renderSlotItem(slot)
                  )}

                </div>

              </div>
            )}

          </>
        )}

        {/* ==================================================== */}
        {/* DOUBLE BOOKING INFO */}
        {/* ==================================================== */}

        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3 text-slate-600">

          <div className="w-7 h-7 rounded-lg bg-blue-100 text-[#0051d5] flex items-center justify-center shrink-0 mt-0.5">

            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>

          </div>

          <div>

            <div className="text-xs font-bold text-slate-900">
              Double-Booking Protection
            </div>

            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
              Slots are verified against database exclusion
              constraints in real time. If another colleague
              reserves a slot simultaneously, you will be
              prompted to pick an alternate time.
            </p>

          </div>

        </div>

      </div>

    </div>
  );
}