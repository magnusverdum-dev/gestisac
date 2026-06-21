import { component$ } from '@builder.io/qwik';
import { routeLoader$ } from '@builder.io/qwik-city';
import type { DashboardResponse, ResourceState } from '../../../lib/api';
import { getDashboard } from '../../../lib/api/auth';
import { getResources } from '../../../lib/api/resources';
import { App } from '../../../app';
import { AppShell } from '../../../components/shell/AppShell';
import { TeamPage } from '../../../components/pages/TeamPage';
import { useHqRouteHandlers } from '../use-hq-route-handlers';

/**
 * Loader return type — the serialisable bridge between server and client.
 *
 * `authenticated: true`  → a valid session cookie was found and both
 *                          dashboard and resource data were fetched on
 *                          the server. The page renders directly with
 *                          server-loaded data.
 * `authenticated: false` → no server-side session — the SPA fallback
 *                          (<App />) bootstraps the session client-side.
 */
type LoaderReturn = {
  authenticated: boolean;
  resources: ResourceState | null;
  dashboard: DashboardResponse | null;
};

export const useTeamData = routeLoader$<LoaderReturn>(
  async ({ cookie }): Promise<LoaderReturn> => {
    const token = cookie.get('gestisac.sessionToken')?.value;

    if (!token) {
      return { authenticated: false, resources: null, dashboard: null };
    }

    try {
      const [resources, dashboard] = await Promise.all([
        getResources(token),
        getDashboard(token),
      ]);
      return { authenticated: true, resources, dashboard };
    } catch {
      return { authenticated: false, resources: null, dashboard: null };
    }
  },
);

export default component$(() => {
  const loaderSignal = useTeamData();

  // ── No server-side session → delegate to the App SPA ──
  if (!loaderSignal.value.authenticated) {
    return <App />;
  }

  // ── Server-side session active → render directly with server data ──
  const { resources, dashboard } = loaderSignal.value;
  const { navigate$, onLogout$, onSwitchApp$ } = useHqRouteHandlers();

  return (
    <AppShell
      currentPath="/equipa"
      apiStatus="online"
      appContext="hq"
      dashboard={dashboard!}
      searchResults={[]}
      navigate$={navigate$}
      onLogout$={onLogout$}
      onSwitchApp$={onSwitchApp$}
    >
      <TeamPage
        resources={resources!}
        navigate$={navigate$}
      />
    </AppShell>
  );
});
