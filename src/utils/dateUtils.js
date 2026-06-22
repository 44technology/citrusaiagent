/**
 * Formats a date string using UTC to avoid local timezone shifts.
 * Robustly parses YYYY-MM-DD to ensure it's always treated as UTC midnight.
 * 
 * @param {string} dateString - ISO string or YYYY-MM-DD
 * @param {Object} options - toLocaleDateString options
 * @returns {string} Formatted date or "—"
 */
export const formatDateUTC = (dateString, options = { day: '2-digit', month: '2-digit', year: 'numeric' }) => {
  if (!dateString) return '—';
  
  let date;
  if (typeof dateString === 'string') {
    // Manual parsing for YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss.sssZ
    const matches = dateString.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (matches) {
      const year = parseInt(matches[1], 10);
      const month = parseInt(matches[2], 10) - 1; // 0-indexed
      const day = parseInt(matches[3], 10);
      date = new Date(Date.UTC(year, month, day));
    } else {
      date = new Date(dateString);
    }
  } else {
    date = new Date(dateString);
  }
  
  // If date is invalid, return placeholder
  if (isNaN(date.getTime())) return '—';

  return date.toLocaleDateString('en-GB', { ...options, timeZone: 'UTC' });
};

/**
 * Formats a date string as DD/MM/YYYY in UTC.
 */
export const formatFullDateUTC = (dateString) => {
  return formatDateUTC(dateString, { day: '2-digit', month: '2-digit', year: 'numeric' });
};

/**
 * Helper to get YYYY-MM-DD from a Date or ISO string without timezone shift.
 */
export const getISO_YYYYMMDD = (dateInput) => {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '';
  // Use UTC methods to avoid local shift
  return date.toISOString().split('T')[0];
};
