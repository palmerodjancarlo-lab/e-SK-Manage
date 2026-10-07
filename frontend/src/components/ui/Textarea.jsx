import { forwardRef, useId } from 'react';
import { cn } from '../../lib/utils';

const Textarea = forwardRef(function Textarea(
  { label, hint, error, className, id, rows = 4, ...props },
  ref
) {
  const autoId = useId();
  const tid = id || autoId;
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={tid} className="label">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={tid}
        rows={rows}
        className={cn(
          'input min-h-[96px] resize-y',
          error && 'border-danger focus:border-danger focus:ring-danger/30',
          className
        )}
        {...props}
      />
      {error ? (
        <p className="mt-1.5 text-xs font-medium text-danger">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-subtle">{hint}</p>
      ) : null}
    </div>
  );
});

export default Textarea;
