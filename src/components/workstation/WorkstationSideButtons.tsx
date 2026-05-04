import type { ReactNode } from 'react';

interface WorkstationSideButtonsProps {
  ariaLabel: string;
  children: ReactNode;
  role?: 'navigation' | 'tablist';
}

export function WorkstationSideButtons({ ariaLabel, children, role = 'navigation' }: WorkstationSideButtonsProps) {
  return (
    <nav className="workstation-side-buttons workstation-page-tabs" role={role} aria-label={ariaLabel}>
      <span className="workstation-side-title">Mode Select</span>
      {children}
    </nav>
  );
}
