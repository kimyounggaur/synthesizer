interface MiniDisplayProps {
  eyebrow?: string;
  value: string;
  detail?: string;
  tone?: 'mint' | 'cyan' | 'amber' | 'red';
  className?: string;
}

export function MiniDisplay({ eyebrow, value, detail, tone = 'mint', className = '' }: MiniDisplayProps) {
  return (
    <div className={`mini-display mini-display-${tone} ${className}`}>
      {eyebrow ? <div className="mini-display-eyebrow">{eyebrow}</div> : null}
      <div className="mini-display-value">{value}</div>
      {detail ? <div className="mini-display-detail">{detail}</div> : null}
    </div>
  );
}
