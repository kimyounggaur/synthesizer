interface LedButtonProps {
  children: string;
  active?: boolean;
  danger?: boolean;
  onClick?: () => void;
  className?: string;
}

export function LedButton({ children, active = false, danger = false, onClick, className = '' }: LedButtonProps) {
  return (
    <button
      className={`led-button ${active ? 'is-active' : ''} ${danger ? 'is-danger' : ''} ${className}`}
      type="button"
      aria-pressed={active}
      onClick={onClick}
    >
      <span className="led-button-light" />
      <span className="led-button-label">{children}</span>
    </button>
  );
}
