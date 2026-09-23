/**
 * Date utility helpers for meeting room scheduler.
 */

/**
 * Format a Date object to 'YYYY-MM-DD' local date string.
 * @param {Date} date
 * @returns {string} e.g. "2026-09-23"
 */
export const formatDateToYYYYMMDD = (date = new Date()) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Returns today's date (or offset by days) formatted as 'YYYY-MM-DD'.
 * @param {number} offsetDays - Optional number of days to offset from today
 * @returns {string}
 */
export const getTodayDateString = (offsetDays = 0) => {
  const d = new Date();
  if (offsetDays !== 0) {
    d.setDate(d.getDate() + offsetDays);
  }
  return formatDateToYYYYMMDD(d);
};

/**
 * Format a 'YYYY-MM-DD' string to a human-readable display label.
 * e.g. "Today, 23 Sep 2026", "Tomorrow, 24 Sep 2026", or "25 Sep 2026".
 * @param {string} dateStr
 * @returns {string}
 */
export const formatDisplayDate = (dateStr) => {
  if (!dateStr) return 'Any Date (Click to choose)';
  
  const todayStr = getTodayDateString(0);
  const tomorrowStr = getTodayDateString(1);

  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const year = parts[0];
    const monthNum = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const formatted = `${day} ${months[monthNum - 1]} ${year}`;

    if (dateStr === todayStr) {
      return `Today, ${formatted}`;
    }
    if (dateStr === tomorrowStr) {
      return `Tomorrow, ${formatted}`;
    }
    return formatted;
  }

  return dateStr;
};
