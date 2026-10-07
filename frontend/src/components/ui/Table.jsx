import { cn } from '../../lib/utils';

export function Table({ className, ...props }) {
  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-border">
      <table className={cn('w-full text-sm', className)} {...props} />
    </div>
  );
}

export function THead({ className, ...props }) {
  return <thead className={cn('bg-surface2', className)} {...props} />;
}

export function TBody({ className, ...props }) {
  return <tbody className={cn('divide-y divide-border', className)} {...props} />;
}

export function TR({ className, ...props }) {
  return <tr className={cn('transition hover:bg-surface2/60', className)} {...props} />;
}

export function TH({ className, ...props }) {
  return (
    <th
      className={cn(
        'whitespace-nowrap px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-muted',
        className
      )}
      {...props}
    />
  );
}

export function TD({ className, ...props }) {
  return <td className={cn('px-4 py-3 align-middle text-fg', className)} {...props} />;
}
