import { cn } from '../../lib/utils';

const TONES = {
  default: 'text-muted hover:bg-surface2 hover:text-fg',
  danger: 'text-muted hover:bg-danger/10 hover:text-danger',
  success: 'text-muted hover:bg-success/10 hover:text-success',
  primary: 'text-muted hover:bg-primary/10 hover:text-primary',
};

/** Icon-only button with a real accessible name (`label`) and tooltip. */
export default function IconButton({ icon, label, tone = 'default', className, ...props }) {
  const Icon = icon;
  return (
    <button type="button" aria-label={label} title={label}
      className={cn('inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors disabled:opacity-40', TONES[tone], className)}
      {...props}>
      <Icon aria-hidden="true" className="h-4 w-4" />
    </button>
  );
}
