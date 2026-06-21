import { $ } from '@builder.io/qwik';
import type { AppContext, ResourceEndpoint, CreateResource, PublicUser, DashboardResponse, ResourceState } from '../api';
import type { CondoAreaId } from '../../components/pages/CondominiumsPage';
import type { EntityRouteMatch } from '../entity-navigation';
import {
  SESSION_TOKEN_KEY,
  SESSION_EXPIRES_KEY,
  SESSION_REFRESH_KEY,
  SESSION_APP_CONTEXT_KEY,
  login as apiLogin,
  logout as apiLogout,
  me,
  refreshSession,
  startBrowserSession,
  warmupApi,
  getApiHealth,
  getDashboard,
  getResources,
  getDocumentPreview as apiGetDocumentPreview,
  getReportPreview as apiGetReportPreview,
  getAccounting,
  getResourcePage,
  listarOcorrencias,
  createResource,
  updateResource,
  deleteResource,
  uploadDocument,
  generateDocument,
  downloadDocument,
  exportReport
} from '../api';
import { loadPageComponent, resolvePageLoaderKey, type PageLoaderKey, type LazyPageComponent } from '../lazy-pages';
import { buildWorkspaceSnapshots, getPageByPath } from '../../data/pages';
import { matchEntityRoute } from '../entity-navigation';
import { installBrowserPerformanceTelemetry, recordBrowserPerformanceRouteCommit, recordBrowserPerformanceSpan } from '../performance-telemetry';
import type { SessionStore, SessionState } from './session-store';
import { fallbackDashboard, emptyResources } from './session-store';
import { type Signal, type NoSerialize, noSerialize } from '@builder.io/qwik';

export type ApiStatus = 'online' | 'offline' | 'checking';

const dashboardShortcutAreas: CondoAreaId[] = ['general', 'inspections', 'timeline', 'avarias'];
const isLocalDevelopmentMode = typeof import.meta !== 'undefined' ? import.meta.env.MODE === 'development' : false;
const devAutoLoginEnabled =
  isLocalDevelopmentMode &&
  typeof import.meta !== 'undefined' &&
  String(import.meta.env.VITE_GESTISAC_DEV_AUTO_LOGIN ?? 'true').trim().toLowerCase() !== 'false';
const browserSessionLoginlessEnabled =
  devAutoLoginEnabled ||
  typeof import.meta === 'undefined' ||
  String(import.meta.env.VITE_GESTISAC_LOGIN_NEEDED ?? 'false').trim().toLowerCase() === 'false';
const devLoginEmail = isLocalDevelopmentMode ? String(typeof import.meta !== 'undefined' ? import.meta.env.VITE_GESTISAC_DEV_LOGIN_EMAIL ?? '' : '') : '';
const devLoginPassword = isLocalDevelopmentMode ? String(typeof import.meta !== 'undefined' ? import.meta.env.VITE_GESTISAC_DEV_LOGIN_PASSWORD ?? '' : '') : '';
const DEV_AUTO_LOGIN_SUPPRESS_KEY = 'gestisac:dev-auto-login-suppress';
const BROWSER_SESSION_MAX_ATTEMPTS = 6;
const BROWSER_SESSION_RETRY_DELAY_MS = 1_500;

const collectionRefreshMap: Partial<Record<ResourceEndpoint, { key: keyof ResourceState; path: string }>> = {
  condominiums: { key: 'condominiums', path: '/api/condominiums' },
  buildings: { key: 'buildings', path: '/api/buildings' },
  fractions: { key: 'fractions', path: '/api/fractions' },
  residents: { key: 'residents', path: '/api/residents' },
  tickets: { key: 'tickets', path: '/api/tickets' },
  suppliers: { key: 'suppliers', path: '/api/suppliers' },
  documents: { key: 'documents', path: '/api/documents' },
  reports: { key: 'reports', path: '/api/reports' },
  assemblies: { key: 'assemblies', path: '/api/assemblies' },
  maintenance: { key: 'maintenance', path: '/api/maintenance' },
  inspections: { key: 'inspections', path: '/api/inspections' },
  'calendar-events': { key: 'calendarEvents', path: '/api/calendar-events' }
};

const isAccountingResource = (resource: ResourceEndpoint) => resource.startsWith('accounting/');

/* ---------- helpers ---------- */

export const normalizeInnerPath = (path: string) => {
  const [withoutHash = '/dashboard'] = path.split('#', 1);
  const [pathname = '/dashboard'] = withoutHash.split('?', 1);
  return pathname || '/dashboard';
};

export const normalizeAppContext = (value: string): AppContext => {
  if (value === 'worker' || value === 'client') return value;
  return 'hq';
};

export const parseRouteContext = (rawPath: string): { appContext: AppContext; path: string; showEntry: boolean } => {
  const [pathname = '/'] = rawPath.split('?', 1);
  if (pathname === '/' || pathname === '') {
    return { appContext: 'hq', path: '/dashboard', showEntry: true };
  }
  const parts = pathname.split('/').filter(Boolean);
  const first = parts[0] ?? '';
  if (first === 'hq' || first === 'worker' || first === 'client') {
    const appContext = normalizeAppContext(first);
    const remaining = `/${parts.slice(1).join('/')}`;
    const path = normalizeInnerPath(remaining === '/' ? '/dashboard' : remaining);
    return { appContext, path, showEntry: false };
  }
  return { appContext: 'hq', path: normalizeInnerPath(pathname), showEntry: false };
};

export const hasExplicitAppContext = (rawPath: string): boolean => {
  const [pathname = '/'] = rawPath.split('?', 1);
  const first = pathname.split('/').filter(Boolean)[0] ?? '';
  return first === 'hq' || first === 'worker' || first === 'client';
};

export const buildAppPath = (appContext: AppContext, innerPath: string) => {
  const normalized = innerPath.startsWith('/') ? innerPath : `/${innerPath}`;
  return `/${appContext}${normalized}`;
};

export const readBrowserSessionParams = (rawPath: string) => {
  const [pathname = '/', search = ''] = rawPath.split('?', 2);
  if (!pathname || !search) {
    return null;
  }

  const params = new URLSearchParams(search.split('#', 1)[0] ?? '');
  if (params.get('browserSession') !== '1') {
    return null;
  }
  const token = params.get('token')?.trim() ?? '';
  const refreshToken = params.get('refreshToken')?.trim() ?? '';
  const appContext = normalizeAppContext(params.get('appContext') ?? 'hq');
  const dashboardPath = normalizeInnerPath(params.get('dashboardPath') ?? buildAppPath(appContext, '/dashboard'));
  const expiresAt = params.get('expiresAt')?.trim() ?? '';

  if (!token || !refreshToken) {
    return null;
  }

  return { token, refreshToken, appContext, dashboardPath, expiresAt };
};

export const readStoredValue = (key: string) => {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage.getItem(key);
  } catch {
    return null;
  }
};

export const writeStoredValue = (key: string, value: string) => {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value);
    }
  } catch {
    // Some embedded browsers disable localStorage; keep the in-memory session usable.
  }
};

export const removeStoredValue = (key: string) => {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(key);
    }
  } catch {
    // Storage cleanup is best-effort when the browser blocks localStorage.
  }
};

export const readSessionValue = (key: string) => {
  try {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage.getItem(key);
  } catch {
    return null;
  }
};

const writeSessionValue = (key: string, value: string) => {
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(key, value);
    }
  } catch {
    // Session storage is best-effort in embedded browsers.
  }
};

const removeSessionValue = (key: string) => {
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(key);
    }
  } catch {
    // Session storage cleanup is best-effort in embedded browsers.
  }
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const readCondominiumShortcutArea = (path: string): CondoAreaId | '' => {
  const queryStart = path.indexOf('?');
  if (queryStart === -1) {
    return '';
  }
  const queryPart = path.slice(queryStart + 1).split('#', 1)[0] ?? '';
  const params = new URLSearchParams(queryPart);
  const area = params.get('area');
  return area && dashboardShortcutAreas.includes(area as CondoAreaId) ? (area as CondoAreaId) : '';
};

const triggerBrowserDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  link.style.display = 'none';
  document.body?.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

/* ---------- session factory ---------- */

export function createSessionService(state: SessionStore) {
  const { session, appContext, currentPath, showEntry, autoBrowserSessionPending, apiStatus, dashboard,
    resources, error, notice, reportPreview, documentPreview, isLoading, isSaving, isPreviewLoading,
    browserSessionProgress, condominiumShortcutArea, pageCache, searchResultCache, pageState, createIntent } = state;

  const applyDashboardData$ = $((dashboardData: typeof fallbackDashboard) => {
    dashboard.value = dashboardData;
    const workspaceSnapshots = buildWorkspaceSnapshots(resources.value, dashboardData);
    pageCache.value = workspaceSnapshots.pages;
    searchResultCache.value = workspaceSnapshots.searchResults;
    session.user = dashboardData.user;
    apiStatus.value = 'online';
  });

  const applyWorkspaceData$ = $((
    dashboardData: typeof fallbackDashboard,
    resourceData: typeof emptyResources
  ) => {
    dashboard.value = dashboardData;
    resources.value = resourceData;
    const workspaceSnapshots = buildWorkspaceSnapshots(resourceData, dashboardData);
    pageCache.value = workspaceSnapshots.pages;
    searchResultCache.value = workspaceSnapshots.searchResults;
    session.user = dashboardData.user;
    apiStatus.value = 'online';
    if (resourceData.loadWarnings?.length) {
      error.value = `Sessao iniciada, mas alguns modulos carregaram em modo degradado: ${resourceData.loadWarnings.join(', ')}`;
      return;
    }
    if (
      error.value.startsWith('Sessao iniciada, mas alguns dados ainda nao carregaram') ||
      error.value.startsWith('Sessao iniciada, mas alguns modulos carregaram em modo degradado')
    ) {
      error.value = '';
    }
  });

  const applyWorkspacePatch$ = $((
    dashboardData: typeof fallbackDashboard,
    resourcePatch: Partial<ResourceState>
  ) => {
    const nextResources = {
      ...resources.value,
      ...resourcePatch
    };
    dashboard.value = dashboardData;
    resources.value = nextResources;
    const workspaceSnapshots = buildWorkspaceSnapshots(nextResources, dashboardData);
    pageCache.value = workspaceSnapshots.pages;
    searchResultCache.value = workspaceSnapshots.searchResults;
    session.user = dashboardData.user;
    apiStatus.value = 'online';
    if (
      error.value.startsWith('Sessao iniciada, mas alguns dados ainda nao carregaram') ||
      error.value.startsWith('Sessao iniciada, mas alguns modulos carregaram em modo degradado')
    ) {
      error.value = '';
    }
  });

  const loadWorkspace$ = $(async (
    token: string,
    loadDetail: Record<string, unknown> = { source: 'workspace' }
  ) => {
    const workspaceStartedAt = typeof performance !== 'undefined' ? performance.now() : 0;
    const [dashboardResult, resourceResult] = await Promise.allSettled([
      getDashboard(token),
      getResources(token)
    ]);

    if (dashboardResult.status === 'rejected') {
      error.value =
        dashboardResult.reason instanceof Error
          ? `Sessao iniciada, mas o dashboard ainda nao carregou: ${dashboardResult.reason.message}`
          : 'Sessao iniciada, mas o dashboard ainda nao carregou';
      return;
    }

    if (resourceResult.status === 'fulfilled') {
      await applyWorkspaceData$(dashboardResult.value, resourceResult.value);
      recordBrowserPerformanceSpan('workspace-load', workspaceStartedAt, {
        ...loadDetail,
        appContext: appContext.value,
        resources: 'ok'
      });
      return;
    }

    await applyDashboardData$(dashboardResult.value);
    error.value =
      resourceResult.reason instanceof Error
        ? `Sessao iniciada, mas alguns dados ainda nao carregaram: ${resourceResult.reason.message}`
        : 'Sessao iniciada, mas alguns dados ainda nao carregaram';
    recordBrowserPerformanceSpan('workspace-load', workspaceStartedAt, {
      ...loadDetail,
      appContext: appContext.value,
      resources: 'degraded'
    });
  });

  const refreshWorkspaceSlice$ = $(async (token: string, resource: ResourceEndpoint) => {
    const refreshStartedAt = typeof performance !== 'undefined' ? performance.now() : 0;
    const collectionConfig = collectionRefreshMap[resource];

    try {
      if (collectionConfig) {
        const [dashboardData, items] = await Promise.all([
          getDashboard(token),
          getResourcePage<unknown>(token, collectionConfig.path)
        ]);
        await applyWorkspacePatch$(dashboardData, {
          [collectionConfig.key]: items
        } as Partial<ResourceState>);
        recordBrowserPerformanceSpan('workspace-slice-refresh', refreshStartedAt, {
          resource,
          appContext: appContext.value
        });
        return true;
      }

      if (resource === 'ocorrencias') {
        const [dashboardData, paginatedOcorrencias] = await Promise.all([
          getDashboard(token),
          listarOcorrencias(token)
        ]);
        await applyWorkspacePatch$(dashboardData, {
          ocorrencias: paginatedOcorrencias.data
        });
        recordBrowserPerformanceSpan('workspace-slice-refresh', refreshStartedAt, {
          resource,
          appContext: appContext.value
        });
        return true;
      }

      if (isAccountingResource(resource)) {
        const [dashboardData, accountingData] = await Promise.all([
          getDashboard(token),
          getAccounting(token)
        ]);
        await applyWorkspacePatch$(dashboardData, { accounting: accountingData });
        recordBrowserPerformanceSpan('workspace-slice-refresh', refreshStartedAt, {
          resource: 'accounting',
          appContext: appContext.value
        });
        return true;
      }
    } catch (err) {
      error.value =
        err instanceof Error
          ? `Sessao iniciada, mas alguns dados ainda nao carregaram: ${err.message}`
          : 'Sessao iniciada, mas alguns dados ainda nao carregaram';
    }

    return false;
  });

  const refreshWorkspace$ = $(async () => {
    if (session.token) {
      await loadWorkspace$(session.token, { source: 'manual-refresh' });
    }
  });

  const navigate$ = $((path: string) => {
    const targetPath = path === '/' ? '/dashboard' : path;
    const normalizedPath = normalizeInnerPath(targetPath);
    condominiumShortcutArea.value =
      normalizedPath === '/condominios' ? readCondominiumShortcutArea(targetPath) : '';
    const navigationStartedAt = typeof performance !== 'undefined' ? performance.now() : 0;
    notice.value = '';
    error.value = '';
    if (normalizedPath !== '/relatorios') {
      reportPreview.value = null;
    }
    if (normalizedPath !== '/documentos') {
      documentPreview.value = null;
    }
    currentPath.value = normalizedPath;
    window.history.pushState({}, '', buildAppPath(appContext.value, targetPath));
    window.scrollTo({ top: 0, behavior: 'auto' });
    recordBrowserPerformanceRouteCommit(normalizedPath, navigationStartedAt);
    recordBrowserPerformanceSpan('navigation', navigationStartedAt, {
      route: normalizedPath,
      appContext: appContext.value
    });
  });

  const login$ = $(async (email: string, password: string, context: AppContext) => {
    error.value = '';
    notice.value = '';
    isLoading.value = true;
    try {
      const auth = await apiLogin(email.trim(), password, context);
      session.token = auth.token;
      session.user = auth.user;
      session.appContext = auth.appContext || context;
      appContext.value = auth.appContext || context;
      writeStoredValue(SESSION_TOKEN_KEY, auth.token);
      writeStoredValue(SESSION_REFRESH_KEY, auth.refreshToken);
      writeStoredValue(SESSION_EXPIRES_KEY, auth.expiresAt);
      writeStoredValue(SESSION_APP_CONTEXT_KEY, auth.appContext || context);
      await loadWorkspace$(auth.token, { source: 'login' });
      await navigate$('/dashboard');
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Nao foi possivel iniciar sessao';
      session.token = '';
      session.user = null;
      session.appContext = context;
      removeStoredValue(SESSION_TOKEN_KEY);
      removeStoredValue(SESSION_REFRESH_KEY);
      removeStoredValue(SESSION_EXPIRES_KEY);
      removeStoredValue(SESSION_APP_CONTEXT_KEY);
    } finally {
      isLoading.value = false;
      session.ready = true;
    }
  });

  const logout$ = $(async () => {
    const token = session.token;
    const context = appContext.value;
    notice.value = '';
    error.value = '';
    session.token = '';
    session.user = null;
    session.appContext = context;
    appContext.value = context;
    currentPath.value = '/login';
    showEntry.value = false;
    autoBrowserSessionPending.value = false;
    dashboard.value = fallbackDashboard;
    resources.value = emptyResources;
    const workspaceSnapshots = buildWorkspaceSnapshots(emptyResources, fallbackDashboard);
    pageCache.value = workspaceSnapshots.pages;
    searchResultCache.value = workspaceSnapshots.searchResults;
    removeStoredValue(SESSION_TOKEN_KEY);
    removeStoredValue(SESSION_REFRESH_KEY);
    removeStoredValue(SESSION_EXPIRES_KEY);
    removeStoredValue(SESSION_APP_CONTEXT_KEY);
    if (devAutoLoginEnabled) {
      writeSessionValue(DEV_AUTO_LOGIN_SUPPRESS_KEY, '1');
    }
    if (token) {
      await apiLogout(token).catch(() => undefined);
    }
    window.history.replaceState({}, '', buildAppPath(context, '/login'));
  });

  const chooseApp$ = $(async (context: AppContext) => {
    error.value = '';
    notice.value = '';
    appContext.value = context;
    session.appContext = context;
    if (devAutoLoginEnabled) {
      removeSessionValue(DEV_AUTO_LOGIN_SUPPRESS_KEY);
    }

    if (browserSessionLoginlessEnabled) {
      session.ready = false;
      session.token = '';
      session.user = null;
      removeStoredValue(SESSION_TOKEN_KEY);
      removeStoredValue(SESSION_REFRESH_KEY);
      removeStoredValue(SESSION_EXPIRES_KEY);
      writeStoredValue(SESSION_APP_CONTEXT_KEY, context);
      window.history.pushState({}, '', buildAppPath(context, '/login'));
      showEntry.value = false;
      currentPath.value = '/login';
      autoBrowserSessionPending.value = true;
      browserSessionProgress.value = 12;
      await openBrowserSession$();
      return;
    }

    if (!session.token) {
      window.history.pushState({}, '', buildAppPath(context, '/login'));
      showEntry.value = false;
      currentPath.value = '/login';
      if (browserSessionLoginlessEnabled) {
        autoBrowserSessionPending.value = true;
        browserSessionProgress.value = 12;
        await openBrowserSession$();
      }
      return;
    }

    isLoading.value = true;
    try {
      const storedRefreshToken = readStoredValue(SESSION_REFRESH_KEY);
      if (storedRefreshToken) {
        const refreshed = await refreshSession(storedRefreshToken, context);
        session.token = refreshed.token;
        session.user = refreshed.user;
        session.appContext = refreshed.appContext || context;
        appContext.value = refreshed.appContext || context;
        writeStoredValue(SESSION_TOKEN_KEY, refreshed.token);
        writeStoredValue(SESSION_REFRESH_KEY, refreshed.refreshToken);
        writeStoredValue(SESSION_EXPIRES_KEY, refreshed.expiresAt);
        writeStoredValue(SESSION_APP_CONTEXT_KEY, refreshed.appContext || context);
      } else {
        writeStoredValue(SESSION_APP_CONTEXT_KEY, context);
      }

      await loadWorkspace$(session.token, { source: 'app-switch' });
      showEntry.value = false;
      currentPath.value = '/dashboard';
      window.history.pushState({}, '', buildAppPath(appContext.value, '/dashboard'));
      window.scrollTo({ top: 0, behavior: 'auto' });
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Sessao expirada. Entra novamente.';
      session.token = '';
      session.user = null;
      session.appContext = context;
      removeStoredValue(SESSION_TOKEN_KEY);
      removeStoredValue(SESSION_REFRESH_KEY);
      removeStoredValue(SESSION_EXPIRES_KEY);
      writeStoredValue(SESSION_APP_CONTEXT_KEY, context);
      showEntry.value = false;
      currentPath.value = '/login';
      window.history.replaceState({}, '', buildAppPath(context, '/login'));
    } finally {
      isLoading.value = false;
      session.ready = true;
    }
  });

  const openBrowserSession$ = $(async () => {
    error.value = '';
    notice.value = '';
    showEntry.value = false;
    currentPath.value = '/login';
    autoBrowserSessionPending.value = true;
    isLoading.value = true;
    browserSessionProgress.value = Math.max(browserSessionProgress.value, 18);
    removeSessionValue(DEV_AUTO_LOGIN_SUPPRESS_KEY);
    try {
      const browserSessionStartedAt = typeof performance !== 'undefined' ? performance.now() : 0;
      let auth: Awaited<ReturnType<typeof startBrowserSession>> | null = null;
      let lastError: unknown = null;
      let attemptsUsed = 0;

      for (let attempt = 1; attempt <= BROWSER_SESSION_MAX_ATTEMPTS; attempt += 1) {
        try {
          attemptsUsed = attempt;
          browserSessionProgress.value = Math.max(
            browserSessionProgress.value,
            Math.min(32, 18 + attempt * 4)
          );
          const warmupStartedAt = typeof performance !== 'undefined' ? performance.now() : 0;
          await warmupApi();
          browserSessionProgress.value = Math.max(
            browserSessionProgress.value,
            Math.min(54, 34 + attempt * 4)
          );
          browserSessionProgress.value = Math.max(browserSessionProgress.value, 58);
          const browserSessionRequestStartedAt =
            typeof performance !== 'undefined' ? performance.now() : 0;
          auth = await startBrowserSession(appContext.value);
          recordBrowserPerformanceSpan('warmup', warmupStartedAt, {
            attempt,
            flow: 'browser-session'
          });
          recordBrowserPerformanceSpan('browser-session-request', browserSessionRequestStartedAt, {
            attempt,
            appContext: appContext.value
          });
          break;
        } catch (err) {
          lastError = err;
          if (attempt < BROWSER_SESSION_MAX_ATTEMPTS) {
            error.value = `A API ainda esta a acordar. Nova tentativa automatica ${attempt + 1}/${BROWSER_SESSION_MAX_ATTEMPTS}...`;
            await delay(BROWSER_SESSION_RETRY_DELAY_MS * attempt);
          }
        }
      }

      if (!auth) {
        throw lastError instanceof Error ? lastError : new Error('Sessao automatica indisponivel');
      }

      browserSessionProgress.value = Math.max(browserSessionProgress.value, 76);
      session.token = auth.token;
      session.user = auth.user;
      session.appContext = auth.appContext || appContext.value;
      appContext.value = auth.appContext || appContext.value;
      writeStoredValue(SESSION_TOKEN_KEY, auth.token);
      writeStoredValue(SESSION_REFRESH_KEY, auth.refreshToken);
      writeStoredValue(SESSION_EXPIRES_KEY, auth.expiresAt);
      writeStoredValue(SESSION_APP_CONTEXT_KEY, auth.appContext || appContext.value);
      browserSessionProgress.value = Math.max(browserSessionProgress.value, 88);
      await loadWorkspace$(auth.token, { source: 'browser-session', attempts: attemptsUsed });
      browserSessionProgress.value = 100;
      showEntry.value = false;
      autoBrowserSessionPending.value = false;
      session.ready = true;
      recordBrowserPerformanceSpan('browser-session', browserSessionStartedAt, {
        attempts: attemptsUsed,
        appContext: appContext.value
      });
      await navigate$('/dashboard');
    } catch (err) {
      error.value =
        err instanceof Error
          ? `Nao foi possivel abrir a sessao automatica: ${err.message}`
          : 'Nao foi possivel abrir a sessao automatica';
      session.token = '';
      session.user = null;
      session.ready = true;
      autoBrowserSessionPending.value = browserSessionLoginlessEnabled;
    } finally {
      isLoading.value = false;
    }
  });

  const switchApp$ = $(() => {
    const token = session.token;
    showEntry.value = true;
    currentPath.value = '/dashboard';
    if (!token) {
      session.user = null;
      session.appContext = 'hq';
      appContext.value = 'hq';
    }
    window.history.replaceState({}, '', '/');
  });

  const openCreateFor$ = $(async (path: string, resource: CreateResource) => {
    createIntent.path = path;
    createIntent.resource = resource;
    createIntent.version += 1;
    await navigate$(path);
  });

  const runDashboardAction$ = $(async (title: string) => {
    if (title === 'Novo Ticket') {
      await openCreateFor$('/tickets', 'tickets');
      return;
    }
    if (title === 'Emitir Recibo') {
      await openCreateFor$('/contabilidade', 'accounting/receipts');
      return;
    }
    if (title === 'Novo Condominio') {
      await openCreateFor$('/condominios', 'condominiums');
      return;
    }
    if (title === 'Gerar Relatorio') {
      await openCreateFor$('/relatorios', 'reports');
      return;
    }
    if (title === 'Extrato de Conta') {
      await navigate$('/condominios?area=general');
      return;
    }
    if (title === 'Avarias') {
      await navigate$('/condominios?area=avarias');
      return;
    }
    if (title === 'Email') {
      await navigate$('/condominios?area=support');
      return;
    }
    if (title === 'Calendario') {
      await navigate$('/calendario');
      return;
    }
    if (title === 'Equipa') {
      await navigate$('/equipa');
      return;
    }
    if (title === 'Tarefas') {
      await navigate$('/tarefas');
      return;
    }
    await navigate$('/dashboard');
  });

  const runModuleCommand$ = $(async (moduleId: string, command: string) => {
    const pathByModule: Record<string, string> = {
      condominiums: '/condominios',
      accounting: '/contabilidade',
      administration: '/administracao',
      reports: '/relatorios',
      calendar: '/calendario',
      team: '/equipa',
      tasks: '/tarefas'
    };
    const createByModule: Record<string, CreateResource> = {
      condominiums: 'condominiums',
      accounting: 'accounting/quotas',
      administration: 'tickets',
      reports: 'reports'
    };
    const targetPath = pathByModule[moduleId] ?? '/dashboard';

    if (command === 'create' && createByModule[moduleId]) {
      await openCreateFor$(targetPath, createByModule[moduleId]);
      return;
    }

    await navigate$(targetPath);
  });

  const createRecord$ = $(async (resource: ResourceEndpoint, payload: Record<string, unknown>) => {
    if (!session.token) {
      error.value = 'Sessao expirada. Entra novamente.';
      notice.value = '';
      return;
    }

    error.value = '';
    notice.value = '';
    isSaving.value = true;
    try {
      await createResource(session.token, resource, payload);
      if (!(await refreshWorkspaceSlice$(session.token, resource))) {
        await loadWorkspace$(session.token, { source: 'mutation-fallback', resource });
      }
      notice.value = 'Registo criado com sucesso.';
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Nao foi possivel guardar';
    } finally {
      isSaving.value = false;
    }
  });

  const updateRecord$ = $(async (
    resource: ResourceEndpoint,
    id: string,
    payload: Record<string, unknown>
  ) => {
    if (!session.token) {
      error.value = 'Sessao expirada. Entra novamente.';
      notice.value = '';
      return;
    }

    error.value = '';
    notice.value = '';
    isSaving.value = true;
    try {
      await updateResource(session.token, resource, id, payload);
      if (!(await refreshWorkspaceSlice$(session.token, resource))) {
        await loadWorkspace$(session.token, { source: 'mutation-fallback', resource });
      }
      notice.value = 'Alteracao guardada com sucesso.';
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Nao foi possivel atualizar';
    } finally {
      isSaving.value = false;
    }
  });

  const deleteRecord$ = $(async (resource: ResourceEndpoint, id: string) => {
    if (!session.token) {
      error.value = 'Sessao expirada. Entra novamente.';
      notice.value = '';
      return;
    }

    error.value = '';
    notice.value = '';
    isSaving.value = true;
    try {
      await deleteResource(session.token, resource, id);
      if (!(await refreshWorkspaceSlice$(session.token, resource))) {
        await loadWorkspace$(session.token, { source: 'mutation-fallback', resource });
      }
      notice.value = 'Registo apagado com sucesso.';
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Nao foi possivel apagar';
    } finally {
      isSaving.value = false;
    }
  });

  const uploadDocument$ = $(async (payload: FormData) => {
    if (!session.token) {
      error.value = 'Sessao expirada. Entra novamente.';
      notice.value = '';
      return;
    }

    error.value = '';
    notice.value = '';
    isSaving.value = true;
    try {
      const created = await uploadDocument(session.token, payload);
      if (!(await refreshWorkspaceSlice$(session.token, 'documents'))) {
        await loadWorkspace$(session.token, { source: 'mutation-fallback', resource: 'documents' });
      }
      documentPreview.value = await apiGetDocumentPreview(session.token, created.id);
      notice.value = 'Documento carregado com sucesso.';
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Nao foi possivel carregar documento';
    } finally {
      isSaving.value = false;
    }
  });

  const generateDocument$ = $(async (payload: Record<string, unknown>) => {
    if (!session.token) {
      error.value = 'Sessao expirada. Entra novamente.';
      notice.value = '';
      return;
    }

    error.value = '';
    notice.value = '';
    isSaving.value = true;
    try {
      const created = await generateDocument(session.token, payload as any);
      if (!(await refreshWorkspaceSlice$(session.token, 'documents'))) {
        await loadWorkspace$(session.token, { source: 'mutation-fallback', resource: 'documents' });
      }
      const downloaded = await downloadDocument(session.token, created.id);
      triggerBrowserDownload(downloaded.blob, downloaded.filename);
      documentPreview.value = await apiGetDocumentPreview(session.token, created.id);
      notice.value = `Documento gerado: ${downloaded.filename}`;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Nao foi possivel gerar documento';
    } finally {
      isSaving.value = false;
    }
  });

  const previewReport$ = $(async (id: string) => {
    if (!session.token) {
      error.value = 'Sessao expirada. Entra novamente.';
      notice.value = '';
      return;
    }

    error.value = '';
    notice.value = '';
    isPreviewLoading.value = true;
    try {
      reportPreview.value = await apiGetReportPreview(session.token, id);
      notice.value = 'Preview do relatorio gerado com dados reais.';
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Nao foi possivel gerar preview';
    } finally {
      isPreviewLoading.value = false;
    }
  });

  const exportReport$ = $(async (id: string) => {
    if (!session.token) {
      error.value = 'Sessao expirada. Entra novamente.';
      notice.value = '';
      return;
    }

    error.value = '';
    notice.value = '';
    isSaving.value = true;
    try {
      const exported = await exportReport(session.token, id);
      triggerBrowserDownload(exported.blob, exported.filename);
      if (!(await refreshWorkspaceSlice$(session.token, 'reports'))) {
        await loadWorkspace$(session.token, { source: 'mutation-fallback', resource: 'reports' });
      }
      notice.value = `Relatorio exportado: ${exported.filename}`;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Nao foi possivel exportar relatorio';
    } finally {
      isSaving.value = false;
    }
  });

  const previewDocument$ = $(async (id: string) => {
    if (!session.token) {
      error.value = 'Sessao expirada. Entra novamente.';
      notice.value = '';
      return;
    }

    error.value = '';
    notice.value = '';
    isPreviewLoading.value = true;
    try {
      documentPreview.value = await apiGetDocumentPreview(session.token, id);
      notice.value = 'Preview do documento aberto.';
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Nao foi possivel abrir preview do documento';
    } finally {
      isPreviewLoading.value = false;
    }
  });

  const downloadDocument$ = $(async (id: string) => {
    if (!session.token) {
      error.value = 'Sessao expirada. Entra novamente.';
      notice.value = '';
      return;
    }

    error.value = '';
    notice.value = '';
    isSaving.value = true;
    try {
      const downloaded = await downloadDocument(session.token, id);
      triggerBrowserDownload(downloaded.blob, downloaded.filename);
      notice.value = `Documento descarregado: ${downloaded.filename}`;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Nao foi possivel descarregar documento';
    } finally {
      isSaving.value = false;
    }
  });

  const closeReportPreview$ = $(() => {
    reportPreview.value = null;
  });

  const closeDocumentPreview$ = $(() => {
    documentPreview.value = null;
  });

  /* ---------- page loading ---------- */

  const currentPageKey = '';
  const getPageRenderState$ = $((path: string) => {
    const safePath = path === '/login' ? '/dashboard' : path;
    const route = matchEntityRoute(safePath);
    const page = getPageByPath(pageCache.value, route.basePath);
    const pageLoaderKey = resolvePageLoaderKey(page.path, route.kind);
    return { route, page, pageLoaderKey };
  });

  const loadPage$ = $(async (loaderKey: PageLoaderKey) => {
    if (pageState.key === loaderKey && pageState.component) {
      pageState.loading = false;
      pageState.error = '';
      return;
    }

    pageState.key = loaderKey;
    pageState.loading = true;
    pageState.error = '';

    try {
      const component = await loadPageComponent(loaderKey);
      pageState.component = noSerialize(component);
    } catch (err) {
      pageState.component = undefined;
      pageState.error = err instanceof Error ? err.message : 'Nao foi possivel carregar a pagina';
    } finally {
      pageState.loading = false;
    }
  });

  /* ---------- initialisation (for useVisibleTask) ---------- */

  const initBrowserSession$ = $(async () => {
    const rawPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    const browserSession = readBrowserSessionParams(rawPath);
    if (browserSession) {
      writeStoredValue(SESSION_TOKEN_KEY, browserSession.token);
      writeStoredValue(SESSION_REFRESH_KEY, browserSession.refreshToken);
      writeStoredValue(SESSION_APP_CONTEXT_KEY, browserSession.appContext);
      if (browserSession.expiresAt) {
        writeStoredValue(SESSION_EXPIRES_KEY, browserSession.expiresAt);
      }

      session.token = browserSession.token;
      session.user = null;
      session.appContext = browserSession.appContext;
      appContext.value = browserSession.appContext;
      showEntry.value = false;
      autoBrowserSessionPending.value = false;
      removeSessionValue(DEV_AUTO_LOGIN_SUPPRESS_KEY);
      currentPath.value = '/dashboard';
      window.history.replaceState({}, '', browserSession.dashboardPath);

      try {
        await loadWorkspace$(browserSession.token, { source: 'browser-session-url' });
      } finally {
        session.ready = true;
      }
      return;
    }

    const route = parseRouteContext(rawPath);
    const shouldStartLoginlessSession =
      browserSessionLoginlessEnabled &&
      route.path === '/login' &&
      readSessionValue(DEV_AUTO_LOGIN_SUPPRESS_KEY) !== '1';
    let storedToken = readStoredValue(SESSION_TOKEN_KEY);
    const storedAppContext = hasExplicitAppContext(rawPath)
      ? route.appContext
      : normalizeAppContext(readStoredValue(SESSION_APP_CONTEXT_KEY) ?? 'hq');
    session.appContext = storedAppContext;
    appContext.value = storedAppContext;
    currentPath.value = route.path;
    showEntry.value = route.showEntry;
    const storedExpiry = readStoredValue(SESSION_EXPIRES_KEY);
    if (storedToken && storedExpiry && Date.parse(storedExpiry) <= Date.now() + 15_000) {
      removeStoredValue(SESSION_TOKEN_KEY);
      removeStoredValue(SESSION_APP_CONTEXT_KEY);
      storedToken = '';
    }

    if (shouldStartLoginlessSession && !storedToken && !readStoredValue(SESSION_REFRESH_KEY)) {
      autoBrowserSessionPending.value = true;
      browserSessionProgress.value = 12;
      await openBrowserSession$();
      return;
    }

    try {
      await getApiHealth();
      apiStatus.value = 'online';
    } catch {
      apiStatus.value = 'offline';
    }

    if (!storedToken) {
      const storedRefreshToken = readStoredValue(SESSION_REFRESH_KEY);
      if (storedRefreshToken) {
        try {
          const refreshed = await refreshSession(storedRefreshToken, storedAppContext);
          storedToken = refreshed.token;
          session.token = refreshed.token;
          session.user = refreshed.user;
          session.appContext = refreshed.appContext || storedAppContext;
          appContext.value = refreshed.appContext || storedAppContext;
          writeStoredValue(SESSION_TOKEN_KEY, refreshed.token);
          writeStoredValue(SESSION_REFRESH_KEY, refreshed.refreshToken);
          writeStoredValue(SESSION_EXPIRES_KEY, refreshed.expiresAt);
          writeStoredValue(SESSION_APP_CONTEXT_KEY, refreshed.appContext || storedAppContext);
          await loadWorkspace$(refreshed.token, { source: 'stored-refresh' });
          if (route.path === '/login') {
            currentPath.value = '/dashboard';
            window.history.replaceState({}, '', buildAppPath(refreshed.appContext || storedAppContext, '/dashboard'));
          }
        } catch {
          removeStoredValue(SESSION_REFRESH_KEY);
          removeStoredValue(SESSION_EXPIRES_KEY);
          removeStoredValue(SESSION_APP_CONTEXT_KEY);
          session.token = '';
          session.user = null;
        } finally {
          session.ready = true;
        }
        return;
      }

      if (shouldStartLoginlessSession) {
        autoBrowserSessionPending.value = true;
        browserSessionProgress.value = 12;
        await openBrowserSession$();
        return;
      }

      session.ready = true;
      return;
    }

    if (shouldStartLoginlessSession) {
      autoBrowserSessionPending.value = true;
      await openBrowserSession$();
      return;
    }

    try {
      const current = await me(storedToken);
      session.token = storedToken;
      session.user = current.user;
      await loadWorkspace$(storedToken, { source: 'stored-session' });
      if (route.path === '/login') {
        currentPath.value = '/dashboard';
        window.history.replaceState({}, '', buildAppPath(storedAppContext, '/dashboard'));
      }
    } catch {
      const storedRefreshToken = readStoredValue(SESSION_REFRESH_KEY);
      if (storedRefreshToken) {
        try {
          const refreshed = await refreshSession(storedRefreshToken, storedAppContext);
          session.token = refreshed.token;
          session.user = refreshed.user;
          session.appContext = refreshed.appContext || storedAppContext;
          appContext.value = refreshed.appContext || storedAppContext;
          writeStoredValue(SESSION_TOKEN_KEY, refreshed.token);
          writeStoredValue(SESSION_REFRESH_KEY, refreshed.refreshToken);
          writeStoredValue(SESSION_EXPIRES_KEY, refreshed.expiresAt);
          writeStoredValue(SESSION_APP_CONTEXT_KEY, refreshed.appContext || storedAppContext);
          await loadWorkspace$(refreshed.token, { source: 'stored-refresh-after-me' });
          if (route.path === '/login') {
            currentPath.value = '/dashboard';
            window.history.replaceState({}, '', buildAppPath(refreshed.appContext || storedAppContext, '/dashboard'));
          }
        } catch {
          removeStoredValue(SESSION_TOKEN_KEY);
          removeStoredValue(SESSION_REFRESH_KEY);
          removeStoredValue(SESSION_EXPIRES_KEY);
          removeStoredValue(SESSION_APP_CONTEXT_KEY);
          session.token = '';
          session.user = null;
        }
      } else {
        removeStoredValue(SESSION_TOKEN_KEY);
        removeStoredValue(SESSION_APP_CONTEXT_KEY);
        session.token = '';
        session.user = null;
      }
    } finally {
      session.ready = true;
    }
  });

  return {
    // State
    session,
    appContext,
    currentPath,
    showEntry,
    autoBrowserSessionPending,
    apiStatus,
    dashboard,
    resources,
    error,
    notice,
    reportPreview,
    documentPreview,
    isLoading,
    isSaving,
    isPreviewLoading,
    browserSessionProgress,
    condominiumShortcutArea,
    pageCache,
    searchResultCache,
    createIntent,
    pageState,
    // Exported constants
    devLoginEmail,
    devLoginPassword,
    browserSessionLoginlessEnabled,
    devAutoLoginEnabled,
    DEV_AUTO_LOGIN_SUPPRESS_KEY,
    // Actions
    navigate$,
    login$,
    logout$,
    chooseApp$,
    switchApp$,
    openBrowserSession$,
    openCreateFor$,
    runDashboardAction$,
    runModuleCommand$,
    refreshWorkspace$,
    refreshWorkspaceSlice$,
    createRecord$,
    updateRecord$,
    deleteRecord$,
    uploadDocument$,
    generateDocument$,
    previewReport$,
    exportReport$,
    previewDocument$,
    downloadDocument$,
    closeReportPreview$,
    closeDocumentPreview$,
    // Page loading
    loadPage$,
    getPageRenderState$,
    // Init
    initBrowserSession$
  };
}

export type SessionService = ReturnType<typeof createSessionService>;
