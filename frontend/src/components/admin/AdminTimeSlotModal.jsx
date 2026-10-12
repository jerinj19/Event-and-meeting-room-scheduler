import React, { useState, useEffect, useMemo } from 'react';

export default function AdminTimeSlotModal({
  isOpen,
  onClose,
  onSave,
  slot = null,
  rooms = [],
  loading = false,
  defaultDate = '',
}) {
  const isEditMode = Boolean(slot);

  const [label, setLabel] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [period, setPeriod] = useState('auto');
  const [scheduleType, setScheduleType] = useState('recurring'); // 'recurring' | 'specific'
  const [selectedDates, setSelectedDates] = useState([]);
  const [newDateInput, setNewDateInput] = useState('');
  const [scopeType, setScopeType] = useState('global'); // 'global' | 'multiple'
  const [selectedRoomIds, setSelectedRoomIds] = useState([]); // array of room IDs
  const [isActive, setIsActive] = useState(true);
  const [sortOrder, setSortOrder] = useState(0);
  const [error, setError] = useState('');

  const getTodayStr = () => new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (slot) {
      setLabel(slot.label || '');
      setStartTime(slot.start || (slot.start_time ? slot.start_time.slice(0, 5) : '09:00'));
      setEndTime(slot.end || (slot.end_time ? slot.end_time.slice(0, 5) : '10:00'));
      setPeriod(slot.period || 'morning');
      if (slot.date) {
        setScheduleType('specific');
        setSelectedDates([slot.date]);
        setNewDateInput(slot.date);
      } else {
        setScheduleType('recurring');
        setSelectedDates([]);
        setNewDateInput('');
      }
      setScopeType(slot.room ? 'multiple' : 'global');
      setSelectedRoomIds(slot.room ? [slot.room] : []);
      setIsActive(slot.is_active !== undefined ? slot.is_active : true);
      setSortOrder(slot.sort_order || 0);
      setError('');
    } else {
      setLabel('');
      setStartTime('09:00');
      setEndTime('10:00');
      setPeriod('auto');
      if (defaultDate) {
        setScheduleType('specific');
        setSelectedDates([defaultDate]);
        setNewDateInput(defaultDate);
      } else {
        setScheduleType('recurring');
        setSelectedDates([getTodayStr()]);
        setNewDateInput('');
      }
      setScopeType('global');
      setSelectedRoomIds([]);
      setIsActive(true);
      setSortOrder(0);
      setError('');
    }
  }, [slot, isOpen, defaultDate]);

  // Compute calculated duration in minutes
  const calculatedDuration = useMemo(() => {
    if (!startTime || !endTime) return 0;
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    return eh * 60 + em - (sh * 60 + sm);
  }, [startTime, endTime]);

  // Computed period if set to 'auto'
  const computedPeriod = useMemo(() => {
    if (period !== 'auto') return period;
    if (!startTime) return 'morning';
    const [sh] = startTime.split(':').map(Number);
    if (sh < 12) return 'morning';
    if (sh < 17) return 'afternoon';
    return 'evening';
  }, [period, startTime]);

  // Helper to format 24h string to 12h AM/PM
  const formatTime12h = (time24) => {
    if (!time24) return '';
    const [hStr, mStr] = time24.split(':');
    const h = Number(hStr);
    const m = mStr || '00';
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${String(h12).padStart(2, '0')}:${m} ${ampm}`;
  };

  const previewLabel = label.trim() || `${formatTime12h(startTime)} – ${formatTime12h(endTime)}`;

  const handleAddDate = () => {
    if (!newDateInput) return;
    if (!selectedDates.includes(newDateInput)) {
      setSelectedDates([...selectedDates, newDateInput].sort());
    }
    setNewDateInput('');
  };

  const handleAddNextDays = (count) => {
    const dates = [];
    for (let i = 0; i < count; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      dates.push(`${y}-${m}-${day}`);
    }
    setSelectedDates(Array.from(new Set([...selectedDates, ...dates])).sort());
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!startTime || !endTime) {
      setError('Start time and End time are required.');
      return;
    }

    if (calculatedDuration <= 0) {
      setError('End time must be later than start time.');
      return;
    }

    if (scheduleType === 'specific' && selectedDates.length === 0) {
      setError('Please select at least one calendar date or choose Every Day (Recurring).');
      return;
    }

    if (scopeType === 'multiple' && selectedRoomIds.length === 0) {
      setError('Please select at least one room or switch to Global scope.');
      return;
    }

    const targetDate = scheduleType === 'specific' ? selectedDates[0] : null;
    const targetDates = scheduleType === 'specific' ? selectedDates : [null];

    if (isEditMode) {
      onSave({
        label: label.trim(),
        date: targetDate,
        start_time: startTime,
        end_time: endTime,
        period: computedPeriod,
        room: scopeType === 'global' ? null : selectedRoomIds[0] || null,
        is_active: isActive,
        sort_order: Number(sortOrder) || 0,
      });
    } else {
      onSave({
        label: label.trim(),
        dates: targetDates,
        date: targetDate,
        start_time: startTime,
        end_time: endTime,
        period: computedPeriod,
        room_ids: scopeType === 'multiple' ? selectedRoomIds : [],
        room: scopeType === 'global' ? null : (selectedRoomIds[0] || null),
        is_active: isActive,
        sort_order: Number(sortOrder) || 0,
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div
        className="bg-surface-container-lowest border border-outline-variant/40 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-outline-variant/30">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-xl" data-icon="schedule">schedule</span>
            </div>
            <div>
              <h2 className="text-base font-bold text-on-surface">
                {isEditMode ? 'Edit Time Slot' : 'Add New Time Slot'}
              </h2>
              <p className="text-xs text-secondary">
                Configure start, end, category, and room applicability.
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3 bg-error-container/20 border border-error/30 text-error rounded-xl text-xs flex items-center gap-2">
              <span className="material-symbols-outlined text-base" data-icon="error">error</span>
              <span>{error}</span>
            </div>
          )}

          {/* Times: Start & End */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-secondary mb-1.5">
                Start Time <span className="text-error">*</span>
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm bg-surface-container-low border border-outline-variant/60 rounded-xl text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-secondary mb-1.5">
                End Time <span className="text-error">*</span>
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm bg-surface-container-low border border-outline-variant/60 rounded-xl text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
              />
            </div>
          </div>

          {/* Duration Indicator */}
          <div className="flex items-center justify-between px-3 py-2 bg-surface-container-low rounded-xl border border-outline-variant/30 text-xs">
            <span className="text-secondary font-medium">Computed Duration:</span>
            <span className={`font-bold ${calculatedDuration > 0 ? 'text-primary' : 'text-error'}`}>
              {calculatedDuration > 0 ? `${calculatedDuration} minutes (${(calculatedDuration / 60).toFixed(1)} hrs)` : 'Invalid (End <= Start)'}
            </span>
          </div>

          {/* Custom Label (Optional) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-secondary">
                Display Label <span className="text-[11px] font-normal text-secondary/70">(Optional)</span>
              </label>
              <span className="text-[11px] text-secondary">Leave blank for automatic formatting</span>
            </div>
            <input
              type="text"
              placeholder={`e.g. ${formatTime12h(startTime)} – ${formatTime12h(endTime)}`}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              maxLength={100}
              className="w-full px-3 py-2 text-sm bg-surface-container-low border border-outline-variant/60 rounded-xl text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition placeholder:text-secondary/50"
            />
          </div>

          {/* Category & Scope */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-secondary mb-1.5">
                Session / Time Category
              </label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-surface-container-low border border-outline-variant/60 rounded-xl text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
              >
                <option value="auto">Auto-Detect ({computedPeriod})</option>
                <option value="morning">Morning (Before 12:00 PM)</option>
                <option value="afternoon">Afternoon (12:00 – 05:00 PM)</option>
                <option value="evening">Evening (After 05:00 PM)</option>
              </select>
            </div>

            {/* Date Applicability Section */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-secondary">
                Date Applicability <span className="text-error">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setScheduleType('recurring')}
                  className={`p-2.5 rounded-xl border text-left text-xs font-medium transition cursor-pointer flex items-center gap-2 ${
                    scheduleType === 'recurring'
                      ? 'border-primary bg-primary/10 text-primary font-bold shadow-2xs'
                      : 'border-outline-variant/60 bg-surface-container-low text-secondary hover:text-on-surface'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">repeat</span>
                  <div>
                    <div>Every Day (Daily)</div>
                    <div className="text-[10px] opacity-75 font-normal">Active for all dates</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setScheduleType('specific');
                    if (selectedDates.length === 0) {
                      setSelectedDates([defaultDate || getTodayStr()]);
                    }
                  }}
                  className={`p-2.5 rounded-xl border text-left text-xs font-medium transition cursor-pointer flex items-center gap-2 ${
                    scheduleType === 'specific'
                      ? 'border-primary bg-primary/10 text-primary font-bold shadow-2xs'
                      : 'border-outline-variant/60 bg-surface-container-low text-secondary hover:text-on-surface'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">calendar_month</span>
                  <div>
                    <div>Specific Date(s)</div>
                    <div className="text-[10px] opacity-75 font-normal">Target single or multiple days</div>
                  </div>
                </button>
              </div>

              {scheduleType === 'recurring' ? (
                <div className="p-3 bg-blue-50/70 border border-blue-200/70 rounded-xl text-xs text-blue-800 flex items-center gap-2">
                  <span className="material-symbols-outlined text-base text-blue-600">info</span>
                  <span>This slot will recur on every calendar date (today, tomorrow, or any selected day).</span>
                </div>
              ) : isEditMode ? (
                <div>
                  <input
                    type="date"
                    value={selectedDates[0] || ''}
                    onChange={(e) => setSelectedDates(e.target.value ? [e.target.value] : [])}
                    required
                    className="w-full px-3 py-2 text-sm bg-surface-container-low border border-outline-variant/60 rounded-xl text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
                  />
                </div>
              ) : (
                <div className="p-3 bg-surface-container-low border border-outline-variant/50 rounded-xl space-y-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="date"
                      value={newDateInput}
                      onChange={(e) => setNewDateInput(e.target.value)}
                      className="px-2.5 py-1.5 text-xs bg-surface-container-lowest border border-outline-variant rounded-lg text-on-surface outline-none focus:border-primary"
                    />
                    <button
                      type="button"
                      onClick={handleAddDate}
                      className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-lg text-xs font-semibold transition cursor-pointer"
                    >
                      + Add Date
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date();
                        const y = d.getFullYear();
                        const m = String(d.getMonth() + 1).padStart(2, '0');
                        const day = String(d.getDate()).padStart(2, '0');
                        const today = `${y}-${m}-${day}`;
                        if (!selectedDates.includes(today)) setSelectedDates([...selectedDates, today].sort());
                      }}
                      className="px-2 py-1 text-[11px] bg-surface-container-lowest hover:bg-surface-container border border-outline-variant/60 rounded-md text-secondary cursor-pointer"
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date();
                        d.setDate(d.getDate() + 1);
                        const y = d.getFullYear();
                        const m = String(d.getMonth() + 1).padStart(2, '0');
                        const day = String(d.getDate()).padStart(2, '0');
                        const tmrw = `${y}-${m}-${day}`;
                        if (!selectedDates.includes(tmrw)) setSelectedDates([...selectedDates, tmrw].sort());
                      }}
                      className="px-2 py-1 text-[11px] bg-surface-container-lowest hover:bg-surface-container border border-outline-variant/60 rounded-md text-secondary cursor-pointer"
                    >
                      Tomorrow
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddNextDays(7)}
                      className="px-2 py-1 text-[11px] bg-surface-container-lowest hover:bg-surface-container border border-outline-variant/60 rounded-md text-secondary cursor-pointer"
                    >
                      + Next 7 Days
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddNextDays(14)}
                      className="px-2 py-1 text-[11px] bg-surface-container-lowest hover:bg-surface-container border border-outline-variant/60 rounded-md text-secondary cursor-pointer"
                    >
                      + Next 14 Days
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddNextDays(30)}
                      className="px-2 py-1 text-[11px] bg-surface-container-lowest hover:bg-surface-container border border-outline-variant/60 rounded-md text-secondary cursor-pointer"
                    >
                      + Next Month
                    </button>
                    {selectedDates.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedDates([])}
                        className="text-[11px] text-error hover:underline ml-auto cursor-pointer"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  {/* Chips for Selected Dates */}
                  {selectedDates.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {selectedDates.map((dStr) => (
                        <span
                          key={dStr}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-surface-container-lowest border border-primary/30 text-primary rounded-lg text-xs font-semibold shadow-2xs"
                        >
                          <span>📅 {dStr}</span>
                          <button
                            type="button"
                            onClick={() => setSelectedDates(selectedDates.filter((x) => x !== dStr))}
                            className="text-secondary hover:text-error ml-0.5 text-xs font-bold cursor-pointer"
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-error italic">Please select or add at least one calendar date.</p>
                  )}
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-secondary">
                  Applicable Room Scope
                </label>
                {!isEditMode && (
                  <span className="text-[11px] font-medium text-secondary">
                    {scopeType === 'global'
                      ? '🌐 Applies globally to all rooms'
                      : `📍 ${selectedRoomIds.length} room${selectedRoomIds.length === 1 ? '' : 's'} selected`}
                  </span>
                )}
              </div>

              {isEditMode ? (
                <select
                  value={selectedRoomIds[0] || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setScopeType(val ? 'multiple' : 'global');
                    setSelectedRoomIds(val ? [val] : []);
                  }}
                  className="w-full px-3 py-2 text-sm bg-surface-container-low border border-outline-variant/60 rounded-xl text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
                >
                  <option value="">Global (Available to All Rooms)</option>
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      📍 {r.name} ({r.location})
                    </option>
                  ))}
                </select>
              ) : (
                <div className="space-y-2.5">
                  {/* Mode selector pills */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setScopeType('global');
                        setSelectedRoomIds([]);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition border flex items-center gap-1.5 cursor-pointer ${
                        scopeType === 'global'
                          ? 'bg-primary text-white border-primary shadow-xs'
                          : 'bg-surface-container-low text-secondary border-outline-variant/60 hover:text-on-surface'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[16px]" data-icon="public">public</span>
                      <span>🌐 Global (All Rooms)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setScopeType('multiple');
                        if (selectedRoomIds.length === 0 && rooms.length > 0) {
                          setSelectedRoomIds(rooms.map((r) => r.id));
                        }
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition border flex items-center gap-1.5 cursor-pointer ${
                        scopeType === 'multiple'
                          ? 'bg-primary text-white border-primary shadow-xs'
                          : 'bg-surface-container-low text-secondary border-outline-variant/60 hover:text-on-surface'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[16px]" data-icon="meeting_room">meeting_room</span>
                      <span>📍 Multiple Rooms ({selectedRoomIds.length})</span>
                    </button>
                  </div>

                  {scopeType === 'global' ? (
                    <div className="p-2.5 bg-surface-container-low border border-outline-variant/40 rounded-xl text-xs text-secondary flex items-center gap-2">
                      <span className="material-symbols-outlined text-base text-primary" data-icon="info">info</span>
                      <span>This slot will be universally available to <strong>all rooms</strong> that don't have custom overrides.</span>
                    </div>
                  ) : (
                    <div className="p-3 bg-surface-container-low border border-outline-variant/50 rounded-xl space-y-2">
                      <div className="flex items-center justify-between pb-1 border-b border-outline-variant/30">
                        <span className="text-[11px] font-semibold text-secondary">
                          Select one or multiple rooms:
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedRoomIds(rooms.map((r) => r.id))}
                            className="text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                          >
                            Select All ({rooms.length})
                          </button>
                          <span className="text-outline-variant text-xs">•</span>
                          <button
                            type="button"
                            onClick={() => setSelectedRoomIds([])}
                            className="text-[11px] font-semibold text-error hover:underline cursor-pointer"
                          >
                            Deselect All
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
                        {rooms.map((r) => {
                          const isChecked = selectedRoomIds.includes(r.id);
                          return (
                            <label
                              key={r.id}
                              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs cursor-pointer transition select-none ${
                                isChecked
                                  ? 'bg-primary/10 border-primary/40 text-primary font-semibold'
                                  : 'bg-surface-container-lowest border-outline-variant/40 text-secondary hover:text-on-surface'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedRoomIds((prev) => [...prev, r.id]);
                                  } else {
                                    setSelectedRoomIds((prev) => prev.filter((id) => id !== r.id));
                                  }
                                }}
                                className="rounded border-outline-variant text-primary focus:ring-primary h-3.5 w-3.5"
                              />
                              <span className="truncate flex-1">{r.name}</span>
                              {r.location && (
                                <span className="text-[10px] text-secondary/70 truncate max-w-[80px]">
                                  {r.location}
                                </span>
                              )}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Sort Order & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center pt-2">
            <div>
              <label className="block text-xs font-semibold text-secondary mb-1.5">
                Display Order Weight
              </label>
              <input
                type="number"
                min="0"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-surface-container-low border border-outline-variant/60 rounded-xl text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
              />
            </div>

            <div className="flex items-center gap-3 pt-5">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-6 bg-surface-container-high peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                <span className="ml-2.5 text-xs font-semibold text-on-surface">
                  {isActive ? 'Active Slot' : 'Inactive / Disabled'}
                </span>
              </label>
            </div>
          </div>

          {/* Live Preview Card */}
          <div className="pt-2">
            <div className="text-[11px] font-semibold text-secondary uppercase tracking-wider mb-1.5">
              Live Booking Picker Preview
            </div>
            <div className="p-3.5 bg-surface-container-low border border-outline-variant/40 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                  {calculatedDuration > 0 ? `${calculatedDuration}m` : '--'}
                </div>
                <div>
                  <div className="text-sm font-bold text-on-surface">{previewLabel}</div>
                  <div className="text-[11px] text-secondary flex items-center gap-2">
                    <span className="capitalize">{computedPeriod}</span>
                    <span>•</span>
                    <span>
                      {isEditMode
                        ? (selectedRoomIds[0] ? rooms.find((r) => r.id === selectedRoomIds[0])?.name || 'Specific Room' : 'Global (All Rooms)')
                        : (scopeType === 'global' ? 'Global (All Rooms)' : `${selectedRoomIds.length} Room${selectedRoomIds.length === 1 ? '' : 's'} Selected`)}
                    </span>
                  </div>
                </div>
              </div>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                isActive 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                  : 'bg-slate-100 text-slate-500 border-slate-200'
              }`}>
                {isActive ? 'Active' : 'Disabled'}
              </span>
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-outline-variant/30">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-secondary hover:text-on-surface hover:bg-surface-container rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || calculatedDuration <= 0}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-primary hover:bg-primary/90 active:bg-primary/95 rounded-xl shadow-sm transition disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px]" data-icon="check">check</span>
                  <span>
                    {isEditMode
                      ? 'Update Slot'
                      : (scopeType === 'multiple' && selectedRoomIds.length > 1
                          ? `Create ${selectedRoomIds.length} Time Slots`
                          : 'Create Slot')}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
