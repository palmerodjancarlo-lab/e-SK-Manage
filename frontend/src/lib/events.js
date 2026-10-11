// Shared look for meetings & events across the Head Console, SK Console and Kabataan portal.

// Badge colours per event type (text always passes AA on its tint, light and dark)
export const EVENT_TYPE_STYLE = {
  Meeting: 'bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300',
  Workshop: 'bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-300',
  Event: 'bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300',
  Seminar: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
  Livelihood: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
  Sports: 'bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300',
};
export const eventTypeClass = (type) => EVENT_TYPE_STYLE[type] || 'bg-surface2 text-muted';

// An event still counts as "upcoming" for a few hours after its start time
export const EVENT_GRACE_MS = 3 * 3600e3;
export const isPastEvent = (m, now) => new Date(m.date).getTime() < now - EVENT_GRACE_MS;

export const eventTime = (m) =>
  m.time || new Date(m.date).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' });

// "9:00 AM", "9am", "14:30", "2 pm" → { h, m } (24-hour), or null if it can't be read
export const parseTimeText = (text) => {
  const t = String(text || '').trim().toLowerCase().replace(/\./g, '');
  const m = t.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm|nn|n)?$/);
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2] || 0);
  const ap = m[3];
  if (min > 59 || h > 23 || (ap && (h < 1 || h > 12))) return null;
  if (ap === 'pm' && h < 12) h += 12;
  if (ap === 'am' && h === 12) h = 0;
  return { h, m: min };
};

// A date input ("2026-10-15") + optional time text → ISO timestamp in the user's time zone.
// Without a time the event is placed at 8:00 AM.
export const combineDateTime = (dateStr, timeText) => {
  const [y, mo, d] = String(dateStr).split('-').map(Number);
  const t = parseTimeText(timeText) || { h: 8, m: 0 };
  return new Date(y, mo - 1, d, t.h, t.m).toISOString();
};
