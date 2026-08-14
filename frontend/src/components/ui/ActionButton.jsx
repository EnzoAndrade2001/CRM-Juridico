import React from 'react';

export default function ActionButton({
  children,
  type = 'button',
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  className = '',
  style,
  disabled,
  ...props
}) {
  const variantStyle = variants[variant] || variants.primary;
  const sizeStyle = sizes[size] || sizes.md;
  return (
    <button
      type={type}
      className={`ui-action-button ${className}`.trim()}
      style={{ ...base, ...sizeStyle, ...variantStyle, width: fullWidth ? '100%' : undefined, ...style }}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <span className="ui-spinner" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}

const base = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 'var(--space-2)',
  borderRadius: 'var(--radius-sm)',
  cursor: 'pointer',
  fontWeight: 700,
  lineHeight: 1.2,
  whiteSpace: 'nowrap',
  transition: 'transform 0.16s ease, filter 0.16s ease, background-color 0.16s ease, border-color 0.16s ease',
};

const sizes = {
  sm: { minHeight: '36px', padding: '0.55rem 0.8rem', fontSize: 'var(--text-xs)' },
  md: { minHeight: '44px', padding: '0.75rem 1rem', fontSize: 'var(--text-sm)' },
  lg: { minHeight: '50px', padding: '0.9rem 1.25rem', fontSize: 'var(--text-md)' },
};

const variants = {
  primary: {
    background: 'var(--brand-solid)',
    color: 'var(--brand-on-solid)',
    border: '1px solid var(--brand-solid)',
    boxShadow: 'var(--shadow-xs)',
  },
  secondary: {
    background: 'transparent',
    color: 'var(--text-muted)',
    border: '1px solid var(--border-color)',
  },
  subtle: {
    background: 'var(--bg-panel)',
    color: 'var(--text-muted)',
    border: '1px solid var(--border-color)',
  },
  danger: {
    background: 'var(--danger-light)',
    color: 'var(--danger-text)',
    border: '1px solid var(--danger-border)',
  },
};
