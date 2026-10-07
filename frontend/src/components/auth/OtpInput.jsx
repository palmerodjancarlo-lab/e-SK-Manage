import { useRef } from 'react';
import { cn } from '../../lib/utils';

export default function OtpInput({ value = '', onChange, length = 6, autoFocus = true }) {
  const refs = useRef([]);
  const chars = Array.from({ length }, (_, i) => value[i] || '');
  const emit = (arr) => onChange(arr.join('').replace(/\D/g, ''));

  const handleChange = (i, e) => {
    const d = e.target.value.replace(/\D/g, '').slice(-1);
    if (!d) return;
    const arr = [...chars];
    arr[i] = d;
    emit(arr);
    if (i < length - 1) refs.current[i + 1]?.focus();
  };

  const handleKey = (i, e) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const arr = [...chars];
      if (arr[i]) { arr[i] = ''; emit(arr); }
      else if (i > 0) { arr[i - 1] = ''; emit(arr); refs.current[i - 1]?.focus(); }
    } else if (e.key === 'ArrowLeft' && i > 0) {
      refs.current[i - 1]?.focus();
    } else if (e.key === 'ArrowRight' && i < length - 1) {
      refs.current[i + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const txt = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, length);
    if (!txt) return;
    onChange(txt);
    refs.current[Math.min(txt.length, length - 1)]?.focus();
  };

  return (
    <div className="flex justify-center gap-2" onPaste={handlePaste}>
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          inputMode="numeric"
          maxLength={1}
          autoFocus={autoFocus && i === 0}
          value={chars[i]}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKey(i, e)}
          className={cn('h-12 w-11 rounded-xl border border-border bg-surface text-center text-xl font-bold text-fg outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20')}
        />
      ))}
    </div>
  );
}