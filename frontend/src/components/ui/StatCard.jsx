import { cn } from '../../lib/utils';

const TONES = {
  primary: 'bg-primary/12 text-primary',
  accent: 'bg-accent/12 text-accent',
  success: 'bg-success/12 text-success',
  warning: 'bg-warning/12 text-warning',
  danger: 'bg-danger/12 text-danger',
  info: 'bg-info/12 text-info',
};

export default function StatCard({ label, value, icon: Icon, tone = 'primary', hint, className }) {
  return (
    <div className={cn('card p-5', className)}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-muted">{label}</p>
        {Icon && (
          <span className={cn('flex h-9 w-9 items-center justify-center rounded-xl', TONES[tone])}>
            <Icon className="h-5 w-5" />
          </span>
        )}
      </div>
      <p className="mt-3 text-2xl font-bold text-fg">{value}</p>
      {hint && <p className="mt-1 text-xs text-subtle">{hint}</p>}
    </div>
  );
}
