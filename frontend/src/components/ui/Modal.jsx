import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

const SIZES = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export default function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm animate-fade-up"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'relative w-full max-h-[92vh] overflow-y-auto rounded-t-2xl bg-surface shadow-pop animate-pop sm:rounded-2xl',
          SIZES[size]
        )}
      >
        {(title || onClose) && (
          <div className="flex items-start justify-between gap-4 border-b border-border p-5 sm:p-6">
            <div>
              {title && <h3 className="text-lg font-bold text-fg">{title}</h3>}
              {description && <p className="mt-1 text-sm text-muted">{description}</p>}
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 text-subtle transition hover:bg-surface2 hover:text-fg"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        )}
        <div className="p-5 sm:p-6">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-3 border-t border-border p-5 sm:p-6">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
