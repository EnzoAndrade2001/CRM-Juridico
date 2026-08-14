import React from 'react';

export default function StatusBadge({ children, tone = 'neutral', dot = false, style, ...props }) {
  const colors = tones[tone] || tones.neutral;
  return (
    <span style={{ ...s.badge, ...colors, ...style }} {...props}>
      {dot ? <span style={{ ...s.dot, background: colors.color }} aria-hidden="true" /> : null}
      {children}
    </span>
  );
}

const s = {
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    minHeight: '26px',
    padding: '0.25rem 0.6rem',
    borderRadius: 'var(--radius-pill)',
    border: '1px solid',
    fontSize: 'var(--text-xs)',
    fontWeight: 600,
    lineHeight: 1.2,
  },
  dot: { width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0 },
};

const tones = {
  neutral: { color: 'var(--text-muted)', background: 'var(--bg-panel)', borderColor: 'var(--border-color)' },
  brand: { color: 'var(--accent)', background: 'var(--accent-light)', borderColor: 'var(--accent-border)' },
  success: { color: 'var(--success-text)', background: 'var(--success-light)', borderColor: 'var(--success-border)' },
  warning: { color: 'var(--warning-text)', background: 'var(--warning-light)', borderColor: 'var(--warning-border)' },
  danger: { color: 'var(--danger-text)', background: 'var(--danger-light)', borderColor: 'var(--danger-border)' },
  info: { color: 'var(--info-text)', background: 'var(--info-light)', borderColor: 'var(--info-border)' },
};
