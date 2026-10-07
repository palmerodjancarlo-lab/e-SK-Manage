import { useState } from 'react';
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
  label, name, value, onChange, error,
  placeholder = '••••••••', autoComplete, showStrength = false,
}) {
  const [show, setShow] = useState(false);
  const level = value ? LEVELS[Math.max(0, scoreOf(value) - 1)] : null;

  return (
    <div>
      {label && <label htmlFor={name} className="mb-1.5 block text-sm font-medium text-fg">{label}</label>}
      <div className="relative">
        <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
        <input
          id={name}
          name={name}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className={cn(
            'w-full rounded-xl border bg-surface px-3 py-2.5 pl-10 pr-10 text-sm text-fg outline-none transition placeholder:text-subtle focus:ring-2 focus:ring-primary/20',
            error ? 'border-danger focus:border-danger' : 'border-border focus:border-primary',
          )}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          tabIndex={-1}
          aria-label={show ? 'Hide password' : 'Show password'}
          className="absolute right-2.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-subtle transition hover:bg-surface2 hover:text-fg"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>

      {error && <p className="mt-1 text-xs text-danger">{error}</p>}

      {showStrength && value && (
        <div className="mt-2">
          <div className="flex gap-1">
            {[0, 1, 2, 3, 4].map((i) => (
              <span
                key={i}
                className={cn('h-1.5 flex-1 rounded-full transition-colors', i < (level?.bars || 0) ? '' : 'bg-surface2')}
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