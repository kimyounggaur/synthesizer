import type { ReactNode } from 'react';
import type { WorkstationPageId } from '../../store/uiStore';
import { workstationPagePanelId, workstationPageTabId } from './workstationPages';

interface WorkstationLcdProps {
  activePageId: WorkstationPageId;
  children: ReactNode;
}

export function WorkstationLcd({ activePageId, children }: WorkstationLcdProps) {
  return (
    <section
      id={workstationPagePanelId(activePageId)}
      className="workstation-lcd-frame workstation-page-container"
      role="tabpanel"
      aria-labelledby={workstationPageTabId(activePageId)}
      tabIndex={0}
    >
      {children}
    </section>
  );
}
