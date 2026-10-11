// Month calendar for meetings & events (Head Console, SK Console, Kabataan portal).
// Days show their events — titles on wider screens, dots on phones. Picking a day lists
// that day's events below through `renderEvents`, so each page keeps its own event card.
import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, CalendarX2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { eventTypeClass } from '../../lib/events';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const keyOf = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
const DOT = {
  Meeting: 'bg-sky-500', Workshop: 'bg-violet-500', Event: 'bg-blue-500',
  Seminar: 'bg-amber-500', Livelihood: 'bg-emerald-500', Sports: 'bg-rose-500',
};

export default function EventCalendar({ events = [], renderEvents }) {
  const [today] = useState(() => new Date());
  const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState(() => keyOf(today));

  // events grouped by local day, each day sorted by time
  const byDay = useMemo(() => {
    const map = {};
    for (const e of events) {
      if (!e?.date) continue;
      const k = keyOf(new Date(e.date));
      (map[k] ||= []).push(e);
    }
    Object.values(map).forEach((l) => l.sort((a, b) => new Date(a.date) - new Date(b.date)));
    return map;
  }, [events]);

  // Whole weeks from the Sunday on/before the 1st through the end of the month (5 or 6 rows)
  const cells = useMemo(() => {
    const start = new Date(month);
    start.setDate(1 - month.getDay());
    const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const count = Math.ceil((month.getDay() + daysInMonth) / 7) * 7;
    return Array.from({ length: count }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
  }, [month]);

  const go = (delta) => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));
  const goToday = () => { setMonth(new Date(today.getFullYear(), today.getMonth(), 1)); setSelected(keyOf(today)); };
  const monthLabel = month.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });
  const inMonth = events.filter((e) => { const d = new Date(e.date); return d.getMonth() === month.getMonth() && d.getFullYear() === month.getFullYear(); }).length;

  const selDate = cells.find((d) => keyOf(d) === selected) || (() => { const [y, m, d] = selected.split('-').map(Number); return new Date(y, m, d); })();
  const dayEvents = byDay[selected] || [];

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
        <div className="flex items-center gap-2 border-b border-border px-3 py-2.5 sm:px-4">
          <h2 className="min-w-0 flex-1 truncate font-bold text-fg" aria-live="polite">
            {monthLabel}
            <span className="ml-2 text-sm font-medium text-muted">{inMonth} event{inMonth === 1 ? '' : 's'}</span>
          </h2>
          <button type="button" onClick={goToday} className="min-h-[36px] rounded-lg border border-border px-3 text-sm font-semibold text-fg hover:bg-surface2">Today</button>
          <button type="button" onClick={() => go(-1)} aria-label="Previous month" className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-surface2 hover:text-fg"><ChevronLeft className="h-5 w-5" /></button>
          <button type="button" onClick={() => go(1)} aria-label="Next month" className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-surface2 hover:text-fg"><ChevronRight className="h-5 w-5" /></button>
        </div>

        <div className="grid grid-cols-7 border-b border-border bg-surface2/50 text-center text-[11px] font-semibold uppercase tracking-wide text-subtle" aria-hidden="true">
          {WEEKDAYS.map((w) => <div key={w} className="py-2"><span className="sm:hidden">{w[0]}</span><span className="hidden sm:inline">{w}</span></div>)}
        </div>

        <div className="grid grid-cols-7">
          {cells.map((d, i) => {
            const k = keyOf(d);
            const list = byDay[k] || [];
            const outside = d.getMonth() !== month.getMonth();
            const isToday = k === keyOf(today);
            const isSel = k === selected;
            const label = `${d.toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' })}${list.length ? `, ${list.length} event${list.length === 1 ? '' : 's'}` : ''}`;
            return (
              <button key={k} type="button" onClick={() => { setSelected(k); if (outside) setMonth(new Date(d.getFullYear(), d.getMonth(), 1)); }}
                aria-label={label} aria-pressed={isSel}
                className={cn('flex min-h-[3.25rem] min-w-0 flex-col items-center gap-1 border-border p-1 text-left transition-colors sm:min-h-[6rem] sm:items-stretch sm:p-1.5',
                  i % 7 !== 6 && 'border-r', i < cells.length - 7 && 'border-b',
                  outside ? 'bg-surface2/40 text-subtle' : 'text-fg',
                  isSel ? 'bg-primary/10' : 'hover:bg-surface2/70')}>
                <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm tabular-nums',
                  isToday && 'bg-primary font-bold text-primary-fg', !isToday && isSel && 'font-bold text-primary')}>{d.getDate()}</span>
                {/* phones: dots */}
                {list.length > 0 && (
                  <span className="flex gap-0.5 sm:hidden" aria-hidden="true">
                    {list.slice(0, 3).map((e) => <span key={e._id} className={cn('h-1.5 w-1.5 rounded-full', DOT[e.type] || 'bg-primary')} />)}
                  </span>
                )}
                {/* wider screens: titles */}
                <span className="hidden min-w-0 flex-col gap-0.5 sm:flex" aria-hidden="true">
                  {list.slice(0, 2).map((e) => (
                    <span key={e._id} className={cn('truncate rounded px-1.5 py-0.5 text-[11px] font-semibold leading-tight', eventTypeClass(e.type))}>{e.title}</span>
                  ))}
                  {list.length > 2 && <span className="px-1 text-[11px] font-semibold text-muted">+{list.length - 2} more</span>}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <section aria-label="Selected day">
        <h3 className="mb-3 text-sm font-bold text-fg">{selDate.toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</h3>
        {dayEvents.length === 0
          ? <p className="flex items-center gap-2 rounded-xl border border-dashed border-border px-4 py-6 text-sm text-muted"><CalendarX2 aria-hidden="true" className="h-4 w-4" /> Nothing scheduled on this day.</p>
          : renderEvents(dayEvents)}
      </section>
    </div>
  );
}
