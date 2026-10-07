import { forwardRef, useId } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

const Select = forwardRef(function Select(
  { label, hint, error, className, id, children, ...props },
  ref
) {
  const autoId = useId();
  const selectId = id || autoId;
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={selectId} className="label">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          className={cn(
            'input cursor-pointer appearance-none pr-10',
            error && 'border-danger focus:border-danger focus:ring-danger/30',
            className
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-subtle" />
      </div>
      {error ? (
        <p className="mt-1.5 text-xs font-medium text-danger">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-subtle">{hint}</p>
      ) : null}
    </div>
  );
});

export default Select;
