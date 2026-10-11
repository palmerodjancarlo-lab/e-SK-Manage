// Calendar-style date tile used on every meetings/events list.
import { cn } from '../../lib/utils';

const SIZES = {
  md: { box: 'w-16', month: 'py-0.5 text-[10px]', day: 'pt-1 text-2xl', week: 'pb-1.5 text-[10px]' },
  sm: { box: 'w-12', month: 'py-px text-[9px]', day: 'pt-0.5 text-lg', week: 'pb-1 text-[9px]' },
};

export default function DateTile({ date, past, size = 'md', className }) {
  const d = new Date(date);
  const z = SIZES[size] || SIZES.md;
  return (
    <div
      className={cn('flex shrink-0 flex-col items-center self-start overflow-hidden rounded-lg border text-center',
        z.box, past ? 'border-border bg-surface2/60' : 'border-primary/30 bg-surface', className)}
    >
      <span className={cn('w-full font-bold uppercase tracking-wider', z.month, past ? 'bg-surface2 text-muted' : 'bg-primary text-primary-fg')}>
        {d.toLocaleDateString('en-PH', { month: 'short' })}
      </span>
      <span className={cn('font-bold leading-none tabular-nums', z.day, past ? 'text-muted' : 'text-fg')}>{d.getDate()}</span>
      <span className={cn('font-medium uppercase text-subtle', z.week)}>{d.toLocaleDateString('en-PH', { weekday: 'short' })}</span>
    </div>
  );
}
