import { $, component$, useSignal, useStore, useVisibleTask$ } from '@builder.io/qwik';
import { useLocation } from '@builder.io/qwik-city';
import { AppEntryPage } from './components/auth/AppEntryPage';
import { LoginPage } from './components/auth/LoginPage';
import { DashboardPage } from './components/dashboard/DashboardPage';
import { CalendarPage } from './components/pages/CalendarPage';
import { AccountingPage } from './components/pages/AccountingPage';
import { ChatPage } from './components/pages/ChatPage';
import { CondominiumsPage, type CondoAreaId } from './components/pages/CondominiumsPage';
import { DocumentsPage } from './components/pages/DocumentsPage';
import { EntityDetailPage } from './components/pages/EntityDetailPage';
import { InspectionsPage } from './components/pages/InspectionsPage';
import { MaintenancePage } from './components/pages/MaintenancePage';
import { PageOverview } from './components/pages/PageOverview';
import { TasksPage } from './components/pages/TasksPage';
import { TeamPage } from './components/pages/TeamPage';
import { TicketsPage } from './components/pages/TicketsPage';
import { AppShell } from './components/shell/AppShell';
import {
  emptyResources,
  fallbackDashboard,
  buildPages,
  getPageByPath
} from './data/pages';
import { buildGlobalSearchResults } from './data/search';
import {
  SESSION_TOKEN_KEY,
  SESSION_EXPIRES_KEY,
  SESSION_REFRESH_KEY,
  SESSION_APP_CONTEXT_KEY,
  createResource,
  deleteResource,
  downloadDocument,
  exportReport,
  generateDocument,
  getApiHealth,
  getDashboard,
  getDocumentPreview,
  getReportPreview,
  getResources,
  login,
  logout,
  me,
  refreshSession,
  startBrowserSession,
  uploadDocument,
  updateResource,
  warmupApi,
  type ApiStatus,
  type AppContext,
  type CreateResource,
  type DocumentPreview,
  type GenerateDocumentPayload,
  type ReportPreview,
  type ResourceEndpoint,
  type PublicUser
} from './lib/api';
import { matchEntityRoute } from './lib/entity-navigation';

const normalizeInnerPath = (path: string) => {
  const [withoutHash = '/dashboard'] = path.split('#', 1);
  const [pathname = '/dashboard'] = withoutHash.split('?', 1);
  return pathname || '/dashboard';
};

const normalizeAppContext = (value: string): AppContext => {
  if (value === 'worker' || value === 'client') return value;
  return 'hq';
};

const parseRouteContext = (rawPath: string): { appContext: AppContext; path: string; showEntry: boolean } => {
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

const hasExplicitAppContext = (rawPath: string): boolean => {
  const [pathname = '/'] = rawPath.split('?', 1);
  const first = pathname.split('/').filter(Boolean)[0] ?? '';
  return first === 'hq' || first === 'worker' || first === 'client';
};

const buildAppPath = (appContext: AppContext, innerPath: string) => {
  const normalized = innerPath.startsWith('/') ? innerPath : `/${innerPath}`;
  return `/${appContext}${normalized}`;
};

const readBrowserSessionParams = (rawPath: string) => {
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

  return {
    token,
    refreshToken,
    appContext,
    dashboardPath,
    expiresAt
  };
};

const readStoredValue = (key: string) => {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage.getItem(key);
  } catch {
    return null;
  }
};

const writeStoredValue = (key: string, value: string) => {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value);
    }
  } catch {
    // Some embedded browsers disable localStorage; keep the in-memory session usable.
  }
};

const removeStoredValue = (key: string) => {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(key);
    }
  } catch {
    // Storage cleanup is best-effort when the browser blocks localStorage.
  }
};

const dashboardShortcutAreas: CondoAreaId[] = ['general', 'inspections', 'timeline', 'avarias'];
const isLocalDevelopmentMode = import.meta.env.MODE === 'development';
const devAutoLoginEnabled =
  isLocalDevelopmentMode &&
  String(import.meta.env.VITE_GESTISAC_DEV_AUTO_LOGIN ?? 'true').trim().toLowerCase() !== 'false';
const browserSessionLoginlessEnabled =
  devAutoLoginEnabled ||
  String(import.meta.env.VITE_GESTISAC_LOGIN_NEEDED ?? 'false').trim().toLowerCase() === 'false';
const devLoginEmail = isLocalDevelopmentMode ? String(import.meta.env.VITE_GESTISAC_DEV_LOGIN_EMAIL ?? '') : '';
const devLoginPassword = isLocalDevelopmentMode ? String(import.meta.env.VITE_GESTISAC_DEV_LOGIN_PASSWORD ?? '') : '';
const DEV_AUTO_LOGIN_SUPPRESS_KEY = 'gestisac:dev-auto-login-suppress';
const BROWSER_SESSION_MAX_ATTEMPTS = 4;
const BROWSER_SESSION_RETRY_DELAY_MS = 1_500;

const readSessionValue = (key: string) => {
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

export const App = component$(() => {
  const location = useLocation();
  const initialRoute = parseRouteContext(
    `${location.url.pathname}${location.url.search}${location.url.hash}`
  );
  const currentPath = useSignal(initialRoute.path);
  const appContext = useSignal<AppContext>(initialRoute.appContext);
  const showEntry = useSignal(initialRoute.showEntry);
  const condominiumShortcutArea = useSignal<CondoAreaId | ''>('');
  const autoBrowserSessionPending = useSignal(false);
  const apiStatus = useSignal<ApiStatus>('checking');
  const dashboard = useSignal(fallbackDashboard);
  const resources = useSignal(emptyResources);
  const pageCache = useSignal(buildPages(emptyResources, fallbackDashboard));
  const searchResultCache = useSignal(buildGlobalSearchResults(emptyResources));
  const error = useSignal('');
  const notice = useSignal('');
  const reportPreview = useSignal<ReportPreview | null>(null);
  const documentPreview = useSignal<DocumentPreview | null>(null);
  const isLoading = useSignal(false);
  const isSaving = useSignal(false);
  const isPreviewLoading = useSignal(false);
  const browserSessionProgress = useSignal(8);
  const session = useStore<{
    ready: boolean;
    token: string;
    user: PublicUser | null;
    appContext: AppContext;
  }>({
    ready: false,
    token: '',
    user: null,
    appContext: 'hq'
  });
  const createIntent = useStore<{
    path: string;
    resource: CreateResource | '';
    version: number;
  }>({
    path: '',
    resource: '',
    version: 0
  });

  const applyDashboardData$ = $((dashboardData: typeof fallbackDashboard) => {
    dashboard.value = dashboardData;
    pageCache.value = buildPages(resources.value, dashboardData);
    session.user = dashboardData.user;
    apiStatus.value = 'online';
  });

  const applyResourceData$ = $((resourceData: typeof emptyResources) => {
    resources.value = resourceData;
    pageCache.value = buildPages(resourceData, dashboard.value);
    searchResultCache.value = buildGlobalSearchResults(resourceData);
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

  const loadWorkspace$ = $(async (token: string) => {
    const dashboardData = await getDashboard(token);
    await applyDashboardData$(dashboardData);

    void getResources(token)
      .then((resourceData) => applyResourceData$(resourceData))
      .catch((err) => {
        error.value =
          err instanceof Error
            ? `Sessao iniciada, mas alguns dados ainda nao carregaram: ${err.message}`
            : 'Sessao iniciada, mas alguns dados ainda nao carregaram';
      });
  });

  const refreshWorkspace$ = $(async () => {
    if (session.token) {
      await loadWorkspace$(session.token);
    }
  });

  const navigate$ = $((path: string) => {
    const targetPath = path === '/' ? '/dashboard' : path;
    const normalizedPath = normalizeInnerPath(targetPath);
    condominiumShortcutArea.value =
      normalizedPath === '/condominios' ? readCondominiumShortcutArea(targetPath) : '';
    const navigationStartedAt =
      import.meta.env.DEV && typeof performance !== 'undefined'
        ? performance.now()
        : 0;
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
    if (navigationStartedAt && typeof requestAnimationFrame !== 'undefined') {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          console.info(
            `[gestisac:navigation] ${normalizedPath} ${Math.round(performance.now() - navigationStartedAt)}ms`
          );
        });
      });
    }
  });

  const login$ = $(async (email: string, password: string, context: AppContext) => {
    error.value = '';
    notice.value = '';
    isLoading.value = true;
    try {
      const auth = await login(email.trim(), password, context);
      session.token = auth.token;
      session.user = auth.user;
      session.appContext = auth.appContext || context;
      appContext.value = auth.appContext || context;
      writeStoredValue(SESSION_TOKEN_KEY, auth.token);
      writeStoredValue(SESSION_REFRESH_KEY, auth.refreshToken);
      writeStoredValue(SESSION_EXPIRES_KEY, auth.expiresAt);
      writeStoredValue(SESSION_APP_CONTEXT_KEY, auth.appContext || context);
      await loadWorkspace$(auth.token);
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
    pageCache.value = buildPages(emptyResources, fallbackDashboard);
    searchResultCache.value = buildGlobalSearchResults(emptyResources);
    removeStoredValue(SESSION_TOKEN_KEY);
    removeStoredValue(SESSION_REFRESH_KEY);
    removeStoredValue(SESSION_EXPIRES_KEY);
    removeStoredValue(SESSION_APP_CONTEXT_KEY);
    if (devAutoLoginEnabled) {
      writeSessionValue(DEV_AUTO_LOGIN_SUPPRESS_KEY, '1');
    }
    if (token) {
      await logout(token).catch(() => undefined);
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

      await loadWorkspace$(session.token);
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
    autoBrowserSessionPending.value = true;
    isLoading.value = true;
    browserSessionProgress.value = Math.max(browserSessionProgress.value, 18);
    removeSessionValue(DEV_AUTO_LOGIN_SUPPRESS_KEY);
    const progressTimer =
      typeof window === 'undefined'
        ? undefined
        : window.setInterval(() => {
            browserSessionProgress.value = Math.min(
              90,
              browserSessionProgress.value + (browserSessionProgress.value < 55 ? 4 : 2)
            );
          }, 900);
    try {
      let auth: Awaited<ReturnType<typeof startBrowserSession>> | null = null;
      let lastError: unknown = null;

      for (let attempt = 1; attempt <= BROWSER_SESSION_MAX_ATTEMPTS; attempt += 1) {
        try {
          browserSessionProgress.value = Math.max(
            browserSessionProgress.value,
            Math.min(82, 18 + attempt * 12)
          );
          await warmupApi();
          browserSessionProgress.value = Math.max(
            browserSessionProgress.value,
            Math.min(88, 30 + attempt * 12)
          );
          auth = await startBrowserSession(appContext.value);
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

      browserSessionProgress.value = 92;
      session.token = auth.token;
      session.user = auth.user;
      session.appContext = auth.appContext || appContext.value;
      appContext.value = auth.appContext || appContext.value;
      writeStoredValue(SESSION_TOKEN_KEY, auth.token);
      writeStoredValue(SESSION_REFRESH_KEY, auth.refreshToken);
      writeStoredValue(SESSION_EXPIRES_KEY, auth.expiresAt);
      writeStoredValue(SESSION_APP_CONTEXT_KEY, auth.appContext || appContext.value);
      await loadWorkspace$(auth.token);
      browserSessionProgress.value = 100;
      showEntry.value = false;
      autoBrowserSessionPending.value = false;
      session.ready = true;
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
      if (progressTimer) {
        window.clearInterval(progressTimer);
      }
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
      await loadWorkspace$(session.token);
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
      await loadWorkspace$(session.token);
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
      await loadWorkspace$(session.token);
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
      await loadWorkspace$(session.token);
      documentPreview.value = await getDocumentPreview(session.token, created.id);
      notice.value = 'Documento carregado com sucesso.';
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Nao foi possivel carregar documento';
    } finally {
      isSaving.value = false;
    }
  });

  const generateDocument$ = $(async (payload: GenerateDocumentPayload) => {
    if (!session.token) {
      error.value = 'Sessao expirada. Entra novamente.';
      notice.value = '';
      return;
    }

    error.value = '';
    notice.value = '';
    isSaving.value = true;
    try {
      const created = await generateDocument(session.token, payload);
      await loadWorkspace$(session.token);
      const downloaded = await downloadDocument(session.token, created.id);
      triggerBrowserDownload(downloaded.blob, downloaded.filename);
      documentPreview.value = await getDocumentPreview(session.token, created.id);
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
      reportPreview.value = await getReportPreview(session.token, id);
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
      await loadWorkspace$(session.token);
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
      documentPreview.value = await getDocumentPreview(session.token, id);
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

  useVisibleTask$(({ cleanup }) => {
    const syncPath = () => {
      const rawPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      const route = parseRouteContext(rawPath);
      showEntry.value = route.showEntry;
      appContext.value = route.appContext;
      if (session.token && route.path === '/login') {
        currentPath.value = '/dashboard';
        window.history.replaceState({}, '', buildAppPath(route.appContext, '/dashboard'));
        return;
      }
      currentPath.value = route.path;
      condominiumShortcutArea.value =
        route.path === '/condominios' ? readCondominiumShortcutArea(rawPath) : '';
    };

    syncPath();
    window.addEventListener('popstate', syncPath);
    cleanup(() => window.removeEventListener('popstate', syncPath));
  });

  useVisibleTask$(({ cleanup }) => {
    const intervalId = window.setInterval(() => {
      if (!autoBrowserSessionPending.value && !isLoading.value) {
        browserSessionProgress.value = 8;
        return;
      }

      browserSessionProgress.value = Math.min(
        96,
        browserSessionProgress.value + (browserSessionProgress.value < 55 ? 7 : 3)
      );
    }, 650);

    cleanup(() => window.clearInterval(intervalId));
  });

  useVisibleTask$(async () => {
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
        await loadWorkspace$(browserSession.token);
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
          await loadWorkspace$(refreshed.token);
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
      openBrowserSession$();
      return;
    }

    try {
      const current = await me(storedToken);
      session.token = storedToken;
      session.user = current.user;
      await loadWorkspace$(storedToken);
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
          await loadWorkspace$(refreshed.token);
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

  if (showEntry.value) {
    return (
      <AppEntryPage
        activeContext={appContext.value}
        isLoading={isLoading.value}
        onChoose$={chooseApp$}
      />
    );
  }

  const hideLoginlessCredentialEntry =
    browserSessionLoginlessEnabled &&
    currentPath.value === '/login' &&
    readSessionValue(DEV_AUTO_LOGIN_SUPPRESS_KEY) !== '1';

  if (!session.ready || !session.token) {
    return (
      <LoginPage
        apiStatus={apiStatus.value}
        error={error.value}
        isLoading={isLoading.value || !session.ready}
        loadingProgress={browserSessionProgress.value}
        appContext={appContext.value}
        hideCredentialEntry={hideLoginlessCredentialEntry || autoBrowserSessionPending.value}
        defaultEmail={devLoginEmail}
        defaultPassword={devLoginPassword}
        onLogin$={login$}
        onBrowserSession$={openBrowserSession$}
        onBackToEntry$={switchApp$}
      />
    );
  }

  const safePath = currentPath.value === '/login' ? '/dashboard' : currentPath.value;
  const route = matchEntityRoute(safePath);
  const page = getPageByPath(pageCache.value, route.basePath);
  const isWorkerContext = appContext.value === 'worker';
  const isClientContext = appContext.value === 'client';

  return (
    <AppShell
      currentPath={page.path}
      apiStatus={apiStatus.value}
      appContext={appContext.value}
      dashboard={dashboard.value}
      searchResults={searchResultCache.value}
      navigate$={navigate$}
      onLogout$={logout$}
      onSwitchApp$={switchApp$}
    >
      {error.value ? <div class="app-error glass-panel">{error.value}</div> : null}
      {notice.value ? <div class="app-success glass-panel">{notice.value}</div> : null}
      {isClientContext ? (
        page.path === '/chat' ? (
          <ChatPage
            appContext={appContext.value}
            currentUser={session.user}
            token={session.token}
            navigate$={navigate$}
          />
        ) : page.path === '/calendario' ? (
          <CalendarPage
            resources={resources.value}
            isSaving={isSaving.value}
            readOnly
            initialType={route.kind === 'calendarType' ? route.eventType : ''}
            navigate$={navigate$}
            onCreate$={createRecord$}
            onUpdate$={updateRecord$}
            onDelete$={deleteRecord$}
          />
        ) : page.path === '/documentos' ? (
          <DocumentsPage
            page={page}
            isSaving={isSaving.value}
            isPreviewLoading={isPreviewLoading.value}
            reportPreview={reportPreview.value}
            documentPreview={documentPreview.value}
            createIntentResource={createIntent.path === page.path ? createIntent.resource : ''}
            createIntentVersion={createIntent.version}
            navigate$={navigate$}
            onCreate$={createRecord$}
            onUpdate$={updateRecord$}
            onDelete$={deleteRecord$}
            onUploadDocument$={uploadDocument$}
            onGenerateDocument$={generateDocument$}
            onPreviewReport$={previewReport$}
            onExportReport$={exportReport$}
            onPreviewDocument$={previewDocument$}
            onDownloadDocument$={downloadDocument$}
            onCloseReportPreview$={closeReportPreview$}
            onCloseDocumentPreview$={closeDocumentPreview$}
          />
        ) : (
          <TicketsPage
            appContext={appContext.value}
            resources={resources.value}
            isSaving={isSaving.value}
            token={session.token}
            createIntentVersion={createIntent.path === '/tickets' ? createIntent.version : 0}
            initialStatusGroup={route.kind === 'ticketStatus' ? route.group : ''}
            initialPriority={route.kind === 'ticketPriority' ? route.priority : ''}
            navigate$={navigate$}
            onCreate$={createRecord$}
            onUpdate$={updateRecord$}
            onDelete$={deleteRecord$}
          />
        )
      ) : isWorkerContext ? (
        page.path === '/chat' ? (
          <ChatPage
            appContext={appContext.value}
            currentUser={session.user}
            token={session.token}
            navigate$={navigate$}
          />
        ) : page.path === '/tarefas' ? (
          <TasksPage
            appContext={appContext.value}
            resources={resources.value}
            currentUser={session.user}
            navigate$={navigate$}
          />
        ) : page.path === '/manutencao' ? (
          <MaintenancePage
            resources={resources.value}
            isSaving={isSaving.value}
            createIntentVersion={createIntent.path === page.path ? createIntent.version : 0}
            initialStatus={route.kind === 'maintenanceStatus' ? route.status : ''}
            navigate$={navigate$}
            onCreate$={createRecord$}
            onUpdate$={updateRecord$}
            onDelete$={deleteRecord$}
          />
        ) : page.path === '/vistorias' ? (
          <InspectionsPage
            appContext={appContext.value}
            currentUser={session.user}
            resources={resources.value}
            isSaving={isSaving.value}
            navigate$={navigate$}
            onCreate$={createRecord$}
            onUpdate$={updateRecord$}
            onDelete$={deleteRecord$}
            onGenerateDocument$={generateDocument$}
          />
        ) : page.path === '/calendario' ? (
          <CalendarPage
            resources={resources.value}
            isSaving={isSaving.value}
            initialType={route.kind === 'calendarType' ? route.eventType : ''}
            navigate$={navigate$}
            onCreate$={createRecord$}
            onUpdate$={updateRecord$}
            onDelete$={deleteRecord$}
          />
        ) : (
          <TicketsPage
            appContext={appContext.value}
            resources={resources.value}
            isSaving={isSaving.value}
            token={session.token}
            createIntentVersion={createIntent.path === '/tickets' ? createIntent.version : 0}
            initialStatusGroup={route.kind === 'ticketStatus' ? route.group : ''}
            initialPriority={route.kind === 'ticketPriority' ? route.priority : ''}
            navigate$={navigate$}
            onCreate$={createRecord$}
            onUpdate$={updateRecord$}
            onDelete$={deleteRecord$}
          />
        )
      ) : route.kind === 'detail' ? (
        <EntityDetailPage
          route={route}
          resources={resources.value}
          navigate$={navigate$}
        />
      ) : page.path === '/dashboard' ? (
        <DashboardPage
          dashboard={dashboard.value}
          navigate$={navigate$}
          onQuickAction$={runDashboardAction$}
          onModuleCommand$={runModuleCommand$}
        />
      ) : page.path === '/equipa' ? (
        <TeamPage
          resources={resources.value}
          navigate$={navigate$}
        />
      ) : page.path === '/tarefas' ? (
        <TasksPage
          appContext={appContext.value}
          resources={resources.value}
          currentUser={session.user}
          navigate$={navigate$}
        />
      ) : page.path === '/condominios' ? (
        <CondominiumsPage
          token={session.token}
          resources={resources.value}
          focusArea={condominiumShortcutArea.value}
          isSaving={isSaving.value}
          onRefresh$={refreshWorkspace$}
          navigate$={navigate$}
        />
      ) : page.path === '/contabilidade' ? (
        <AccountingPage
          resources={resources.value}
          isSaving={isSaving.value}
          onCreate$={createRecord$}
        />
      ) : page.path === '/calendario' ? (
        <CalendarPage
          resources={resources.value}
          isSaving={isSaving.value}
          initialType={route.kind === 'calendarType' ? route.eventType : ''}
          navigate$={navigate$}
          onCreate$={createRecord$}
          onUpdate$={updateRecord$}
          onDelete$={deleteRecord$}
        />
      ) : page.path === '/tickets' ? (
        <TicketsPage
          appContext={appContext.value}
          resources={resources.value}
          isSaving={isSaving.value}
          token={session.token}
          createIntentVersion={createIntent.path === page.path ? createIntent.version : 0}
          initialStatusGroup={route.kind === 'ticketStatus' ? route.group : ''}
          initialPriority={route.kind === 'ticketPriority' ? route.priority : ''}
          navigate$={navigate$}
          onCreate$={createRecord$}
          onUpdate$={updateRecord$}
          onDelete$={deleteRecord$}
        />
      ) : page.path === '/manutencao' ? (
        <MaintenancePage
          resources={resources.value}
          isSaving={isSaving.value}
          createIntentVersion={createIntent.path === page.path ? createIntent.version : 0}
          initialStatus={route.kind === 'maintenanceStatus' ? route.status : ''}
          navigate$={navigate$}
          onCreate$={createRecord$}
          onUpdate$={updateRecord$}
          onDelete$={deleteRecord$}
        />
      ) : page.path === '/vistorias' ? (
        <InspectionsPage
          appContext={appContext.value}
          currentUser={session.user}
          resources={resources.value}
          isSaving={isSaving.value}
          navigate$={navigate$}
          onCreate$={createRecord$}
          onUpdate$={updateRecord$}
          onDelete$={deleteRecord$}
          onGenerateDocument$={generateDocument$}
        />
      ) : page.path === '/documentos' ? (
        <DocumentsPage
          page={page}
          isSaving={isSaving.value}
          isPreviewLoading={isPreviewLoading.value}
          reportPreview={reportPreview.value}
          documentPreview={documentPreview.value}
          createIntentResource={createIntent.path === page.path ? createIntent.resource : ''}
          createIntentVersion={createIntent.version}
          navigate$={navigate$}
          onCreate$={createRecord$}
          onUpdate$={updateRecord$}
          onDelete$={deleteRecord$}
          onUploadDocument$={uploadDocument$}
          onGenerateDocument$={generateDocument$}
          onPreviewReport$={previewReport$}
          onExportReport$={exportReport$}
          onPreviewDocument$={previewDocument$}
          onDownloadDocument$={downloadDocument$}
          onCloseReportPreview$={closeReportPreview$}
          onCloseDocumentPreview$={closeDocumentPreview$}
        />
      ) : page.path === '/chat' ? (
        <ChatPage
          appContext={appContext.value}
          currentUser={session.user}
          token={session.token}
          navigate$={navigate$}
        />
      ) : (
        <PageOverview
          page={page}
          isSaving={isSaving.value}
          isPreviewLoading={isPreviewLoading.value}
          reportPreview={reportPreview.value}
          documentPreview={documentPreview.value}
          createIntentResource={createIntent.path === page.path ? createIntent.resource : ''}
          createIntentVersion={createIntent.version}
          navigate$={navigate$}
          onCreate$={createRecord$}
          onUpdate$={updateRecord$}
          onDelete$={deleteRecord$}
          onUploadDocument$={uploadDocument$}
          onGenerateDocument$={generateDocument$}
          onPreviewReport$={previewReport$}
          onExportReport$={exportReport$}
          onPreviewDocument$={previewDocument$}
          onDownloadDocument$={downloadDocument$}
          onCloseReportPreview$={closeReportPreview$}
          onCloseDocumentPreview$={closeDocumentPreview$}
        />
      )}
    </AppShell>
  );
});
