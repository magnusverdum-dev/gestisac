import { useSignal, useStore } from '@builder.io/qwik';
import type {
  AppContext,
  PublicUser,
  DashboardResponse,
  ResourceState,
  CreateResource,
  DocumentPreview,
  ReportPreview
} from '../api';
import type { PageLoaderKey, LazyPageComponent } from '../lazy-pages';
import type { ApiStatus } from './session-service';
import { buildWorkspaceSnapshots } from '../../data/pages';

export const fallbackDashboard: DashboardResponse = {
  user: {
    id: '',
    tenantId: '',
    name: 'Administrador',
    email: 'admin@gestisac.pt',
    role: 'Administrador',
    activeCondominium: 'GESTISAC',
    activeCondominiums: 0
  },
  activeCondominium: 'GESTISAC',
  urgentNotice: {
    type: 'system',
    title: 'A ligar ao backend',
    detail: 'A carregar dados operacionais',
    priority: 'checking'
  },
  operationalSummary: [],
  quickActions: [],
  dashboardModules: [],
  alerts: []
};

export const emptyResources: ResourceState = {
  condominiums: [],
  buildings: [],
  fractions: [],
  residents: [],
  team: [],
  tickets: [],
  ocorrencias: [],
  suppliers: [],
  documents: [],
  reports: [],
  maintenance: [],
  inspections: [],
  calendarEvents: [],
  assemblies: [],
  accounting: {
    summary: {
      currentBalance: 0,
      paidQuotaPercentage: 0,
      overdueAmount: 0,
      overdueCount: 0,
      monthlyExpenses: 0,
      reserveFund: 0,
      currency: 'EUR'
    },
    overview: {
      quotasToValidate: 0,
      unreconciledMovements: 0,
      receiptsToIssue: 0,
      debtsInFollowUp: 0,
      overdueDebtSeverity: 'normal',
      activePaymentAgreements: 0,
      brokenPaymentAgreements: 0,
      reserveFundStatus: 'sem dados'
    },
    quotas: [],
    payments: [],
    debts: [],
    receipts: [],
    expenses: [],
    reserveFunds: [],
    paymentAgreements: [],
    cashMovements: [],
    bankTransactions: [],
    bankReconciliations: []
  },
  auditLog: [],
  permissions: {
    role: 'Leitura',
    modules: []
  }
};

export type CreateIntent = {
  path: string;
  resource: CreateResource | '';
  version: number;
};

export type PageState = {
  key: PageLoaderKey;
  component: LazyPageComponent | undefined;
  loading: boolean;
  error: string;
};

export type SessionState = {
  ready: boolean;
  token: string;
  user: PublicUser | null;
  appContext: AppContext;
};

type InitialRouteState = {
  appContext: AppContext;
  path: string;
  showEntry: boolean;
};

export function createSessionStore(initialRoute?: InitialRouteState) {
  const currentPath = useSignal(initialRoute?.path ?? '/dashboard');
  const appContext = useSignal<AppContext>(initialRoute?.appContext ?? 'hq');
  const showEntry = useSignal(initialRoute?.showEntry ?? false);
  const autoBrowserSessionPending = useSignal(false);
  const apiStatus = useSignal<ApiStatus>('checking');
  const dashboard = useSignal(fallbackDashboard);
  const resources = useSignal(emptyResources);
  const error = useSignal('');
  const notice = useSignal('');
  const reportPreview = useSignal<ReportPreview | null>(null);
  const documentPreview = useSignal<DocumentPreview | null>(null);
  const isLoading = useSignal(false);
  const isSaving = useSignal(false);
  const isPreviewLoading = useSignal(false);
  const browserSessionProgress = useSignal(8);
  const condominiumShortcutArea = useSignal('');
  const initialSnapshots = buildWorkspaceSnapshots(emptyResources, fallbackDashboard);
  const pageCache = useSignal<any[]>(initialSnapshots.pages);
  const searchResultCache = useSignal<any[]>(initialSnapshots.searchResults);

  const session = useStore<SessionState>({
    ready: false,
    token: '',
    user: null,
    appContext: 'hq'
  });

  const createIntent = useStore<CreateIntent>({
    path: '',
    resource: '',
    version: 0
  });

  const pageState = useStore<PageState>({
    key: 'page-overview',
    component: undefined,
    loading: false,
    error: ''
  });

  return {
    // Signals
    currentPath,
    appContext,
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
    // Stores
    session,
    createIntent,
    pageState,
  };
}

export type SessionStore = ReturnType<typeof createSessionStore>;
