import { component$ } from '@builder.io/qwik';
import { routeLoader$ } from '@builder.io/qwik-city';
import type { DashboardResponse, ResourceState } from '../../../lib/api';
import { getDashboard } from '../../../lib/api/auth';
import { getResources } from '../../../lib/api/resources';
import { App } from '../../../app';
import { AppShell } from '../../../components/shell/AppShell';
import { useWorkerRouteHandlers } from '../use-worker-route-handlers';

/**
 * Loader return type — the serialisable bridge between server and client.
 *
 * `authenticated: true`  → a valid session cookie was found, dashboard data
 *                          and resources were fetched on the server. The page
 *                          renders directly with server-loaded data.
 * `authenticated: false` → no server-side session — the SPA fallback
 *                          (<App />) bootstraps the session client-side.
 */
type LoaderReturn = {
  authenticated: boolean;
  dashboard: DashboardResponse | null;
  resources: ResourceState | null;
};

export const useWorkerTarefasData = routeLoader$<LoaderReturn>(
  async ({ cookie }): Promise<LoaderReturn> => {
    // Check for auth cookie (future — no cookie set yet in current SPA flow)
    const token = cookie.get('gestisac.sessionToken')?.value;

    if (!token) {
      // No server-side session — the page component will delegate to <App />
      return { authenticated: false, dashboard: null, resources: null };
    }

    try {
      const [dashboard, resources] = await Promise.all([
        getDashboard(token),
        getResources(token),
      ]);
      return { authenticated: true, dashboard, resources };
    } catch {
      // Token expired or invalid — fall through to client-side bootstrap
      return { authenticated: false, dashboard: null, resources: null };
    }
  },
);

export default component$(() => {
  const loaderSignal = useWorkerTarefasData();

  // ── No server-side session → delegate to the App SPA ──
  if (!loaderSignal.value.authenticated) {
    return <App />;
  }

  // ── Server-side session active → render directly with server data ──
  const { dashboard, resources } = loaderSignal.value;
  const { navigate$, onLogout$, onSwitchApp$ } = useWorkerRouteHandlers();

  return (
    <AppShell
      currentPath="/tarefas"
      apiStatus="online"
      appContext="worker"
      dashboard={dashboard!}
      searchResults={[]}
      navigate$={navigate$}
      onLogout$={onLogout$}
      onSwitchApp$={onSwitchApp$}
    >
      <p>Worker Tarefas</p>
    </AppShell>
  );
});
