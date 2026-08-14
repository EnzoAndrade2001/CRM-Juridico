import React from 'react';

export default function PageHeader({ kicker, title, subtitle, actions, compact = false, style, className = '' }) {
  return (
    <header
      className={className}
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: compact ? 'center' : 'flex-start',
        gap: 'var(--space-6)',
        marginBottom: compact ? 'var(--space-8)' : 'var(--space-10)',
        flexWrap: 'wrap',
        ...style,
      }}
    >
      <div style={{ minWidth: 0, flex: '1 1 24rem' }}>
        {kicker ? <p style={s.kicker}>{kicker}</p> : null}
        <h1 style={s.title}>{title}</h1>
        {subtitle ? <p style={s.subtitle}>{subtitle}</p> : null}
      </div>
      {actions ? <div style={s.actions}>{actions}</div> : null}
    </header>
  );
}

const s = {
  kicker: {
    margin: '0 0 var(--space-2)',
    color: 'var(--accent)',
    fontSize: 'var(--text-xs)',
    fontWeight: 700,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
  },
  title: {
    margin: 0,
    color: 'var(--text-main)',
    fontSize: 'clamp(1.5rem, 2vw, var(--text-2xl))',
    fontWeight: 700,
    letterSpacing: '-0.03em',
    fontFamily: 'var(--font-display)',
  },
  subtitle: {
    margin: 'var(--space-2) 0 0',
    color: 'var(--text-muted)',
    fontSize: 'var(--text-sm)',
    lineHeight: 'var(--leading-relaxed)',
    maxWidth: '44rem',
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-3)',
    flexWrap: 'wrap',
  },
};
