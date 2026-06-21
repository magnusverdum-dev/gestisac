import { component$, $ } from '@builder.io/qwik';
import { routeLoader$ } from '@builder.io/qwik-city';
import type { DashboardResponse } from '../../../lib/api';
import { getDashboard } from '../../../lib/api/auth';
import { App } from '../../../app';
import { AppShell } from '../../../components/shell/AppShell';
import { DashboardPage } from '../../../components/dashboard/DashboardPage';
import { useHqRouteHandlers } from '../use-hq-route-handlers';

/**
 * Loader return type — the serialisable bridge between server and client.
 *
 * `authenticated: true`  → a valid session cookie was found and dashboard
 *                          data was fetched on the server. The page renders
 *                          directly with server-loaded data.
 * `authenticated: false` → no server-side session — the SPA fallback
 *                          (<App />) bootstraps the session client-side.
 */
type LoaderReturn = {
  authenticated: boolean;
  dashboard: DashboardResponse | null;
};

export const useDashboardData = routeLoader$<LoaderReturn>(
  async ({ cookie }): Promise<LoaderReturn> => {
    // Check for auth cookie (future — no cookie set yet in current SPA flow)
    const token = cookie.get('gestisac.sessionToken')?.value;

    if (!token) {
      // No server-side session — the page component will delegate to <App />
      return { authenticated: false, dashboard: null };
    }

    try {
      const dashboard = await getDashboard(token);
      return { authenticated: true, dashboard };
    } catch {
      // Token expired or invalid — fall through to client-side bootstrap
      return { authenticated: false, dashboard: null };
    }
  },
);

export default component$(() => {
  const loaderSignal = useDashboardData();

  // ── No server-side session → delegate to the App SPA ──
  // The App component handles client-side session bootstrap, workspace loading,
  // and renders the dashboard within the SPA as before.
  if (!loaderSignal.value.authenticated) {
    return <App />;
  }

  // ── Server-side session active → render directly with server data ──
  const dashboard = loaderSignal.value.dashboard!;
  const { navigate$, onLogout$, onSwitchApp$ } = useHqRouteHandlers();

  const onQuickAction$ = $((_title: string) => {
    // Future: map actions through route handlers or direct nav
    navigate$('/tickets');
  });

  const onModuleCommand$ = $((_moduleId: string, _command: string) => {
    // Future: map module commands through route handlers or direct nav
    navigate$('/dashboard');
  });

  return (
    <AppShell
      currentPath="/dashboard"
      apiStatus="online"
      appContext="hq"
      dashboard={dashboard}
      searchResults={[]}
      navigate$={navigate$}
      onLogout$={onLogout$}
      onSwitchApp$={onSwitchApp$}
    >
      <DashboardPage
        dashboard={dashboard}
        navigate$={navigate$}
        onQuickAction$={onQuickAction$}
        onModuleCommand$={onModuleCommand$}
      />
    </AppShell>
  );
});
