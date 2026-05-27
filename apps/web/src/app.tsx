import { $, component$, useSignal, useStore, useVisibleTask$ } from '@builder.io/qwik';
import { LoginPage } from './components/auth/LoginPage';
import { DashboardPage } from './components/dashboard/DashboardPage';
import { CalendarPage } from './components/pages/CalendarPage';
import { CondominiumsPage, type CondoAreaId } from './components/pages/CondominiumsPage';
import { DocumentsPage } from './components/pages/DocumentsPage';
import { EntityDetailPage } from './components/pages/EntityDetailPage';
import { MaintenancePage } from './components/pages/MaintenancePage';
import { PageOverview } from './components/pages/PageOverview';
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
  uploadDocument,
  updateResource,
  type ApiStatus,
  type CreateResource,
  type DocumentPreview,
  type GenerateDocumentPayload,
  type ReportPreview,
  type ResourceEndpoint,
  type PublicUser
} from './lib/api';
import { matchEntityRoute } from './lib/entity-navigation';

const normalizePath = (path: string) => {
  const basePath = path === '/' ? '/dashboard' : path;
  const [withoutHash = '/dashboard'] = basePath.split('#', 1);
  const [pathname = '/dashboard'] = withoutHash.split('?', 1);
  return pathname || '/dashboard';
};

const dashboardShortcutAreas: CondoAreaId[] = ['general', 'inspections', 'timeline', 'avarias'];

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
  const currentPath = useSignal('/dashboard');
  const condominiumShortcutArea = useSignal<CondoAreaId | ''>('');
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
  const session = useStore<{
    ready: boolean;
    token: string;
    user: PublicUser | null;
  }>({
    ready: false,
    token: '',
    user: null
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

  const loadWorkspace$ = $(async (token: string) => {
    const [dashboardData, resourceData] = await Promise.all([
      getDashboard(token),
      getResources(token)
    ]);
    dashboard.value = dashboardData;
    resources.value = resourceData;
    pageCache.value = buildPages(resourceData, dashboardData);
    searchResultCache.value = buildGlobalSearchResults(resourceData);
    session.user = dashboardData.user;
    apiStatus.value = 'online';
  });

  const refreshWorkspace$ = $(async () => {
    if (session.token) {
      await loadWorkspace$(session.token);
    }
  });

  const navigate$ = $((path: string) => {
    const targetPath = path === '/' ? '/dashboard' : path;
    const normalizedPath = normalizePath(targetPath);
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
    window.history.pushState({}, '', targetPath);
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

  const login$ = $(async (email: string, password: string) => {
    error.value = '';
    notice.value = '';
    isLoading.value = true;
    try {
      const auth = await login(email.trim(), password);
      session.token = auth.token;
      session.user = auth.user;
      localStorage.setItem(SESSION_TOKEN_KEY, auth.token);
      localStorage.setItem(SESSION_REFRESH_KEY, auth.refreshToken);
      localStorage.setItem(SESSION_EXPIRES_KEY, auth.expiresAt);
      await loadWorkspace$(auth.token);
      await navigate$('/dashboard');
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Nao foi possivel iniciar sessao';
      session.token = '';
      session.user = null;
      localStorage.removeItem(SESSION_TOKEN_KEY);
      localStorage.removeItem(SESSION_REFRESH_KEY);
      localStorage.removeItem(SESSION_EXPIRES_KEY);
    } finally {
      isLoading.value = false;
      session.ready = true;
    }
  });

  const logout$ = $(async () => {
    const token = session.token;
    notice.value = '';
    error.value = '';
    session.token = '';
    session.user = null;
    dashboard.value = fallbackDashboard;
    resources.value = emptyResources;
    pageCache.value = buildPages(emptyResources, fallbackDashboard);
    searchResultCache.value = buildGlobalSearchResults(emptyResources);
    localStorage.removeItem(SESSION_TOKEN_KEY);
    localStorage.removeItem(SESSION_REFRESH_KEY);
    localStorage.removeItem(SESSION_EXPIRES_KEY);
    if (token) {
      await logout(token).catch(() => undefined);
    }
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

    await navigate$('/dashboard');
  });

  const runModuleCommand$ = $(async (moduleId: string, command: string) => {
    const pathByModule: Record<string, string> = {
      condominiums: '/condominios',
      accounting: '/contabilidade',
      administration: '/administracao',
      reports: '/relatorios',
      calendar: '/calendario'
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
      const normalizedPath = normalizePath(rawPath);
      currentPath.value = normalizedPath;
      condominiumShortcutArea.value =
        normalizedPath === '/condominios' ? readCondominiumShortcutArea(rawPath) : '';
    };

    syncPath();
    window.addEventListener('popstate', syncPath);
    cleanup(() => window.removeEventListener('popstate', syncPath));
  });

  useVisibleTask$(async () => {
    try {
      await getApiHealth();
      apiStatus.value = 'online';
    } catch {
      apiStatus.value = 'offline';
    }

    let storedToken = localStorage.getItem(SESSION_TOKEN_KEY);
    const storedExpiry = localStorage.getItem(SESSION_EXPIRES_KEY);
    if (storedToken && storedExpiry && Date.parse(storedExpiry) <= Date.now() + 15_000) {
      localStorage.removeItem(SESSION_TOKEN_KEY);
      storedToken = '';
    }

    if (!storedToken) {
      const storedRefreshToken = localStorage.getItem(SESSION_REFRESH_KEY);
      if (storedRefreshToken) {
        try {
          const refreshed = await refreshSession(storedRefreshToken);
          storedToken = refreshed.token;
          session.token = refreshed.token;
          session.user = refreshed.user;
          localStorage.setItem(SESSION_TOKEN_KEY, refreshed.token);
          localStorage.setItem(SESSION_REFRESH_KEY, refreshed.refreshToken);
          localStorage.setItem(SESSION_EXPIRES_KEY, refreshed.expiresAt);
          await loadWorkspace$(refreshed.token);
        } catch {
          localStorage.removeItem(SESSION_REFRESH_KEY);
          localStorage.removeItem(SESSION_EXPIRES_KEY);
          session.token = '';
          session.user = null;
        } finally {
          session.ready = true;
        }
        return;
      }
      session.ready = true;
      return;
    }

    try {
      const current = await me(storedToken);
      session.token = storedToken;
      session.user = current.user;
      await loadWorkspace$(storedToken);
    } catch {
      const storedRefreshToken = localStorage.getItem(SESSION_REFRESH_KEY);
      if (storedRefreshToken) {
        try {
          const refreshed = await refreshSession(storedRefreshToken);
          session.token = refreshed.token;
          session.user = refreshed.user;
          localStorage.setItem(SESSION_TOKEN_KEY, refreshed.token);
          localStorage.setItem(SESSION_REFRESH_KEY, refreshed.refreshToken);
          localStorage.setItem(SESSION_EXPIRES_KEY, refreshed.expiresAt);
          await loadWorkspace$(refreshed.token);
        } catch {
          localStorage.removeItem(SESSION_TOKEN_KEY);
          localStorage.removeItem(SESSION_REFRESH_KEY);
          localStorage.removeItem(SESSION_EXPIRES_KEY);
          session.token = '';
          session.user = null;
        }
      } else {
        localStorage.removeItem(SESSION_TOKEN_KEY);
        session.token = '';
        session.user = null;
      }
    } finally {
      session.ready = true;
    }
  });

  if (!session.ready || !session.token) {
    return (
      <LoginPage
        apiStatus={apiStatus.value}
        error={error.value}
        isLoading={isLoading.value || !session.ready}
        onLogin$={login$}
      />
    );
  }

  const route = matchEntityRoute(currentPath.value);
  const page = getPageByPath(pageCache.value, route.basePath);

  return (
    <AppShell
      currentPath={page.path}
      apiStatus={apiStatus.value}
      dashboard={dashboard.value}
      searchResults={searchResultCache.value}
      navigate$={navigate$}
      onLogout$={logout$}
    >
      {error.value ? <div class="app-error glass-panel">{error.value}</div> : null}
      {notice.value ? <div class="app-success glass-panel">{notice.value}</div> : null}
      {route.kind === 'detail' ? (
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
      ) : page.path === '/condominios' ? (
        <CondominiumsPage
          token={session.token}
          resources={resources.value}
          focusArea={condominiumShortcutArea.value}
          isSaving={isSaving.value}
          onRefresh$={refreshWorkspace$}
          navigate$={navigate$}
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
