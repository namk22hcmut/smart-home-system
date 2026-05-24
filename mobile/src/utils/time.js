// Utility helpers for parsing and formatting timestamps consistently across the app
export const parseISOToDate = (input) => {
  if (!input) return null;
  try {
    const value = String(input).trim();

    // If input looks like an HH:MM time (scheduling), don't treat as ISO
    if (/^\d{1,2}:\d{2}$/.test(value)) return null;

    // Normalize common backend timestamps that are emitted without timezone.
    // Examples: 2026-05-19T10:20:30, 2026-05-19T10:20:30.123456, 2026-05-19 10:20:30
    const isoDateTime = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d{1,6})?)?$/;
    if (isoDateTime.test(value)) {
      return new Date(value.replace(' ', 'T') + 'Z');
    }

    return new Date(value);
  } catch (e) {
    return null;
  }
};

export const formatRelative = (timestamp, locale = 'vi-VN') => {
  if (!timestamp) return 'N/A';
  const date = parseISOToDate(timestamp) || new Date(timestamp);
  if (!date || Number.isNaN(date.getTime())) return 'N/A';
  const now = new Date();
  const diff = now - date;

  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;

  return date.toLocaleString(locale);
};

export const formatShortTime = (value, locale = 'vi-VN') => {
  if (value == null) return 'N/A';
  // If already a HH:MM string, return as-is (optionally normalize)
  if (typeof value === 'string' && /^\d{1,2}:\d{2}$/.test(value)) {
    const parts = value.split(':');
    const hh = parts[0].padStart(2, '0');
    const mm = parts[1].padStart(2, '0');
    return `${hh}:${mm}`;
  }

  const date = parseISOToDate(value) || new Date(value);
  if (!date || Number.isNaN(date.getTime())) return 'N/A';

  return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
};

export const formatFull = (value, locale = 'vi-VN') => {
  if (value == null) return 'N/A';
  const date = parseISOToDate(value) || new Date(value);
  if (!date || Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleString(locale);
};

export default {
  parseISOToDate,
  formatRelative,
  formatShortTime,
  formatFull,
};
