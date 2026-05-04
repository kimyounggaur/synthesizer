interface LedButtonProps {
  children: string;
  active?: boolean;
  danger?: boolean;
  onClick?: () => void;
  className?: string;
  ariaLabel?: string;
}

export function LedButton({ children, active = false, danger = false, onClick, className = '', ariaLabel }: LedButtonProps) {
  return (
    <button
      className={`led-button ${active ? 'is-active' : ''} ${danger ? 'is-danger' : ''} ${className}`}
      type="button"
      aria-label={ariaLabel}
      aria-pressed={active}
      onClick={onClick}
    >
      <span className="led-button-light" />
      <span className="led-button-label">{children}</span>
    </button>
  );
}
