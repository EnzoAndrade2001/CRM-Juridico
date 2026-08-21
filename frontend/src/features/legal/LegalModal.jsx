import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export default function LegalModal({ title, subtitle, children, onClose, wide = false }) {
  const dialogRef = useRef(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const dialog = dialogRef.current;
    const firstControl = dialog?.querySelector(FOCUSABLE);
    (firstControl || dialog)?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement && document.contains(previousFocus)) previousFocus.focus();
    };
  }, []);

  function handleKeyDown(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }

    if (event.key !== 'Tab') return;
    const controls = [...(dialogRef.current?.querySelectorAll(FOCUSABLE) || [])];
    if (!controls.length) {
      event.preventDefault();
      dialogRef.current?.focus();
      return;
    }
    const first = controls[0];
    const last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <div className="jd-modal-layer" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section
        ref={dialogRef}
        className={`jd-modal ${wide ? 'jd-modal--wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={subtitle ? descriptionId : undefined}
        tabIndex="-1"
        onKeyDown={handleKeyDown}
      >
        <header>
          <div><h3 id={titleId}>{title}</h3>{subtitle && <p id={descriptionId}>{subtitle}</p>}</div>
          <button type="button" onClick={onClose} aria-label={`Fechar ${title}`}><X size={19} /></button>
        </header>
        {children}
      </section>
    </div>
  );
}
