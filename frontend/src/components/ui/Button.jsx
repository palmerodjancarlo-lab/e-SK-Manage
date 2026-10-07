import { forwardRef } from 'react';
import { cn } from '../../lib/utils';
import Spinner from './Spinner';

const VARIANTS = {
  primary: 'bg-primary text-primary-fg shadow-card hover:brightness-95 active:brightness-90',
  accent: 'bg-accent text-accent-fg shadow-card hover:brightness-95 active:brightness-90',
  ghost: 'bg-surface2 text-fg hover:bg-border',
  outline: 'border border-border bg-surface text-fg hover:bg-surface2',
  danger: 'bg-danger text-danger-fg shadow-card hover:brightness-95 active:brightness-90',
  subtle: 'bg-transparent text-muted hover:bg-surface2 hover:text-fg',
};

const SIZES = {
  sm: 'h-9 px-3 text-xs gap-1.5',
  md: 'h-11 px-4 text-sm gap-2',
  lg: 'h-12 px-5 text-base gap-2',
  icon: 'h-11 w-11 p-0',
};

const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', loading = false, disabled, className, children, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center rounded-xl font-semibold transition select-none',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      {...props}
    >
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  );
});

export default Button;
