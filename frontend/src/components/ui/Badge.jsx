import { cn } from '../../lib/utils';

const VARIANTS = {
  default: 'bg-surface2 text-muted border-border',
  primary: 'bg-primary/12 text-primary border-primary/20',
  accent: 'bg-accent/12 text-accent border-accent/25',
  success: 'bg-success/12 text-success border-success/20',
  warning: 'bg-warning/12 text-warning border-warning/25',
  danger: 'bg-danger/12 text-danger border-danger/20',
  info: 'bg-info/12 text-info border-info/20',
};

export default function Badge({ variant = 'default', className, children, ...props }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold',
        VARIANTS[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
