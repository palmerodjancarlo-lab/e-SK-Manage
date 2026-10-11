import { cn } from '../../lib/utils';

/** One settings section: icon + title + description, then content, then an optional footer row of actions. */
export default function SettingsCard({ icon, title, description, footer, tone = 'default', className, children }) {
  const Icon = icon;
  const danger = tone === 'danger';
  return (
    <section className={cn('overflow-hidden rounded-xl border bg-surface shadow-card', danger ? 'border-danger/30' : 'border-border', className)}>
      <header className="flex items-start gap-3 border-b border-border px-5 py-4 sm:px-6">
        {Icon && (
          <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', danger ? 'bg-danger/10 text-danger' : 'bg-primary/10 text-primary')}>
            <Icon aria-hidden="true" className="h-5 w-5" />
          </span>
        )}
        <div className="min-w-0">
          <h2 className={cn('text-base font-bold', danger ? 'text-danger' : 'text-fg')}>{title}</h2>
          {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
        </div>
      </header>
      <div className="px-5 py-5 sm:px-6">{children}</div>
      {footer && <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-border bg-surface2/40 px-5 py-3 sm:px-6">{footer}</footer>}
    </section>
  );
}
