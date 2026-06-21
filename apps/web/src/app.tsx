import { component$, noSerialize, useTask$, useVisibleTask$ } from '@builder.io/qwik';
import { useLocation } from '@builder.io/qwik-city';
import { AppEntryPage } from './components/auth/AppEntryPage';
import { LoginPage } from './components/auth/LoginPage';
import { AppShell } from './components/shell/AppShell';
import { matchEntityRoute } from './lib/entity-navigation';
import { getPageByPath } from './data/pages';
import { installBrowserPerformanceTelemetry } from './lib/performance-telemetry';
import {
  createSessionStore,
  type SessionStore,
  fallbackDashboard,
  emptyResources
} from './lib/session/session-store';
import {
  createSessionService,
  normalizeInnerPath,
  parseRouteContext,
  buildAppPath,
  readSessionValue,
  readStoredValue,
  hasExplicitAppContext,
  type SessionService
} from './lib/session/session-service';
import type { CondoAreaId } from './components/pages/CondominiumsPage';
import type { AppContext } from './lib/api';

export const App = component$(() => {
  const location = useLocation();

  // ── 1. Create session state (signals + stores) ──
  const initialRoute = parseRouteContext(
    `${location.url.pathname}${location.url.search}${location.url.hash}`
  );

  // We use createSessionStore inside the component to register Qwik reactivity
  const store = createSessionStore(initialRoute);

  // ── 2. Create session service (actions + computed) ──
  const svc: SessionService = createSessionService(store);

  // ── 3. Page loading task — responds to currentPath changes ──
  useTask$(async ({ track, cleanup }) => {
    const canRenderWorkspace = track(() => store.session.ready && Boolean(store.session.token));
    const trackedPath = track(() => store.currentPath.value);
    track(() => store.appContext.value);
    track(() => store.pageCache.value);

    if (!canRenderWorkspace) {
      store.pageState.key = 'page-overview';
      store.pageState.component = undefined;
      store.pageState.loading = false;
      store.pageState.error = '';
      return;
    }

    const safeTrackedPath = trackedPath === '/login' ? '/dashboard' : trackedPath;
    const trackedRoute = matchEntityRoute(safeTrackedPath);
    const { resolvePageLoaderKey } = await import('./lib/lazy-pages');
    const trackedPage = getPageByPath(store.pageCache.value, trackedRoute.basePath);
    const loaderKey = resolvePageLoaderKey(trackedPage.path, trackedRoute.kind);

    if (store.pageState.key === loaderKey && store.pageState.component) {
      store.pageState.loading = false;
      store.pageState.error = '';
      return;
    }

    let cancelled = false;
    cleanup(() => {
      cancelled = true;
    });

    store.pageState.key = loaderKey;
    store.pageState.loading = true;
    store.pageState.error = '';

    try {
      const { loadPageComponent } = await import('./lib/lazy-pages');
      const component = await loadPageComponent(loaderKey);
      if (cancelled) return;
      store.pageState.component = noSerialize(component);
    } catch (err) {
      if (cancelled) return;
      store.pageState.component = undefined;
      store.pageState.error = err instanceof Error ? err.message : 'Nao foi possivel carregar a pagina';
    } finally {
      if (!cancelled) {
        store.pageState.loading = false;
      }
    }
  });

  // ── 4. Browser session bootstrap — runs once on mount ──
  useVisibleTask$(({ cleanup }) => {
    const stopPerfTelemetry = installBrowserPerformanceTelemetry();

    const syncPath = () => {
      const rawPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      const route = parseRouteContext(rawPath);
      store.showEntry.value = route.showEntry;
      store.appContext.value = route.appContext;
      if (store.session.token && route.path === '/login') {
        store.currentPath.value = '/dashboard';
        window.history.replaceState({}, '', buildAppPath(route.appContext, '/dashboard'));
        return;
      }
      store.currentPath.value = route.path;
      store.condominiumShortcutArea.value =
        route.path === '/condominios'
          ? readCondominiumShortcutArea(rawPath)
          : '';
    };

    syncPath();
    window.addEventListener('popstate', syncPath);
    cleanup(() => {
      stopPerfTelemetry();
      window.removeEventListener('popstate', syncPath);
    });
  });

  // ── 5. Auto-retry browser session ──
  useVisibleTask$(({ cleanup }) => {
    const retryId = window.setInterval(() => {
      if (
        svc.browserSessionLoginlessEnabled &&
        store.autoBrowserSessionPending.value &&
        !store.isLoading.value &&
        store.currentPath.value === '/login' &&
        readSessionValue(svc.DEV_AUTO_LOGIN_SUPPRESS_KEY) !== '1'
      ) {
        void svc.openBrowserSession$();
      }
    }, 4_000);

    cleanup(() => window.clearInterval(retryId));
  });

  // ── 6. Initial session bootstrap — runs once on mount ──
  useVisibleTask$(async () => {
    await svc.initBrowserSession$();
  });

  // ── 7. Compute derived values for rendering ──
  const safePath = store.currentPath.value === '/login' ? '/dashboard' : store.currentPath.value;
  const route = matchEntityRoute(safePath);
  const page = getPageByPath(store.pageCache.value, route.basePath);
  const currentPageKey = (() => {
    // Simple inline resolve to avoid extra import
    if (route.kind === 'detail') return 'entity-detail' as const;
    const map: Record<string, 'dashboard' | 'team' | 'tasks' | 'condominiums' | 'accounting' | 'calendar' | 'tickets' | 'maintenance' | 'inspections' | 'documents' | 'chat' | 'page-overview'> = {
      '/dashboard': 'dashboard',
      '/equipa': 'team',
      '/tarefas': 'tasks',
      '/condominios': 'condominiums',
      '/contabilidade': 'accounting',
      '/calendario': 'calendar',
      '/tickets': 'tickets',
      '/manutencao': 'maintenance',
      '/vistorias': 'inspections',
      '/documentos': 'documents',
      '/chat': 'chat',
    };
    return map[page.path] ?? 'page-overview';
  })();
  const WorkspacePage = store.pageState.key === currentPageKey ? store.pageState.component : undefined;
  const currentPageLoadError = store.pageState.key === currentPageKey ? store.pageState.error : '';
  const renderWorkspacePage = (props: Record<string, unknown>) =>
    WorkspacePage ? <WorkspacePage {...props} /> : <div class="glass-panel">A carregar secao...</div>;
  const isWorkerContext = store.appContext.value === 'worker';
  const isClientContext = store.appContext.value === 'client';

  // ── 8. Render ──
  if (store.showEntry.value) {
    return (
      <AppEntryPage
        activeContext={store.appContext.value}
        isLoading={store.isLoading.value}
        onChoose$={svc.chooseApp$}
      />
    );
  }

  const hideLoginlessCredentialEntry =
    svc.browserSessionLoginlessEnabled &&
    store.currentPath.value === '/login' &&
    readSessionValue(svc.DEV_AUTO_LOGIN_SUPPRESS_KEY) !== '1';

  if (!store.session.ready || !store.session.token) {
    return (
      <LoginPage
        apiStatus={store.apiStatus.value}
        error={store.error.value}
        isLoading={store.isLoading.value || !store.session.ready}
        loadingProgress={store.browserSessionProgress.value}
        appContext={store.appContext.value}
        hideCredentialEntry={hideLoginlessCredentialEntry || store.autoBrowserSessionPending.value}
        defaultEmail={svc.devLoginEmail}
        defaultPassword={svc.devLoginPassword}
        onLogin$={svc.login$}
        onBrowserSession$={svc.openBrowserSession$}
        onBackToEntry$={svc.switchApp$}
      />
    );
  }

  return (
    <AppShell
      currentPath={page.path}
      apiStatus={store.apiStatus.value}
      appContext={store.appContext.value}
      dashboard={store.dashboard.value}
      searchResults={store.searchResultCache.value}
      navigate$={svc.navigate$}
      onLogout$={svc.logout$}
      onSwitchApp$={svc.switchApp$}
    >
      {store.error.value ? <div class="app-error glass-panel">{store.error.value}</div> : null}
      {store.notice.value ? <div class="app-success glass-panel">{store.notice.value}</div> : null}
      {currentPageLoadError ? <div class="app-error glass-panel">{currentPageLoadError}</div> : null}
      {isClientContext ? (
        page.path === '/chat' ? (
          renderWorkspacePage({
            appContext: store.appContext.value,
            currentUser: store.session.user,
            token: store.session.token,
            navigate$: svc.navigate$
          })
        ) : page.path === '/calendario' ? (
          renderWorkspacePage({
            resources: store.resources.value,
            isSaving: store.isSaving.value,
            readOnly: true,
            initialType: route.kind === 'calendarType' ? route.eventType : '',
            navigate$: svc.navigate$,
            onCreate$: svc.createRecord$,
            onUpdate$: svc.updateRecord$,
            onDelete$: svc.deleteRecord$
          })
        ) : page.path === '/documentos' ? (
          renderWorkspacePage({
            page,
            isSaving: store.isSaving.value,
            isPreviewLoading: store.isPreviewLoading.value,
            reportPreview: store.reportPreview.value,
            documentPreview: store.documentPreview.value,
            createIntentResource: store.createIntent.path === page.path ? store.createIntent.resource : '',
            createIntentVersion: store.createIntent.version,
            navigate$: svc.navigate$,
            onCreate$: svc.createRecord$,
            onUpdate$: svc.updateRecord$,
            onDelete$: svc.deleteRecord$,
            onUploadDocument$: svc.uploadDocument$,
            onGenerateDocument$: svc.generateDocument$,
            onPreviewReport$: svc.previewReport$,
            onExportReport$: svc.exportReport$,
            onPreviewDocument$: svc.previewDocument$,
            onDownloadDocument$: svc.downloadDocument$,
            onCloseReportPreview$: svc.closeReportPreview$,
            onCloseDocumentPreview$: svc.closeDocumentPreview$
          })
        ) : (
          renderWorkspacePage({
            appContext: store.appContext.value,
            resources: store.resources.value,
            isSaving: store.isSaving.value,
            token: store.session.token,
            createIntentVersion: store.createIntent.path === '/tickets' ? store.createIntent.version : 0,
            initialStatusGroup: route.kind === 'ticketStatus' ? route.group : '',
            initialPriority: route.kind === 'ticketPriority' ? route.priority : '',
            navigate$: svc.navigate$,
            onCreate$: svc.createRecord$,
            onUpdate$: svc.updateRecord$,
            onDelete$: svc.deleteRecord$
          })
        )
      ) : isWorkerContext ? (
        page.path === '/chat' ? (
          renderWorkspacePage({
            appContext: store.appContext.value,
            currentUser: store.session.user,
            token: store.session.token,
            navigate$: svc.navigate$
          })
        ) : page.path === '/tarefas' ? (
          renderWorkspacePage({
            appContext: store.appContext.value,
            resources: store.resources.value,
            currentUser: store.session.user,
            navigate$: svc.navigate$
          })
        ) : page.path === '/manutencao' ? (
          renderWorkspacePage({
            resources: store.resources.value,
            isSaving: store.isSaving.value,
            createIntentVersion: store.createIntent.path === page.path ? store.createIntent.version : 0,
            initialStatus: route.kind === 'maintenanceStatus' ? route.status : '',
            navigate$: svc.navigate$,
            onCreate$: svc.createRecord$,
            onUpdate$: svc.updateRecord$,
            onDelete$: svc.deleteRecord$
          })
        ) : page.path === '/vistorias' ? (
          renderWorkspacePage({
            appContext: store.appContext.value,
            currentUser: store.session.user,
            resources: store.resources.value,
            isSaving: store.isSaving.value,
            navigate$: svc.navigate$,
            onCreate$: svc.createRecord$,
            onUpdate$: svc.updateRecord$,
            onDelete$: svc.deleteRecord$,
            onGenerateDocument$: svc.generateDocument$
          })
        ) : page.path === '/calendario' ? (
          renderWorkspacePage({
            resources: store.resources.value,
            isSaving: store.isSaving.value,
            initialType: route.kind === 'calendarType' ? route.eventType : '',
            navigate$: svc.navigate$,
            onCreate$: svc.createRecord$,
            onUpdate$: svc.updateRecord$,
            onDelete$: svc.deleteRecord$
          })
        ) : (
          renderWorkspacePage({
            appContext: store.appContext.value,
            resources: store.resources.value,
            isSaving: store.isSaving.value,
            token: store.session.token,
            createIntentVersion: store.createIntent.path === '/tickets' ? store.createIntent.version : 0,
            initialStatusGroup: route.kind === 'ticketStatus' ? route.group : '',
            initialPriority: route.kind === 'ticketPriority' ? route.priority : '',
            navigate$: svc.navigate$,
            onCreate$: svc.createRecord$,
            onUpdate$: svc.updateRecord$,
            onDelete$: svc.deleteRecord$
          })
        )
      ) : route.kind === 'detail' ? (
        renderWorkspacePage({
          route,
          resources: store.resources.value,
          navigate$: svc.navigate$
        })
      ) : page.path === '/dashboard' ? (
        renderWorkspacePage({
          dashboard: store.dashboard.value,
          navigate$: svc.navigate$,
          onQuickAction$: svc.runDashboardAction$,
          onModuleCommand$: svc.runModuleCommand$
        })
      ) : page.path === '/equipa' ? (
        renderWorkspacePage({
          resources: store.resources.value,
          navigate$: svc.navigate$
        })
      ) : page.path === '/tarefas' ? (
        renderWorkspacePage({
          appContext: store.appContext.value,
          resources: store.resources.value,
          currentUser: store.session.user,
          navigate$: svc.navigate$
        })
      ) : page.path === '/condominios' ? (
        renderWorkspacePage({
          token: store.session.token,
          resources: store.resources.value,
          focusArea: store.condominiumShortcutArea.value as CondoAreaId | '',
          isSaving: store.isSaving.value,
          onRefresh$: svc.refreshWorkspace$,
          navigate$: svc.navigate$
        })
      ) : page.path === '/contabilidade' ? (
        renderWorkspacePage({
          resources: store.resources.value,
          isSaving: store.isSaving.value,
          onCreate$: svc.createRecord$
        })
      ) : page.path === '/calendario' ? (
        renderWorkspacePage({
          resources: store.resources.value,
          isSaving: store.isSaving.value,
          initialType: route.kind === 'calendarType' ? route.eventType : '',
          navigate$: svc.navigate$,
          onCreate$: svc.createRecord$,
          onUpdate$: svc.updateRecord$,
          onDelete$: svc.deleteRecord$
        })
      ) : page.path === '/tickets' ? (
        renderWorkspacePage({
          appContext: store.appContext.value,
          resources: store.resources.value,
          isSaving: store.isSaving.value,
          token: store.session.token,
          createIntentVersion: store.createIntent.path === page.path ? store.createIntent.version : 0,
          initialStatusGroup: route.kind === 'ticketStatus' ? route.group : '',
          initialPriority: route.kind === 'ticketPriority' ? route.priority : '',
          navigate$: svc.navigate$,
          onCreate$: svc.createRecord$,
          onUpdate$: svc.updateRecord$,
          onDelete$: svc.deleteRecord$
        })
      ) : page.path === '/manutencao' ? (
        renderWorkspacePage({
          resources: store.resources.value,
          isSaving: store.isSaving.value,
          createIntentVersion: store.createIntent.path === page.path ? store.createIntent.version : 0,
          initialStatus: route.kind === 'maintenanceStatus' ? route.status : '',
          navigate$: svc.navigate$,
          onCreate$: svc.createRecord$,
          onUpdate$: svc.updateRecord$,
          onDelete$: svc.deleteRecord$
        })
      ) : page.path === '/vistorias' ? (
        renderWorkspacePage({
          appContext: store.appContext.value,
          currentUser: store.session.user,
          resources: store.resources.value,
          isSaving: store.isSaving.value,
          navigate$: svc.navigate$,
          onCreate$: svc.createRecord$,
          onUpdate$: svc.updateRecord$,
          onDelete$: svc.deleteRecord$,
          onGenerateDocument$: svc.generateDocument$
        })
      ) : page.path === '/documentos' ? (
        renderWorkspacePage({
          page,
          isSaving: store.isSaving.value,
          isPreviewLoading: store.isPreviewLoading.value,
          reportPreview: store.reportPreview.value,
          documentPreview: store.documentPreview.value,
          createIntentResource: store.createIntent.path === page.path ? store.createIntent.resource : '',
          createIntentVersion: store.createIntent.version,
          navigate$: svc.navigate$,
          onCreate$: svc.createRecord$,
          onUpdate$: svc.updateRecord$,
          onDelete$: svc.deleteRecord$,
          onUploadDocument$: svc.uploadDocument$,
          onGenerateDocument$: svc.generateDocument$,
          onPreviewReport$: svc.previewReport$,
          onExportReport$: svc.exportReport$,
          onPreviewDocument$: svc.previewDocument$,
          onDownloadDocument$: svc.downloadDocument$,
          onCloseReportPreview$: svc.closeReportPreview$,
          onCloseDocumentPreview$: svc.closeDocumentPreview$
        })
      ) : page.path === '/chat' ? (
        renderWorkspacePage({
          appContext: store.appContext.value,
          currentUser: store.session.user,
          token: store.session.token,
          navigate$: svc.navigate$
        })
      ) : (
        renderWorkspacePage({
          page,
          isSaving: store.isSaving.value,
          isPreviewLoading: store.isPreviewLoading.value,
          reportPreview: store.reportPreview.value,
          documentPreview: store.documentPreview.value,
          createIntentResource: store.createIntent.path === page.path ? store.createIntent.resource : '',
          createIntentVersion: store.createIntent.version,
          navigate$: svc.navigate$,
          onCreate$: svc.createRecord$,
          onUpdate$: svc.updateRecord$,
          onDelete$: svc.deleteRecord$,
          onUploadDocument$: svc.uploadDocument$,
          onGenerateDocument$: svc.generateDocument$,
          onPreviewReport$: svc.previewReport$,
          onExportReport$: svc.exportReport$,
          onPreviewDocument$: svc.previewDocument$,
          onDownloadDocument$: svc.downloadDocument$,
          onCloseReportPreview$: svc.closeReportPreview$,
          onCloseDocumentPreview$: svc.closeDocumentPreview$
        })
      )}
    </AppShell>
  );
});

/**
 * Read condominium shortcut area from URL query params.
 */
function readCondominiumShortcutArea(path: string): CondoAreaId | '' {
  const dashboardShortcutAreas: CondoAreaId[] = ['general', 'inspections', 'timeline', 'avarias'];
  const queryStart = path.indexOf('?');
  if (queryStart === -1) {
    return '';
  }
  const queryPart = path.slice(queryStart + 1).split('#', 1)[0] ?? '';
  const params = new URLSearchParams(queryPart);
  const area = params.get('area');
  return area && dashboardShortcutAreas.includes(area as CondoAreaId) ? (area as CondoAreaId) : '';
}
