// lib/useReveal.js — reveal an element the first time it scrolls into view
import { useEffect, useRef, useState } from 'react';

const supported = () => typeof IntersectionObserver !== 'undefined';

export default function useReveal({ threshold = 0.15, rootMargin = '0px 0px -40px 0px' } = {}) {
  const ref = useRef(null);
  // Without IntersectionObserver, content is simply shown
  const [visible, setVisible] = useState(() => !supported());
  useEffect(() => {
    const el = ref.current;
    if (!el || visible) return undefined;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); io.disconnect(); }
    }, { threshold, rootMargin });
    io.observe(el);
    return () => io.disconnect();
  }, [visible, threshold, rootMargin]);
  return [ref, visible];
}
