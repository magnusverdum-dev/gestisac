import { component$ } from '@builder.io/qwik';
import { routeLoader$ } from '@builder.io/qwik-city';
import type { DashboardResponse, ResourceState } from '../../../lib/api';
import { getDashboard } from '../../../lib/api/auth';
import { getResources } from '../../../lib/api/resources';
import { App } from '../../../app';
import { AppShell } from '../../../components/shell/AppShell';
import { TasksPage } from '../../../components/pages/TasksPage';
import { useHqRouteHandlers } from '../use-hq-route-handlers';

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

export const useTasksData = routeLoader$<LoaderReturn>(
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
  const loaderSignal = useTasksData();

  // ── No server-side session → delegate to the App SPA ──
  if (!loaderSignal.value.authenticated) {
    return <App />;
  }

  // ── Server-side session active → render directly with server data ──
  const { dashboard, resources } = loaderSignal.value;
  const { navigate$, onLogout$, onSwitchApp$ } = useHqRouteHandlers();

  return (
    <AppShell
      currentPath="/tarefas"
      apiStatus="online"
      appContext="hq"
      dashboard={dashboard!}
      searchResults={[]}
      navigate$={navigate$}
      onLogout$={onLogout$}
      onSwitchApp$={onSwitchApp$}
    >
      <TasksPage
        appContext="hq"
        currentUser={dashboard!.user}
        resources={resources!}
        navigate$={navigate$}
      />
    </AppShell>
  );
});
