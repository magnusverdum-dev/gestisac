import { component$, useSignal, useTask$, useVisibleTask$, $ } from '@builder.io/qwik';
import { routeLoader$, useNavigate } from '@builder.io/qwik-city';
import { createResource, deleteResource, updateResource, type DashboardResponse, type ResourceEndpoint, type ResourceState } from '../../../lib/api';
import { getDashboard } from '../../../lib/api/auth';
import { getResources } from '../../../lib/api/resources';
import { App } from '../../../app';
import { AppShell } from '../../../components/shell/AppShell';
import { TicketsPage } from '../../../components/pages/TicketsPage';
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

export const useTicketsData = routeLoader$<LoaderReturn>(
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
  const loaderSignal = useTicketsData();

  // ── No server-side session → delegate to the App SPA ──
  if (!loaderSignal.value.authenticated) {
    return <App />;
  }

  // ── Server-side session active → render directly with server data ──
  const { dashboard, resources } = loaderSignal.value;
  const { navigate$, onLogout$, onSwitchApp$ } = useHqRouteHandlers();
  const nav = useNavigate();

  // ── Refresh handler (Qwik City re-run loader) ──
  const onRefresh$ = $(async () => {
    await nav('.', { forceReload: true });
  });

  // ── Local state for TicketsPage props ──
  const isSavingSignal = useSignal(false);
  const createIntentVersionSignal = useSignal(0);
  const tokenSignal = useSignal('');

  // ── Token recovery ──
  // useTask$: runs during SSR and on first client render (before hydration completes).
  useTask$(async () => {
    try {
      const stored =
        sessionStorage.getItem('gestisac.sessionToken') ||
        localStorage.getItem('gestisac.sessionToken') ||
        '';
      tokenSignal.value = stored;
    } catch {
      tokenSignal.value = '';
    }
  });

  // useVisibleTask$: safety net for client-only renders where useTask$
  // may have run before sessionStorage was available (SSR path without
  // a cookie).
  useVisibleTask$(() => {
    try {
      const stored =
        sessionStorage.getItem('gestisac.sessionToken') ||
        localStorage.getItem('gestisac.sessionToken') ||
        '';
      if (stored) tokenSignal.value = stored;
    } catch {
      // storage not available — token remains empty
    }
  });

  // ── CRUD handlers ──
  // These use the generic createResource / updateResource / deleteResource
  // from lib/api/pagination, which build the URL from the ResourceEndpoint
  // value (e.g. "ocorrencias" → /api/ocorrencias).
  const onCreate$ = $(async (resource: ResourceEndpoint, payload: Record<string, unknown>) => {
    if (!tokenSignal.value) {
      throw new Error('Sessão não autenticada — token em falta');
    }
    isSavingSignal.value = true;
    try {
      await createResource(tokenSignal.value, resource, payload);
    } finally {
      isSavingSignal.value = false;
    }
  });

  const onUpdate$ = $(async (resource: ResourceEndpoint, id: string, payload: Record<string, unknown>) => {
    if (!tokenSignal.value) {
      throw new Error('Sessão não autenticada — token em falta');
    }
    isSavingSignal.value = true;
    try {
      await updateResource(tokenSignal.value, resource, id, payload);
    } finally {
      isSavingSignal.value = false;
    }
  });

  const onDelete$ = $(async (resource: ResourceEndpoint, id: string) => {
    if (!tokenSignal.value) {
      throw new Error('Sessão não autenticada — token em falta');
    }
    await deleteResource(tokenSignal.value, resource, id);
  });

  return (
    <AppShell
      currentPath="/tickets"
      apiStatus="online"
      appContext="hq"
      dashboard={dashboard!}
      searchResults={[]}
      navigate$={navigate$}
      onLogout$={onLogout$}
      onSwitchApp$={onSwitchApp$}
    >
      <TicketsPage
        appContext="hq"
        resources={resources!}
        isSaving={isSavingSignal.value}
        token={tokenSignal.value}
        createIntentVersion={createIntentVersionSignal.value}
        navigate$={navigate$}
        onCreate$={onCreate$}
        onUpdate$={onUpdate$}
        onDelete$={onDelete$}
        onRefresh$={onRefresh$}
      />
    </AppShell>
  );
});
