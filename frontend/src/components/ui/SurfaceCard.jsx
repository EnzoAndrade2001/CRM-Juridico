import React from 'react';

export default function SurfaceCard({
  children,
  as: Element = 'section',
  variant = 'default',
  padding = 'md',
  interactive = false,
  className = '',
  style,
  ...props
}) {
  return (
    <Element
      className={`ui-surface-card ${className}`.trim()}
      data-interactive={interactive || undefined}
      style={{
        ...s.card,
        ...(variants[variant] || variants.default),
        padding: paddings[padding] || padding,
        ...(interactive ? s.interactive : null),
        ...style,
      }}
      {...props}
    >
      {children}
    </Element>
  );
}

const s = {
  card: {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-md)',
  },
  interactive: {
    cursor: 'pointer',
    transition: 'background-color 0.16s ease, border-color 0.16s ease, box-shadow 0.16s ease',
  },
};

const variants = {
  default: {},
  panel: { background: 'var(--bg-panel)' },
  elevated: { boxShadow: 'var(--shadow-sm)' },
  subtle: { background: 'var(--bg-panel)', borderColor: 'var(--border-light)' },
};

const paddings = {
  none: 0,
  sm: 'var(--space-4)',
  md: 'var(--space-6)',
  lg: 'var(--space-8)',
};
