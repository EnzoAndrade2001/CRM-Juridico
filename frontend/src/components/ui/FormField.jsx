import React, { useId } from 'react';

export default function FormField({
  label,
  hint,
  error,
  required = false,
  children,
  id,
  style,
}) {
  const generatedId = useId();
  const fieldId = id || generatedId;
  const hintId = hint ? `${fieldId}-hint` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;
  const control = React.isValidElement(children)
    ? React.cloneElement(children, {
      id: children.props.id || fieldId,
      'aria-describedby': [children.props['aria-describedby'], hintId, errorId].filter(Boolean).join(' ') || undefined,
      'aria-invalid': error ? true : children.props['aria-invalid'],
      required: children.props.required ?? required,
      style: { ...s.control, ...children.props.style },
    })
    : children;

  return (
    <div style={{ ...s.field, ...style }}>
      {label ? (
        <label htmlFor={fieldId} style={s.label}>
          {label}
          {required ? <span style={s.required} aria-hidden="true">*</span> : null}
        </label>
      ) : null}
      {control}
      {error ? <div id={errorId} style={s.error}>{error}</div> : null}
      {!error && hint ? <div id={hintId} style={s.hint}>{hint}</div> : null}
    </div>
  );
}

const s = {
  field: { display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' },
  label: { color: 'var(--text-muted)', fontSize: 'var(--text-xs)', fontWeight: 600 },
  required: { color: 'var(--danger-text)', marginLeft: 'var(--space-1)' },
  control: {
    width: '100%',
    minHeight: '44px',
    padding: '0.75rem 0.9rem',
    color: 'var(--text-main)',
    background: 'var(--bg-panel)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-sm)',
    fontSize: 'var(--text-sm)',
    outline: 'none',
    transition: 'border-color 0.16s ease, box-shadow 0.16s ease, background-color 0.16s ease',
  },
  hint: { color: 'var(--text-dim)', fontSize: 'var(--text-xs)', lineHeight: 'var(--leading-normal)' },
  error: { color: 'var(--danger-text)', fontSize: 'var(--text-xs)', lineHeight: 'var(--leading-normal)' },
};
