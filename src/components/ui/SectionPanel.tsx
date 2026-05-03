import type { ReactNode } from 'react';

interface SectionPanelProps {
  title: string;
  eyebrow?: string;
  accent?: 'cyan' | 'amber' | 'mint' | 'violet' | 'red';
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function SectionPanel({ title, eyebrow, accent = 'cyan', children, actions, className = '' }: SectionPanelProps) {
  return (
    <section className={`section-panel section-panel-${accent} ${className}`}>
      <div className="section-panel-header">
        <div>
          {eyebrow ? <div className="section-panel-eyebrow">{eyebrow}</div> : null}
          <h2 className="section-panel-title">{title}</h2>
        </div>
        <div className="section-panel-actions">
          <span className="section-panel-led" />
          {actions}
        </div>
      </div>
      <div className="section-panel-body">{children}</div>
    </section>
  );
}
