import { useEffect, useRef, useState } from 'react';

const reduceMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// Splits "₱12,345.50 pts" into prefix / number / suffix so formatted values can count up too
const split = (value) => {
  const m = String(value ?? '').match(/^([^\d-]*)(-?[\d,]*\.?\d+)(.*)$/);
  if (!m) return null;
  const decimals = (m[2].split('.')[1] || '').length;
  return { prefix: m[1], target: Number(m[2].replace(/,/g, '')), decimals, grouped: m[2].includes(','), suffix: m[3] };
};

const format = (n, { decimals, grouped }) => (grouped || Math.abs(n) >= 1000
  ? n.toLocaleString('en-PH', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
  : n.toFixed(decimals));

/** Counts up from 0 to `value` once (numbers or formatted strings like "₱1,250.00"). */
export default function AnimatedNumber({ value, duration = 900 }) {
  const parts = split(value);
  const [shown, setShown] = useState(() => (parts && !reduceMotion() ? 0 : null));
  const raf = useRef(0);
  const target = parts?.target;

  useEffect(() => {
    if (target == null || reduceMotion()) return undefined;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      setShown(target * (1 - (1 - t) ** 3)); // ease-out
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);

  if (!parts || shown == null) return <>{value}</>;
  return (
    <>
      <span aria-hidden="true">{parts.prefix}{format(shown, parts)}{parts.suffix}</span>
      <span className="sr-only">{value}</span>
    </>
  );
}
