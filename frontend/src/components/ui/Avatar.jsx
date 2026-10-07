import { useState } from 'react';
import { cn } from '../../lib/utils';

const SIZES = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-lg',
};

function initials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function Avatar({ src, name, size = 'md', className }) {
  const [broken, setBroken] = useState(false);
  const showImg = src && !broken;
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/15 font-bold text-primary ring-2 ring-surface',
        SIZES[size],
        className
      )}
    >
      {showImg ? (
        <img
          src={src}
          alt={name || 'avatar'}
          className="h-full w-full object-cover"
          onError={() => setBroken(true)}
        />
      ) : (
        initials(name)
      )}
    </span>
  );
}
