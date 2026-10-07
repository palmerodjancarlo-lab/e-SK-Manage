import { cn } from '../../lib/utils';

export default function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface2/50 px-6 py-14 text-center',
        className
      )}
    >
      {Icon && (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface text-subtle shadow-card">
          <Icon className="h-7 w-7" />
        </div>
      )}
      <h3 className="text-base font-bold text-fg">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
