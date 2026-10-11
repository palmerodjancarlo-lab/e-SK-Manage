import { useId, useState } from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { cn } from '../../lib/utils';

const RULES = [
  (v) => v.length >= 6,
  (v) => v.length >= 10,
  (v) => /[A-Z]/.test(v) && /[a-z]/.test(v),
  (v) => /\d/.test(v),
  (v) => /[^A-Za-z0-9]/.test(v),
];
const LEVELS = [
  { label: 'Too short', color: '#ef4444', bars: 1 },
  { label: 'Weak',      color: '#f59e0b', bars: 2 },
  { label: 'Fair',      color: '#eab308', bars: 3 },
  { label: 'Good',      color: '#22c55e', bars: 4 },
  { label: 'Strong',    color: '#16a34a', bars: 5 },
];
const scoreOf = (v) => (v ? RULES.reduce((n, r) => n + (r(v) ? 1 : 0), 0) : 0);

export default function PasswordField({
  label, name, value, onChange, error, hint, labelAction,
  placeholder = 'Enter password', autoComplete, showStrength = false, ...props
}) {
  const [show, setShow] = useState(false);
  const autoId = useId();
  const id = props.id || `${name}-${autoId}`;
  const msgId = `${id}-msg`;
  const level = value ? LEVELS[Math.max(0, scoreOf(value) - 1)] : null;

  return (
    <div className="w-full">
      {(label || labelAction) && (
        <div className="mb-1.5 flex items-center justify-between gap-3">
          {label && <label htmlFor={id} className="text-sm font-medium text-muted">{label}</label>}
          {labelAction}
        </div>
      )}
      <div className="relative">
        <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
        <input
          {...props}
          id={id}
          name={name}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? msgId : undefined}
          className={cn('input pl-10 pr-11', error && 'border-danger focus:border-danger focus:ring-danger/30')}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? 'Hide password' : 'Show password'}
          aria-pressed={show}
          className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-subtle transition hover:bg-surface2 hover:text-fg"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>

      {error ? (
        <p id={msgId} className="mt-1.5 text-xs font-medium text-danger">{error}</p>
      ) : hint ? (
        <p id={msgId} className="mt-1.5 text-xs text-subtle">{hint}</p>
      ) : null}

      {showStrength && value && (
        <div className="mt-2" aria-live="polite">
          <div className="flex gap-1">
            {[0, 1, 2, 3, 4].map((i) => (
              <span
                key={i}
                className={cn('h-1 flex-1 rounded-full transition-colors', i < (level?.bars || 0) ? '' : 'bg-surface2')}
                style={i < (level?.bars || 0) ? { background: level.color } : undefined}
              />
            ))}
          </div>
          <p className="mt-1 text-[11px] font-semibold" style={{ color: level?.color }}>{level?.label} password</p>
        </div>
      )}
    </div>
  );
}
