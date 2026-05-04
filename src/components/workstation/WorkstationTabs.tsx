import { useUiStore } from '../../store/uiStore';
import { WorkstationSideButtons } from './WorkstationSideButtons';
import { workstationPagePanelId, workstationPages, workstationPageTabId } from './workstationPages';

export function WorkstationTabs() {
  const activePage = useUiStore((state) => state.activeWorkstationPage);
  const setActivePage = useUiStore((state) => state.setActiveWorkstationPage);

  return (
    <WorkstationSideButtons role="tablist" ariaLabel="Workstation pages">
      {workstationPages.map((page) => {
        const active = page.id === activePage;
        return (
          <button
            key={page.id}
            id={workstationPageTabId(page.id)}
            type="button"
            role="tab"
            aria-selected={active}
            aria-controls={workstationPagePanelId(page.id)}
            className={active ? 'workstation-side-button is-active' : 'workstation-side-button'}
            onClick={() => setActivePage(page.id)}
          >
            <span>{page.label}</span>
            <strong>{page.detail}</strong>
          </button>
        );
      })}
    </WorkstationSideButtons>
  );
}
