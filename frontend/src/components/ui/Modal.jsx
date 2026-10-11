import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

// Open dialogs, newest last — only the top one reacts to Escape / Tab, so a form
// opened on top of another dialog doesn't close or steal focus from both.
const stack = [];

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
  const titleId = useId();
  const descId = useId();
  const panelRef = useRef(null);
  // Latest onClose without re-running the open/close effect (callers pass inline functions)
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; });

  useEffect(() => {
    if (!open) return undefined;
    const returnTo = document.activeElement;
    const panel = panelRef.current;
    stack.push(panel);

    const onKey = (e) => {
      if (stack[stack.length - 1] !== panel) return; // a dialog above this one handles it
      if (e.key === 'Escape') { closeRef.current?.(); return; }
      if (e.key !== 'Tab' || !panel) return;
      // Keep keyboard focus inside the dialog
      const focusable = panel.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])');
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === panel)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panel?.focus(); // move focus into the dialog without popping a phone keyboard

    return () => {
      document.removeEventListener('keydown', onKey);
      stack.splice(stack.indexOf(panel), 1);
      document.body.style.overflow = prev;
      if (returnTo instanceof HTMLElement) returnTo.focus();
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div
        className="absolute inset-0 bg-slate-950/50 animate-fade-up"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={cn(
          'relative w-full max-h-[92dvh] overflow-y-auto rounded-t-2xl bg-surface shadow-pop animate-pop focus:outline-none sm:rounded-2xl',
          SIZES[size]
        )}
      >
        {(title || onClose) && (
          <div className="flex items-start justify-between gap-4 border-b border-border p-5 sm:p-6">
            <div>
              {title && <h2 id={titleId} className="text-lg font-bold text-fg">{title}</h2>}
              {description && <p id={descId} className="mt-1 text-sm text-muted">{description}</p>}
            </div>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="-mr-1.5 -mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-subtle transition-colors hover:bg-surface2 hover:text-fg"
                aria-label="Close dialog"
              >
                <X aria-hidden="true" className="h-5 w-5" />
              </button>
            )}
          </div>
        )}
        <div className="p-5 sm:p-6">{children}</div>
        {footer && (
          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border p-5 sm:p-6">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
