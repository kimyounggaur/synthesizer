export type WorkstationStatus = 'READY' | 'LOADING SAMPLE' | 'FALLBACK SAMPLE' | 'CLIPPING' | 'AUDIO SUSPENDED';

const softKeys = [
  { id: 'F1', label: 'Bank' },
  { id: 'F2', label: 'Category' },
  { id: 'F3', label: 'Edit' },
  { id: 'F4', label: 'FX' },
  { id: 'F5', label: 'Save' },
  { id: 'F6', label: 'Utility' },
] as const;

export type WorkstationSoftKeyId = (typeof softKeys)[number]['id'];

interface WorkstationBreadcrumbProps {
  items: Array<string | null | undefined>;
}

interface WorkstationSoftKeysProps {
  enabledKeys?: WorkstationSoftKeyId[];
}

interface WorkstationStatusBarProps {
  message: string;
  status?: WorkstationStatus;
}

interface WorkstationPageTabsProps {
  labels: string[];
  ariaLabel: string;
  variant?: 'tabs' | 'subtabs';
}

function statusClassName(status: WorkstationStatus): string {
  return `workstation-status-${status.toLowerCase().replace(/\s+/g, '-')}`;
}

export function WorkstationBreadcrumb({ items }: WorkstationBreadcrumbProps) {
  const visibleItems = items.filter((item): item is string => Boolean(item));

  return (
    <div className="workstation-breadcrumb" aria-label="LCD location">
      {visibleItems.map((item, index) => (
        <span key={`${item}-${index}`}>{item}</span>
      ))}
    </div>
  );
}

export function WorkstationSoftKeys({ enabledKeys = [] }: WorkstationSoftKeysProps) {
  return (
    <div className="workstation-soft-keys" aria-label="LCD soft keys">
      {softKeys.map((key) => {
        const enabled = enabledKeys.includes(key.id);
        return (
          <button key={key.id} type="button" className={enabled ? 'workstation-soft-key is-active' : 'workstation-soft-key'} disabled={!enabled}>
            <strong>{key.id}</strong>
            <span>{key.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function WorkstationPageTabs({ labels, ariaLabel, variant = 'subtabs' }: WorkstationPageTabsProps) {
  const className = variant === 'tabs' ? 'workstation-tabs' : 'workstation-subtabs';
  const tabClassName = variant === 'tabs' ? 'workstation-tab' : 'workstation-subtab';

  return (
    <nav className={className} role="tablist" aria-label={ariaLabel}>
      {labels.map((label, index) => {
        const active = index === 0;
        return (
          <button key={label} type="button" role="tab" aria-selected={active} tabIndex={active ? 0 : -1} className={active ? `${tabClassName} is-active` : tabClassName}>
            {label}
          </button>
        );
      })}
    </nav>
  );
}

export function WorkstationStatusBar({ message, status = 'READY' }: WorkstationStatusBarProps) {
  return (
    <footer className={`workstation-status-bar ${statusClassName(status)}`}>
      <span>{message}</span>
      <strong className="workstation-status-code">{status}</strong>
    </footer>
  );
}
