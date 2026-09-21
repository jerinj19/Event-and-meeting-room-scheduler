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
