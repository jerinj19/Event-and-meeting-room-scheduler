import React from 'react';

export default function BookingForm({
  room,
  selectedSlot,
  title,
  onChangeTitle,
  attendeesCount,
  onChangeAttendees,
  description,
  onChangeDescription,
  timeZoneLabel = '(Local / UTC+05:30)',
}) {
  const maxCapacity = room?.capacity || 14;
  const isOverCapacity = Number(attendeesCount) > maxCapacity;

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[10px] font-bold flex items-center justify-center">
            3
          </span>
          Step 3: Reservation Details Form
        </div>
        <span className="text-xs text-slate-400">All fields automatically synchronized</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Meeting Title Input */}
        <div className="space-y-1.5 md:col-span-2">
          <label className="block text-xs font-semibold text-slate-700">
            Meeting Title <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => onChangeTitle(e.target.value)}
            placeholder="e.g. Q4 Product Roadmap & Architecture Sync"
            className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0051d5] focus:bg-white transition"
          />
        </div>

        {/* Expected Attendees Input */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-slate-700">Expected Attendees</label>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                isOverCapacity
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}
            >
              Max {maxCapacity} seats
            </span>
          </div>
          <div className="relative">
            <input
              type="number"
              min="1"
              max={maxCapacity}
              value={attendeesCount}
              onChange={(e) => onChangeAttendees(Number(e.target.value))}
              className={`w-full px-3.5 py-2.5 text-sm bg-slate-50 border rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 transition ${
                isOverCapacity
                  ? 'border-rose-300 focus:ring-rose-500 bg-rose-50/20'
                  : 'border-slate-200 focus:ring-[#0051d5] focus:bg-white'
              }`}
            />
            <span className="absolute right-3.5 top-2.5 text-xs text-slate-400 font-medium">Guests</span>
          </div>
          {isOverCapacity && (
            <p className="text-[11px] text-rose-600 font-medium">
              ⚠️ Attendees count exceeds {room?.name || 'this room'}'s capacity of {maxCapacity} seats!
            </p>
          )}
        </div>

        {/* Selected Time Display */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-slate-700">Selected Time</label>
            <span className="text-[10px] text-slate-400 font-medium">{timeZoneLabel}</span>
          </div>
          <div className="px-3.5 py-2.5 bg-blue-50/60 border border-blue-200 rounded-xl text-sm font-bold text-[#0051d5] flex items-center justify-between">
            <span>{selectedSlot ? selectedSlot.label : 'Select a slot above'}</span>
            {selectedSlot && (
              <span className="text-xs font-semibold text-blue-600 bg-blue-100/70 px-2 py-0.5 rounded">
                {selectedSlot.duration}
              </span>
            )}
          </div>
        </div>

        {/* Meeting Purpose / Notes Textarea */}
        <div className="space-y-1.5 md:col-span-2">
          <label className="block text-xs font-semibold text-slate-700">Meeting Purpose / Agenda Notes</label>
          <textarea
            rows="2"
            value={description}
            onChange={(e) => onChangeDescription(e.target.value)}
            placeholder="Provide agenda or notes for attendees..."
            className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0051d5] focus:bg-white transition"
          />
        </div>
      </div>
    </div>
  );
}
