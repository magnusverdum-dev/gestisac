import { component$ } from '@builder.io/qwik';
import { routeLoader$ } from '@builder.io/qwik-city';
import type { DashboardResponse, ResourceState } from '../../../lib/api';
import { getDashboard } from '../../../lib/api/auth';
import { getResources } from '../../../lib/api/resources';
import { App } from '../../../app';
import { AppShell } from '../../../components/shell/AppShell';
import { useClientRouteHandlers } from '../use-client-route-handlers';

type LoaderReturn = {
  authenticated: boolean;
  dashboard: DashboardResponse | null;
  resources: ResourceState | null;
};

export const useClientDashboardData = routeLoader$<LoaderReturn>(
  async ({ cookie }): Promise<LoaderReturn> => {
    const token = cookie.get('gestisac.sessionToken')?.value;
    if (!token) return { authenticated: false, dashboard: null, resources: null };
    try {
      const [dashboard, resources] = await Promise.all([
        getDashboard(token),
        getResources(token),
      ]);
      return { authenticated: true, dashboard, resources };
    } catch {
      return { authenticated: false, dashboard: null, resources: null };
    }
  },
);

export default component$(() => {
  const loaderSignal = useClientDashboardData();
  if (!loaderSignal.value.authenticated) return <App />;
  const { dashboard, resources } = loaderSignal.value;
  const { navigate$, onLogout$, onSwitchApp$ } = useClientRouteHandlers();

  return (
    <AppShell
      currentPath="/dashboard"
      apiStatus="online"
      appContext="client"
      dashboard={dashboard!}
      searchResults={[]}
      navigate$={navigate$}
      onLogout$={onLogout$}
      onSwitchApp$={onSwitchApp$}
    >
      <p>Client Dashboard</p>
    </AppShell>
  );
});
