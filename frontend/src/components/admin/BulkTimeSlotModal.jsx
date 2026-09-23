import React, { useState, useMemo } from 'react';

export default function BulkTimeSlotModal({
  isOpen,
  onClose,
  onSaveBulk,
  rooms = [],
  loading = false,
}) {
  const [mode, setMode] = useState('generator'); // 'generator' | 'manual'
  const [error, setError] = useState('');

  // 1. Generator Parameters
  const [genEveryDay, setGenEveryDay] = useState(true);
  const [genStart, setGenStart] = useState('09:00');
  const [genEnd, setGenEnd] = useState('18:00');
  const [genDuration, setGenDuration] = useState(60); // minutes
  const [genBreak, setGenBreak] = useState(0); // minutes
  const [genSelectedDates, setGenSelectedDates] = useState([new Date().toISOString().slice(0, 10)]); // array of date strings 'YYYY-MM-DD'
  const [genNewDateInput, setGenNewDateInput] = useState('');
  const [genScopeType, setGenScopeType] = useState('global'); // 'global' | 'multiple'
  const [genSelectedRooms, setGenSelectedRooms] = useState([]); // array of room IDs
  const [genActive, setGenActive] = useState(true);

  // 2. Slots List (Editable rows before committing)
  const [rows, setRows] = useState([
    { id: '1', date: '', start: '09:00', end: '10:00', label: '', period: 'morning', room: '', is_active: true },
    { id: '2', date: '', start: '10:00', end: '11:00', label: '', period: 'morning', room: '', is_active: true },
  ]);

  // Date helper methods
  const handleAddGenDate = () => {
    if (!genNewDateInput) return;
    if (!genSelectedDates.includes(genNewDateInput)) {
      setGenSelectedDates([...genSelectedDates, genNewDateInput].sort());
    }
    setGenNewDateInput('');
  };

  const handleAddQuickDate = (daysAhead) => {
    const d = new Date(Date.now() + daysAhead * 86400000);
    const dStr = d.toISOString().slice(0, 10);
    if (!genSelectedDates.includes(dStr)) {
      setGenSelectedDates([...genSelectedDates, dStr].sort());
    }
  };

  const handleAddNext7Days = () => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(Date.now() + i * 86400000);
      dates.push(d.toISOString().slice(0, 10));
    }
    setGenSelectedDates(Array.from(new Set([...genSelectedDates, ...dates])).sort());
  };

  // Helper to determine period from start time
  const detectPeriod = (startTime) => {
    if (!startTime) return 'morning';
    const [h] = startTime.split(':').map(Number);
    if (h < 12) return 'morning';
    if (h < 17) return 'afternoon';
    return 'evening';
  };

  // Helper to format minutes to HH:MM string
  const minutesToTime = (totalMinutes) => {
    const hours = Math.floor(totalMinutes / 60) % 24;
    const mins = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  };

  // Helper to convert HH:MM to minutes from midnight
  const timeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + (m || 0);
  };

  // Generate slots algorithm supporting Multiple Dates and Global or Multiple Rooms
  const handleRunGenerator = (e) => {
    e?.preventDefault();
    setError('');

    const startMin = timeToMinutes(genStart);
    const endMin = timeToMinutes(genEnd);

    if (endMin <= startMin) {
      setError('Overall End Time must be later than Start Time.');
      return;
    }

    if (genDuration <= 0) {
      setError('Slot Duration must be greater than 0.');
      return;
    }

    if (!genEveryDay && genSelectedDates.length === 0) {
      setError('Please add at least one specific date or choose Every Day.');
      return;
    }

    if (genScopeType === 'multiple' && genSelectedRooms.length === 0) {
      setError('Please select at least one room or switch to Global scope.');
      return;
    }

    const generated = [];
    let cur = startMin;
    let idx = 1;

    // Define target scopes
    const targetScopes =
      genScopeType === 'global'
        ? [{ id: '', name: 'Global (All Rooms)' }]
        : genSelectedRooms.map((rId) => {
            const rObj = rooms.find((r) => r.id === rId);
            return {
              id: rId,
              name: rObj ? rObj.name : 'Room',
            };
          });

    const targetDates = genEveryDay ? [''] : genSelectedDates;

    while (cur + genDuration <= endMin) {
      const slotStart = minutesToTime(cur);
      const slotEnd = minutesToTime(cur + genDuration);
      const slotPeriod = detectPeriod(slotStart);

      for (const d of targetDates) {
        for (const scope of targetScopes) {
          generated.push({
            id: `gen-${Date.now()}-${idx++}`,
            date: d,
            start: slotStart,
            end: slotEnd,
            label: '',
            period: slotPeriod,
            room: scope.id,
            room_name: scope.name,
            is_active: genActive,
          });
        }
      }

      cur += genDuration + Number(genBreak);
    }

    if (generated.length === 0) {
      setError('No complete slots fit in the specified time window. Try increasing the window or decreasing duration.');
      return;
    }

    setRows(generated);
  };

  // Add an empty row
  const handleAddRow = () => {
    const lastRow = rows[rows.length - 1];
    let nextStart = '09:00';
    let nextEnd = '10:00';
    if (lastRow) {
      nextStart = lastRow.end;
      const nextEndMin = timeToMinutes(lastRow.end) + 60;
      nextEnd = minutesToTime(nextEndMin);
    }

    const defaultRoom =
      genScopeType === 'multiple' && genSelectedRooms.length === 1 ? genSelectedRooms[0] : '';
    const defaultDate =
      genSelectedDates.length > 0 ? genSelectedDates[0] : new Date().toISOString().slice(0, 10);

    setRows((prev) => [
      ...prev,
      {
        id: `custom-${Date.now()}-${prev.length + 1}`,
        date: defaultDate,
        start: nextStart,
        end: nextEnd,
        label: '',
        period: detectPeriod(nextStart),
        room: defaultRoom,
        is_active: true,
      },
    ]);
  };

  // Remove a row
  const handleRemoveRow = (id) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  // Update a field in a row
  const handleRowChange = (id, field, value) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const updated = { ...r, [field]: value };
        if (field === 'start') {
          updated.period = detectPeriod(value);
        }
        return updated;
      })
    );
  };

  // Submit all rows
  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (rows.length === 0) {
      setError('Please add or generate at least one time slot row.');
      return;
    }

    // Validation
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!r.date) {
        setError(`Row ${i + 1} has missing calendar date.`);
        return;
      }
      if (!r.start || !r.end) {
        setError(`Row ${i + 1} has missing start or end time.`);
        return;
      }
      const sMin = timeToMinutes(r.start);
      const eMin = timeToMinutes(r.end);
      if (eMin <= sMin) {
        setError(`Row ${i + 1} (${r.start} to ${r.end}): End time must be after start time.`);
        return;
      }
    }

    const payload = rows.map((r, idx) => ({
      date: r.date,
      start_time: r.start,
      end_time: r.end,
      label: r.label?.trim() || '',
      period: r.period || detectPeriod(r.start),
      room: r.room || null,
      is_active: r.is_active !== undefined ? r.is_active : true,
      sort_order: idx,
    }));

    onSaveBulk(payload);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div
        className="bg-surface-container-lowest border border-outline-variant/40 rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden flex flex-col max-h-[92vh]"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-outline-variant/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-2xl" data-icon="more_time">more_time</span>
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-on-surface">
                Add Multiple Time Slots at Once
              </h2>
              <p className="text-xs text-secondary">
                Generate interval-based slots or add a batch of custom meeting slots in bulk.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-secondary hover:text-on-surface hover:bg-surface-container-low transition"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-[20px]" data-icon="close">close</span>
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex border-b border-outline-variant/30 bg-surface-container-low/40 px-5 pt-3 gap-2">
          <button
            type="button"
            onClick={() => setMode('generator')}
            className={`px-4 py-2 text-xs font-semibold rounded-t-xl transition border-b-2 ${
              mode === 'generator'
                ? 'border-primary text-primary bg-surface-container-lowest shadow-xs'
                : 'border-transparent text-secondary hover:text-on-surface'
            }`}
          >
            ⚡ Auto-Generate By Interval
          </button>
          <button
            type="button"
            onClick={() => setMode('manual')}
            className={`px-4 py-2 text-xs font-semibold rounded-t-xl transition border-b-2 ${
              mode === 'manual'
                ? 'border-primary text-primary bg-surface-container-lowest shadow-xs'
                : 'border-transparent text-secondary hover:text-on-surface'
            }`}
          >
            📝 Batch Row List ({rows.length})
          </button>
        </div>

        {/* Content Area */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {error && (
            <div className="p-3 bg-error-container/20 border border-error/30 text-error rounded-xl text-xs flex items-center gap-2">
              <span className="material-symbols-outlined text-base" data-icon="error">error</span>
              <span>{error}</span>
            </div>
          )}

          {/* 1. Generator Controls */}
          {mode === 'generator' && (
            <div className="p-4 bg-surface-container-low border border-outline-variant/50 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-secondary">
                  Interval Generator Settings
                </span>
                <span className="text-[11px] text-secondary">
                  Calculates slots between start and end times
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-secondary mb-1">
                    Window Start
                  </label>
                  <input
                    type="time"
                    value={genStart}
                    onChange={(e) => setGenStart(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-surface-container-lowest border border-outline-variant/60 rounded-lg text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-secondary mb-1">
                    Window End
                  </label>
                  <input
                    type="time"
                    value={genEnd}
                    onChange={(e) => setGenEnd(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-surface-container-lowest border border-outline-variant/60 rounded-lg text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-secondary mb-1">
                    Slot Duration
                  </label>
                  <select
                    value={genDuration}
                    onChange={(e) => setGenDuration(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 text-xs bg-surface-container-lowest border border-outline-variant/60 rounded-lg text-on-surface focus:outline-none focus:border-primary"
                  >
                    <option value={30}>30 Minutes</option>
                    <option value={45}>45 Minutes</option>
                    <option value={60}>60 Minutes (1 hr)</option>
                    <option value={90}>90 Minutes (1.5 hrs)</option>
                    <option value={120}>120 Minutes (2 hrs)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-secondary mb-1">
                    Buffer / Break
                  </label>
                  <select
                    value={genBreak}
                    onChange={(e) => setGenBreak(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 text-xs bg-surface-container-lowest border border-outline-variant/60 rounded-lg text-on-surface focus:outline-none focus:border-primary"
                  >
                    <option value={0}>No Break (0m)</option>
                    <option value={5}>5 Minutes</option>
                    <option value={10}>10 Minutes</option>
                    <option value={15}>15 Minutes</option>
                    <option value={30}>30 Minutes</option>
                  </select>
                </div>
              </div>

              {/* Calendar Date Scope Selection */}
              <div className="pt-2 border-t border-outline-variant/30 space-y-2">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-secondary">
                  Date Applicability
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setGenEveryDay(true)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition border flex items-center gap-1.5 cursor-pointer ${
                      genEveryDay
                        ? 'bg-primary text-white border-primary shadow-xs'
                        : 'bg-surface-container-low text-secondary border-outline-variant/60 hover:text-on-surface'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">all_inclusive</span>
                    <span>Every Day (All Dates)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setGenEveryDay(false)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition border flex items-center gap-1.5 cursor-pointer ${
                      !genEveryDay
                        ? 'bg-primary text-white border-primary shadow-xs'
                        : 'bg-surface-container-low text-secondary border-outline-variant/60 hover:text-on-surface'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">event</span>
                    <span>Specific Date(s)</span>
                  </button>
                </div>

                {genEveryDay ? (
                  <div className="p-2.5 bg-primary/5 border border-primary/20 rounded-xl text-xs text-primary flex items-center gap-2">
                    <span className="material-symbols-outlined text-base">info</span>
                    <span>Generated slots will automatically be available for booking on <strong>each and every day</strong> across the calendar.</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium text-secondary">
                        📅 Generating for {genSelectedDates.length} date{genSelectedDates.length === 1 ? '' : 's'}
                      </span>
                    </div>

                    <div className="p-3 bg-surface-container-lowest border border-outline-variant/50 rounded-xl space-y-2.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          type="date"
                          value={genNewDateInput}
                          onChange={(e) => setGenNewDateInput(e.target.value)}
                          className="px-2.5 py-1.5 text-xs bg-surface-container-low border border-outline-variant rounded-lg text-on-surface outline-none focus:border-primary"
                        />
                        <button
                          type="button"
                          onClick={handleAddGenDate}
                          className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-lg text-xs font-semibold transition cursor-pointer"
                        >
                          + Add Date
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddQuickDate(0)}
                          className="px-2 py-1 text-[11px] bg-surface-container-low hover:bg-surface-container border border-outline-variant/60 rounded-md text-secondary cursor-pointer"
                        >
                          Today
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddQuickDate(1)}
                          className="px-2 py-1 text-[11px] bg-surface-container-low hover:bg-surface-container border border-outline-variant/60 rounded-md text-secondary cursor-pointer"
                        >
                          Tomorrow
                        </button>
                        <button
                          type="button"
                          onClick={handleAddNext7Days}
                          className="px-2 py-1 text-[11px] bg-surface-container-low hover:bg-surface-container border border-outline-variant/60 rounded-md text-secondary cursor-pointer"
                        >
                          + Next 7 Days
                        </button>
                        {genSelectedDates.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setGenSelectedDates([])}
                            className="text-[11px] text-error hover:underline ml-auto cursor-pointer"
                          >
                            Clear
                          </button>
                        )}
                      </div>

                  {genSelectedDates.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {genSelectedDates.map((dStr) => (
                        <span
                          key={dStr}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-surface-container-low border border-primary/30 text-primary rounded-lg text-xs font-semibold shadow-2xs"
                        >
                          <span>📅 {dStr}</span>
                          <button
                            type="button"
                            onClick={() => setGenSelectedDates(genSelectedDates.filter((x) => x !== dStr))}
                            className="text-secondary hover:text-error ml-0.5 text-xs font-bold cursor-pointer"
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-error italic">Please select or add at least one calendar date to generate slots for.</p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-outline-variant/30 space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-secondary">
                      Room Scope Selection
                    </label>
                    <span className="text-[11px] font-medium text-secondary">
                      {genScopeType === 'global'
                        ? '🌐 Generating for All Rooms (Global)'
                        : `📍 Generating for ${genSelectedRooms.length} room${genSelectedRooms.length === 1 ? '' : 's'}`}
                    </span>
                  </div>

                  {/* Radio / Pill Scope Selection */}
                  <div className="flex items-center gap-2 mb-2">
                    <button
                      type="button"
                      onClick={() => setGenScopeType('global')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition border flex items-center gap-1.5 cursor-pointer ${
                        genScopeType === 'global'
                          ? 'bg-primary text-white border-primary shadow-xs'
                          : 'bg-surface-container-lowest text-secondary border-outline-variant/60 hover:text-on-surface hover:bg-surface-container-low'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[16px]" data-icon="public">public</span>
                      <span>🌐 Global (All Rooms)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setGenScopeType('multiple');
                        if (genSelectedRooms.length === 0 && rooms.length > 0) {
                          setGenSelectedRooms(rooms.map((r) => r.id));
                        }
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition border flex items-center gap-1.5 cursor-pointer ${
                        genScopeType === 'multiple'
                          ? 'bg-primary text-white border-primary shadow-xs'
                          : 'bg-surface-container-lowest text-secondary border-outline-variant/60 hover:text-on-surface hover:bg-surface-container-low'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[16px]" data-icon="meeting_room">meeting_room</span>
                      <span>📍 Multiple Rooms ({genSelectedRooms.length})</span>
                    </button>
                  </div>

                  {/* Multi-Room Checkbox Grid */}
                  {genScopeType === 'multiple' && (
                    <div className="p-3 bg-surface-container-lowest border border-outline-variant/50 rounded-xl space-y-2.5">
                      <div className="flex items-center justify-between pb-1 border-b border-outline-variant/30">
                        <span className="text-[11px] font-semibold text-secondary">
                          Select one or more rooms:
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setGenSelectedRooms(rooms.map((r) => r.id))}
                            className="text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                          >
                            Select All ({rooms.length})
                          </button>
                          <span className="text-outline-variant text-xs">•</span>
                          <button
                            type="button"
                            onClick={() => setGenSelectedRooms([])}
                            className="text-[11px] font-semibold text-error hover:underline cursor-pointer"
                          >
                            Deselect All
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto pr-1">
                        {rooms.map((room) => {
                          const isChecked = genSelectedRooms.includes(room.id);
                          return (
                            <label
                              key={room.id}
                              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs cursor-pointer transition select-none ${
                                isChecked
                                  ? 'bg-primary/10 border-primary/40 text-primary font-semibold'
                                  : 'bg-surface-container-low border-outline-variant/40 text-secondary hover:text-on-surface'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setGenSelectedRooms((prev) => [...prev, room.id]);
                                  } else {
                                    setGenSelectedRooms((prev) => prev.filter((id) => id !== room.id));
                                  }
                                }}
                                className="rounded border-outline-variant text-primary focus:ring-primary h-3.5 w-3.5"
                              />
                              <span className="truncate flex-1" title={room.name}>
                                {room.name}
                              </span>
                              {room.location && (
                                <span className="text-[10px] text-secondary/70 truncate max-w-[80px]">
                                  {room.location}
                                </span>
                              )}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end pt-1">
                  <button
                    type="button"
                    onClick={handleRunGenerator}
                    className="w-full sm:w-auto px-4 py-2 bg-primary text-white text-xs font-semibold rounded-xl hover:bg-primary/90 transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]" data-icon="auto_awesome">auto_awesome</span>
                    <span>
                      Generate Slots Into Review Table
                      {genScopeType === 'multiple' && genSelectedRooms.length > 0 ? ` (${genSelectedRooms.length} Rooms)` : ''}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 2. Editable Slots Table */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface">
                  Slots to Create ({rows.length})
                </h3>
                <p className="text-[11px] text-secondary">
                  Review, edit, add, or delete individual rows before creating.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setRows([])}
                  disabled={rows.length === 0}
                  className="px-2.5 py-1 text-[11px] font-semibold text-error hover:bg-error-container/20 rounded-lg transition disabled:opacity-40"
                >
                  Clear All
                </button>
                <button
                  type="button"
                  onClick={handleAddRow}
                  className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition"
                >
                  <span className="material-symbols-outlined text-[15px]" data-icon="add">add</span>
                  <span>Add Row</span>
                </button>
              </div>
            </div>

            {rows.length === 0 ? (
              <div className="p-8 text-center border-2 border-dashed border-outline-variant/40 rounded-2xl text-secondary text-xs">
                No slot rows yet. Click <strong>"Generate Slots"</strong> above or <strong>"+ Add Row"</strong> to start.
              </div>
            ) : (
              <div className="border border-outline-variant/40 rounded-xl overflow-hidden shadow-xs">
                <div className="max-h-[360px] overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-surface-container-low text-secondary font-semibold uppercase text-[10px] tracking-wider sticky top-0 z-10 border-b border-outline-variant/30">
                      <tr>
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Start</th>
                        <th className="py-2.5 px-3">End</th>
                        <th className="py-2.5 px-3">Period</th>
                        <th className="py-2.5 px-3">Custom Label (Optional)</th>
                        <th className="py-2.5 px-3">Scope</th>
                        <th className="py-2.5 px-2 text-center">Del</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/20 bg-surface-container-lowest">
                      {rows.map((row, idx) => (
                        <tr key={row.id} className="hover:bg-surface-container-low/40">
                          <td className="py-2 px-3 text-secondary font-mono text-[11px]">{idx + 1}</td>
                          <td className="py-1.5 px-2">
                            <input
                              type="date"
                              value={row.date || ''}
                              onChange={(e) => handleRowChange(row.id, 'date', e.target.value)}
                              className="px-2 py-1 bg-surface-container-low border border-outline-variant/50 rounded text-xs w-[125px]"
                              required
                              title="Slot Date"
                            />
                          </td>
                          <td className="py-1.5 px-2">
                            <input
                              type="time"
                              value={row.start}
                              onChange={(e) => handleRowChange(row.id, 'start', e.target.value)}
                              className="px-2 py-1 bg-surface-container-low border border-outline-variant/50 rounded text-xs font-mono w-[88px]"
                              required
                            />
                          </td>
                          <td className="py-1.5 px-2">
                            <input
                              type="time"
                              value={row.end}
                              onChange={(e) => handleRowChange(row.id, 'end', e.target.value)}
                              className="px-2 py-1 bg-surface-container-low border border-outline-variant/50 rounded text-xs font-mono w-[88px]"
                              required
                            />
                          </td>
                          <td className="py-1.5 px-2">
                            <select
                              value={row.period}
                              onChange={(e) => handleRowChange(row.id, 'period', e.target.value)}
                              className="px-2 py-1 bg-surface-container-low border border-outline-variant/50 rounded text-xs"
                            >
                              <option value="morning">Morning</option>
                              <option value="afternoon">Afternoon</option>
                              <option value="evening">Evening</option>
                            </select>
                          </td>
                          <td className="py-1.5 px-2">
                            <input
                              type="text"
                              placeholder="Auto-generated if blank"
                              value={row.label}
                              onChange={(e) => handleRowChange(row.id, 'label', e.target.value)}
                              className="px-2 py-1 bg-surface-container-low border border-outline-variant/50 rounded text-xs w-full placeholder:text-secondary/40"
                            />
                          </td>
                          <td className="py-1.5 px-2">
                            <select
                              value={row.room}
                              onChange={(e) => handleRowChange(row.id, 'room', e.target.value)}
                              className="px-2 py-1 bg-surface-container-low border border-outline-variant/50 rounded text-xs max-w-[130px]"
                            >
                              <option value="">Global</option>
                              {rooms.map((r) => (
                                <option key={r.id} value={r.id}>
                                  {r.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-1.5 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveRow(row.id)}
                              className="p-1 rounded text-secondary hover:text-error hover:bg-error-container/20 transition"
                              title="Delete row"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 bg-surface-container-low/60 border-t border-outline-variant/30">
          <div className="text-xs text-secondary font-medium">
            Ready to commit <strong className="text-on-surface">{rows.length}</strong> time slot{rows.length === 1 ? '' : 's'} to database.
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-secondary hover:text-on-surface hover:bg-surface-container rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || rows.length === 0}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-primary hover:bg-primary/90 active:bg-primary/95 rounded-xl shadow-sm transition disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>Creating Slots...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px]" data-icon="add_circle">add_circle</span>
                  <span>Create All ({rows.length}) Slots</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
