import { component$, Slot, type PropFunction } from '@builder.io/qwik';
import type { AppContext, DashboardResponse, GlobalSearchResult } from '../../lib/api';
import { Sidebar } from './Sidebar';
import { Topbar, type ApiStatus } from './Topbar';

type AppShellProps = {
  currentPath: string;
  apiStatus: ApiStatus;
  appContext: AppContext;
  dashboard: DashboardResponse;
  searchResults: GlobalSearchResult[];
  navigate$: PropFunction<(path: string) => void>;
  onLogout$: PropFunction<() => void>;
  onSwitchApp$: PropFunction<() => void>;
};

export const AppShell = component$((props: AppShellProps) => {
  return (
    <main class="app-shell">
      <div class="ambient ambient-one" />
      <div class="ambient ambient-two" />
      <Sidebar
        currentPath={props.currentPath}
        user={props.dashboard.user}
        appContext={props.appContext}
        navigate$={props.navigate$}
        onSwitchApp$={props.onSwitchApp$}
      />
      <section class="main-stage">
        <Topbar
          apiStatus={props.apiStatus}
          appContext={props.appContext}
          alertCount={props.dashboard.alerts.length}
          alerts={props.dashboard.alerts}
          searchResults={props.searchResults}
          user={props.dashboard.user}
          navigate$={props.navigate$}
          onSwitchApp$={props.onSwitchApp$}
          onLogout$={props.onLogout$}
        />
        <Slot />
      </section>
    </main>
  );
});
