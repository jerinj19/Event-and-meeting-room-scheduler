/**
 * Standard slot definitions for scheduling
 */
export const DEFAULT_SLOTS = {
  morning: [
    { id: 'm1', start: '09:00', end: '10:00', label: '09:00 – 10:00 AM', duration: '60 mins' },
    { id: 'm2', start: '10:00', end: '11:30', label: '10:00 – 11:30 AM', duration: '90 mins' },
    { id: 'm3', start: '11:30', end: '12:30', label: '11:30 AM – 12:30 PM', duration: '60 mins' },
  ],
  afternoon: [
    { id: 'a1', start: '13:00', end: '14:00', label: '01:00 – 02:00 PM', duration: '60 mins' },
    { id: 'a2', start: '14:00', end: '15:30', label: '02:00 – 03:30 PM', duration: '90 mins' },
    { id: 'a3', start: '15:30', end: '16:30', label: '03:30 – 04:30 PM', duration: '60 mins' },
    { id: 'a4', start: '16:30', end: '17:30', label: '04:30 – 05:30 PM', duration: '60 mins' },
  ],
  evening: [
    { id: 'e1', start: '17:30', end: '18:30', label: '05:30 – 06:30 PM', duration: '60 mins' },
    { id: 'e2', start: '18:30', end: '19:30', label: '06:30 – 07:30 PM', duration: '60 mins' },
    { id: 'e3', start: '19:30', end: '20:30', label: '07:30 – 08:30 PM', duration: '60 mins' },
    { id: 'e4', start: '20:30', end: '22:00', label: '08:30 – 10:00 PM', duration: '90 mins' },
  ],
};

/**
 * Generate 5 consecutive selectable days starting from today
 */
export function getUpcomingDays() {
  const days = [];
  const today = new Date();

  for (let i = 0; i < 5; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const isoDate = `${year}-${month}-${day}`;

    let label = d.toLocaleDateString('en-US', { weekday: 'short' });
    if (i === 0) label = 'Today';
    if (i === 1) label = 'Tomorrow';

    days.push({
      isoDate,
      dayName: label,
      formattedDate: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    });
  }

  return days;
}

/**
 * Check if a time slot has completed (its end time has passed) for a given date
 * relative to the reference time (now).
 *
 * For example: if a slot is 01:00 - 02:00 PM and current time is 02:15 PM,
 * the slot end time (02:00 PM) is earlier than or equal to current time (02:15 PM),
 * so this returns true (i.e. the slot should NOT be shown).
 */
export function isSlotCompleted(slot, selectedDate, now = new Date()) {
  if (!slot || !slot.end || !selectedDate) return false;

  try {
    const today = new Date(now);
    const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    if (selectedDate < todayIso) return true;
    if (selectedDate > todayIso) return false;

    const [year, month, day] = selectedDate.split('-').map(Number);
    const [endHours, endMinutes] = slot.end.split(':').map(Number);

    if (
      isNaN(year) ||
      isNaN(month) ||
      isNaN(day) ||
      isNaN(endHours) ||
      isNaN(endMinutes)
    ) {
      return false;
    }

    const slotEnd = new Date(year, month - 1, day, endHours, endMinutes, 0, 0);
    return slotEnd.getTime() <= now.getTime();
  } catch {
    return false;
  }
}

/**
 * Check if a time slot is currently ongoing/active right now for a given date.
 * (i.e. slotStart <= now < slotEnd on today's date)
 */
export function isSlotCurrent(slot, selectedDate, now = new Date()) {
  if (!slot || !slot.start || !slot.end || !selectedDate) return false;

  try {
    const today = new Date(now);
    const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    if (selectedDate !== todayIso) return false;

    const [year, month, day] = selectedDate.split('-').map(Number);
    const [startHours, startMinutes] = slot.start.split(':').map(Number);
    const [endHours, endMinutes] = slot.end.split(':').map(Number);

    if (
      isNaN(year) ||
      isNaN(month) ||
      isNaN(day) ||
      isNaN(startHours) ||
      isNaN(startMinutes) ||
      isNaN(endHours) ||
      isNaN(endMinutes)
    ) {
      return false;
    }

    const slotStart = new Date(year, month - 1, day, startHours, startMinutes, 0, 0);
    const slotEnd = new Date(year, month - 1, day, endHours, endMinutes, 0, 0);
    const nowTime = now.getTime();

    return slotStart.getTime() <= nowTime && nowTime < slotEnd.getTime();
  } catch {
    return false;
  }
}

/**
 * Backward compatibility alias for isSlotCompleted
 */
export function isSlotPastOrCurrent(slot, selectedDate, now = new Date()) {
  return isSlotCompleted(slot, selectedDate, now);
}
