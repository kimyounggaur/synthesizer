import type { ReactNode } from 'react';

interface WorkstationShellProps {
  topBar: ReactNode;
  tabs: ReactNode;
  lcd: ReactNode;
  parameterRack: ReactNode;
  performanceStrip: ReactNode;
  keybed: ReactNode;
  engineError?: string | null;
}

export function WorkstationShell({ topBar, tabs, lcd, parameterRack, performanceStrip, keybed, engineError }: WorkstationShellProps) {
  return (
    <main className="synth-workbench workstation-page min-h-screen p-2 text-slate-100 md:p-3">
      <div className="hardware-shell workstation-shell flex w-full max-w-none flex-col gap-4 p-3 md:p-4">
        {topBar}

        {engineError ? (
          <div className="panel border-amber-400/40 p-4 text-sm text-amber-100" role="alert">
            {engineError}
          </div>
        ) : (
          <>
            <section className="workstation-main-deck workstation-workspace-grid" aria-label="Workstation edit area">
              {tabs}
              {lcd}
              {parameterRack}
            </section>
            {performanceStrip}
            <div className="workstation-keybed-frame">{keybed}</div>
          </>
        )}
      </div>
    </main>
  );
}
