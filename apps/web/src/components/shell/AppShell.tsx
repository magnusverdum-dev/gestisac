import { component$, Slot, type PropFunction } from '@builder.io/qwik';
import type { Condominium, DashboardResponse, GlobalSearchResult } from '../../lib/api';
import { PwaInstallPanel } from '../dashboard/PwaInstallPanel';
import { Sidebar } from './Sidebar';
import { Topbar, type ApiStatus } from './Topbar';

type AppShellProps = {
  currentPath: string;
  apiStatus: ApiStatus;
  dashboard: DashboardResponse;
  condominiums: Condominium[];
  searchResults: GlobalSearchResult[];
  navigate$: PropFunction<(path: string) => void>;
  onLogout$: PropFunction<() => void>;
};

export const AppShell = component$((props: AppShellProps) => {
  return (
    <main class="app-shell">
      <div class="ambient ambient-one" />
      <div class="ambient ambient-two" />
      <Sidebar
        currentPath={props.currentPath}
        user={props.dashboard.user}
        navigate$={props.navigate$}
      />
      <section class="main-stage">
        <Topbar
          apiStatus={props.apiStatus}
          activeCondominium={props.dashboard.activeCondominium}
          alertCount={props.dashboard.alerts.length}
          alerts={props.dashboard.alerts}
          condominiums={props.condominiums}
          searchResults={props.searchResults}
          user={props.dashboard.user}
          navigate$={props.navigate$}
          onLogout$={props.onLogout$}
        />
        {props.currentPath !== '/dashboard' ? (
          <PwaInstallPanel compact variant="shell" />
        ) : null}
        <Slot />
      </section>
    </main>
  );
});
