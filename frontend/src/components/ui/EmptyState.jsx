import React from 'react';

export default function EmptyState({ icon, title, description, action, style, ...props }) {
  return (
    <div style={{ ...s.wrap, ...style }} {...props}>
      {icon ? <div style={s.icon} aria-hidden="true">{icon}</div> : null}
      {title ? <div style={s.title}>{title}</div> : null}
      {description ? <div style={s.description}>{description}</div> : null}
      {action ? <div style={s.action}>{action}</div> : null}
    </div>
  );
}

const s = {
  wrap: {
    background: 'var(--bg-panel)',
    border: '1px dashed var(--border-color)',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--space-10) var(--space-6)',
    textAlign: 'center',
    color: 'var(--text-muted)',
  },
  icon: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--accent)',
  },
  title: {
    marginTop: 'var(--space-3)',
    marginBottom: 'var(--space-2)',
    color: 'var(--text-main)',
    fontWeight: 700,
    fontSize: 'var(--text-md)',
  },
  description: {
    fontSize: 'var(--text-sm)',
    lineHeight: 'var(--leading-relaxed)',
    maxWidth: '34rem',
    margin: '0 auto',
  },
  action: { marginTop: 'var(--space-5)', display: 'flex', justifyContent: 'center' },
};
