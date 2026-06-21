import { component$, $ } from '@builder.io/qwik';
import { routeLoader$, useLocation } from '@builder.io/qwik-city';
import type { DashboardResponse, ResourceState, ResourceEndpoint } from '../../../lib/api';
import { getDashboard } from '../../../lib/api/auth';
import { getResources } from '../../../lib/api/resources';
import { App } from '../../../app';
import { AppShell } from '../../../components/shell/AppShell';
import { CalendarPage } from '../../../components/pages/CalendarPage';
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

export const useCalendarData = routeLoader$<LoaderReturn>(
  async ({ cookie }): Promise<LoaderReturn> => {
    // Check for auth cookie (future — no cookie set yet in current SPA flow)
    const token = cookie.get('gestisac.sessionToken')?.value;

    if (!token) {
      // No server-side session — the page component will delegate to <App />
      return { authenticated: false, dashboard: null, resources: null };
    }

    try {
      const [resources, dashboard] = await Promise.all([
        getResources(token),
        getDashboard(token),
      ]);
      return { authenticated: true, dashboard, resources };
    } catch {
      // Token expired or invalid — fall through to client-side bootstrap
      return { authenticated: false, dashboard: null, resources: null };
    }
  },
);

export default component$(() => {
  const loaderSignal = useCalendarData();

  // ── No server-side session → delegate to the App SPA ──
  if (!loaderSignal.value.authenticated) {
    return <App />;
  }

  // ── Server-side session active → render directly with server data ──
  const { dashboard, resources } = loaderSignal.value;
  const loc = useLocation();
  const pathParts = loc.url.pathname.split('/');
  const initialType = pathParts.includes('tipo') && pathParts[pathParts.indexOf('tipo') + 1] || '';

  const { navigate$, onLogout$, onSwitchApp$ } = useHqRouteHandlers();

  const onCreate$ = $(async (_resource: ResourceEndpoint, _payload: Record<string, unknown>) => {
    // Future: map through route action / API call
  });

  const onUpdate$ = $(async (_resource: ResourceEndpoint, _id: string, _payload: Record<string, unknown>) => {
    // Future: map through route action / API call
  });

  const onDelete$ = $(async (_resource: ResourceEndpoint, _id: string) => {
    // Future: map through route action / API call
  });

  return (
    <AppShell
      currentPath="/calendario"
      apiStatus="online"
      appContext="hq"
      dashboard={dashboard!}
      searchResults={[]}
      navigate$={navigate$}
      onLogout$={onLogout$}
      onSwitchApp$={onSwitchApp$}
    >
      <CalendarPage
        initialType={initialType}
        resources={resources!}
        isSaving={false}
        navigate$={navigate$}
        onCreate$={onCreate$}
        onUpdate$={onUpdate$}
        onDelete$={onDelete$}
      />
    </AppShell>
  );
});
