import { forwardRef, useId } from 'react';
import { cn } from '../../lib/utils';

const Input = forwardRef(function Input(
  { label, hint, error, leftIcon, className, id, ...props },
  ref
) {
  const autoId = useId();
  const inputId = id || autoId;
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="label">
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle">
            {leftIcon}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'input',
            leftIcon && 'pl-10',
            error && 'border-danger focus:border-danger focus:ring-danger/30',
            className
          )}
          {...props}
        />
      </div>
      {error ? (
        <p className="mt-1.5 text-xs font-medium text-danger">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-subtle">{hint}</p>
      ) : null}
    </div>
  );
});

export default Input;
