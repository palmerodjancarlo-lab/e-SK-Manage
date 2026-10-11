import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

// Merge Tailwind classes cleanly
export function cn(...inputs) { return twMerge(clsx(inputs)) }

export const peso = (n) => `₱${Number(n || 0).toLocaleString('en-PH')}`
export const pesoFixed = (n) => `₱${Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
// "just now", "5 minutes ago", "3 days ago", then a date after a week
export const timeAgo = (d) => {
  if (!d) return '';
  const s = Math.round((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 0) return new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
  if (s < 60) return 'just now';
  const m = Math.round(s / 60); if (m < 60) return `${m} minute${m === 1 ? '' : 's'} ago`;
  const h = Math.round(m / 60); if (h < 24) return `${h} hour${h === 1 ? '' : 's'} ago`;
  const days = Math.round(h / 24); if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
  return new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
};

// Values for <input type="date"> / "datetime-local" in the user's own time zone.
// (toISOString() is UTC — in the Philippines that shows the wrong time, or yesterday before 8 AM.)
const localIso = (d) => { const x = new Date(d); return new Date(x.getTime() - x.getTimezoneOffset() * 60000).toISOString(); };
export const localDateInput = (d = new Date()) => localIso(d).slice(0, 10)
export const localDateTimeInput = (d = new Date()) => localIso(d).slice(0, 16)
