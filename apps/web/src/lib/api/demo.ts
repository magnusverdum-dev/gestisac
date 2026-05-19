import type {
  ApiStatus,
  PublicUser,
  DashboardMetric,
  DashboardModule,
  AlertItem,
  DashboardResponse,
  GlobalSearchResult,
  Condominium,
  CondominiumAddress,
  CondominiumStructure,
  CondominiumOperationalStatus,
  CondominiumBlock,
  CondominiumFloor,
  CondominiumZone,
  CondominiumEquipment,
  CondominiumContact,
  CondominiumManagedDocument,
  CondominiumMedia,
  CondominiumInternalNote,
  CondominiumHistoryEvent,
  CondominiumOnboardingDraft,
  CompletenessReport,
  CondominiumDetailResponse,
  ImportRowInput,
  ImportPreview,
  ImportReport,
  Building,
  Fraction,
  Resident,
  Ticket,
  Supplier,
  DocumentItem,
  DocumentPreview,
  DocumentTemplate,
  GenerateDocumentPayload,
  Report,
  ReportPreview,
  MaintenanceItem,
  Assembly,
  AccountingSummary,
  Quota,
  AccountingPayment,
  Debt,
  Receipt,
  Expense,
  ReserveFund,
  AccountingState,
  AuditLogEntry,
  PermissionsResponse,
  ResourceState,
  PaginatedResponse,
  LoginResponse,
  CreateResource,
  ResourceEndpoint
} from './types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/$/, '') ?? '';
const DEMO_STORE_KEY = 'gestisac.publicDemoStore.v1';
const DEMO_TOKEN = 'gestisac-demo-access-token';
const DEMO_REFRESH_TOKEN = 'gestisac-demo-refresh-token';

type DemoStore = Omit<ResourceState, 'permissions'> & {
  user: PublicUser;
  activeCondominium: string;
  permissions: PermissionsResponse;
};

export function canUseBrowserDemoApi(status = 0): boolean {
  return !API_BASE_URL && typeof window !== 'undefined' && (status === 0 || status >= 400);
}

export async function demoApiRequest<T>(
  path: string,
  options: {
    method?: string;
    token?: string;
    body?: BodyInit;
  } = {}
): Promise<T> {
  const method = options.method ?? 'GET';
  const store = readDemoStore();
  const url = new URL(path, 'https://gestisac.local');
  const pathname = url.pathname.replace(/^\/api\/?/, '');
  const body = parseJsonBody(options.body);

  if (pathname === 'health') {
    return { service: 'gestisac-web-demo', status: 'online' } as T;
  }

  if (pathname === 'auth/login' && method === 'POST') {
    const email = String(body.email ?? '').trim().toLowerCase();
    const password = String(body.password ?? '');
    if (email !== 'admin@gestisac.pt' || password !== 'Gestisac2026!') {
      throw new Error('Credenciais invalidas');
    }

    return buildDemoLogin(store) as T;
  }

  if (pathname === 'auth/refresh' && method === 'POST') {
    return buildDemoLogin(store) as T;
  }

  if (pathname === 'auth/logout' && method === 'POST') {
    return undefined as T;
  }

  if (!isDemoToken(options.token)) {
    throw new Error('Sessao demo expirada');
  }

  if (pathname === 'me') {
    return { user: store.user } as T;
  }

  if (pathname === 'dashboard') {
    return buildDemoDashboard(store) as T;
  }

  if (pathname === 'permissions') {
    return store.permissions as T;
  }

  if (pathname === 'active-condominium' && method === 'PUT') {
    const name = String(body.name ?? '').trim();
    if (!name) {
      throw new Error('Condominio obrigatorio');
    }

    store.activeCondominium = name;
    store.user.activeCondominium = name;
    saveDemoStore(store);
    return name as T;
  }

  if (pathname === 'accounting/summary') {
    return computeAccountingSummary(store) as T;
  }

  if (pathname === 'documents/templates') {
    return demoDocumentTemplates() as T;
  }

  if (pathname === 'documents/generate' && method === 'POST') {
    const document = createDemoGeneratedDocument(store, body);
    saveDemoStore(store);
    return document as T;
  }

  const reportPreviewMatch = pathname.match(/^reports\/([^/]+)\/preview$/);
  if (reportPreviewMatch) {
    return buildDemoReportPreview(store, reportPreviewMatch[1]) as T;
  }

  const documentPreviewMatch = pathname.match(/^documents\/([^/]+)\/preview$/);
  if (documentPreviewMatch) {
    return buildDemoDocumentPreview(store, documentPreviewMatch[1]) as T;
  }

  const collection = demoCollectionForPath(store, pathname);
  if (!collection) {
    throw new Error('Endpoint demo nao disponivel');
  }

  if (method === 'GET') {
    return paginateDemoCollection(collection.items, url) as T;
  }

  if (method === 'POST') {
    const created = { ...body, id: createDemoId(collection.name) };
    collection.items.unshift(created);
    appendDemoAudit(store, collection.name, 'Criado', String(created.id), demoTitleFor(created));
    saveDemoStore(store);
    return created as T;
  }

  const id = pathname.split('/').at(-1) ?? '';
  const index = collection.items.findIndex((item) => String(item.id) === id);
  if (index < 0) {
    throw new Error('Registo nao encontrado');
  }

  if (method === 'PUT') {
    const updated = { ...collection.items[index], ...body, id };
    collection.items[index] = updated;
    appendDemoAudit(store, collection.name, 'Atualizado', id, demoTitleFor(updated));
    saveDemoStore(store);
    return updated as T;
  }

  if (method === 'DELETE') {
    const [deleted] = collection.items.splice(index, 1);
    appendDemoAudit(store, collection.name, 'Apagado', id, demoTitleFor(deleted));
    saveDemoStore(store);
    return { deleted: true } as T;
  }

  throw new Error('Operacao demo nao suportada');
}

function readDemoStore(): DemoStore {
  const stored = localStorage.getItem(DEMO_STORE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored) as DemoStore;
    } catch {
      localStorage.removeItem(DEMO_STORE_KEY);
    }
  }

  const seeded = createDemoStore();
  saveDemoStore(seeded);
  return seeded;
}

function saveDemoStore(store: DemoStore): void {
  store.accounting.summary = computeAccountingSummary(store);
  localStorage.setItem(DEMO_STORE_KEY, JSON.stringify(store));
}

function parseJsonBody(body: BodyInit | undefined): Record<string, string | number> {
  if (typeof body !== 'string') {
    return {};
  }

  try {
    return JSON.parse(body) as Record<string, string | number>;
  } catch {
    return {};
  }
}

function isDemoToken(token: string | undefined): boolean {
  return token === DEMO_TOKEN || token === DEMO_REFRESH_TOKEN;
}

function buildDemoLogin(store: DemoStore): LoginResponse {
  return {
    token: DEMO_TOKEN,
    refreshToken: DEMO_REFRESH_TOKEN,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 8).toISOString(),
    user: store.user
  };
}

function createDemoStore(): DemoStore {
  const permissions: PermissionsResponse = {
    role: 'Administrador',
    modules: [
      'condominiums',
      'operations',
      'accounting',
      'reports',
      'documents',
      'settings'
    ].map((module) => ({
      module,
      canRead: true,
      canWrite: true,
      canDelete: true
    }))
  };

  const accounting: AccountingState = {
    summary: {
      currentBalance: 0,
      paidQuotaPercentage: 0,
      overdueAmount: 0,
      overdueCount: 0,
      monthlyExpenses: 0,
      reserveFund: 0,
      currency: 'EUR'
    },
    quotas: [
      {
        id: 'quota-001',
        condominium: 'Condominio Vila Verde',
        fraction: 'B-4',
        resident: 'Carlos Almeida',
        period: 'Maio 2026',
        amount: 95,
        dueDate: '2026-05-20',
        status: 'Em atraso'
      },
      {
        id: 'quota-002',
        condominium: 'Condominio Vila Verde',
        fraction: 'A-1',
        resident: 'Maria Fernandes',
        period: 'Maio 2026',
        amount: 85,
        dueDate: '2026-05-20',
        status: 'Paga'
      }
    ],
    payments: [
      {
        id: 'pay-001',
        condominium: 'Condominio Vila Verde',
        fraction: 'A-1',
        resident: 'Maria Fernandes',
        amount: 85,
        paidAt: '2026-05-14',
        method: 'Transferencia',
        status: 'Confirmado'
      }
    ],
    debts: [
      {
        id: 'debt-001',
        condominium: 'Condominio Vila Verde',
        fraction: 'B-4',
        resident: 'Carlos Almeida',
        amount: 95,
        dueDate: '2026-05-20',
        daysOverdue: 5,
        status: 'Em atraso'
      }
    ],
    receipts: [
      {
        id: 'receipt-001',
        number: 'REC-2026-001',
        condominium: 'Condominio Vila Verde',
        resident: 'Maria Fernandes',
        amount: 85,
        issuedAt: '2026-05-14',
        status: 'Emitido'
      }
    ],
    expenses: [
      {
        id: 'exp-001',
        condominium: 'Condominio Vila Verde',
        category: 'Imposto municipal',
        supplier: 'Autoridade Tributaria',
        amount: 1840,
        dueDate: '2026-05-20',
        status: 'A vencer'
      },
      {
        id: 'exp-002',
        condominium: 'Condominio Vila Verde',
        category: 'Manutencao elevador',
        supplier: 'Elevatec Lisboa',
        amount: 420,
        dueDate: '2026-05-18',
        status: 'Pendente'
      }
    ],
    reserveFunds: [
      {
        id: 'reserve-001',
        condominium: 'Condominio Vila Verde',
        balance: 2350,
        monthlyChange: 120,
        status: 'Saudavel'
      }
    ]
  };

  return {
    user: {
      id: 'user-admin',
      tenantId: 'tenant-gestisac',
      name: 'Joao Silva',
      email: 'admin@gestisac.pt',
      role: 'Administrador',
      activeCondominium: 'Condominio Vila Verde',
      activeCondominiums: 2
    },
    activeCondominium: 'Condominio Vila Verde',
    condominiums: [
      {
        id: 'cond-001',
        name: 'Condominio Vila Verde',
        location: 'Lisboa',
        buildings: 2,
        fractions: 48,
        residents: 92,
        status: 'Operacional',
        notice: 'Avaria no elevador do Bloco B em acompanhamento'
      },
      {
        id: 'cond-002',
        name: 'Condominio Atlantico',
        location: 'Cascais',
        buildings: 1,
        fractions: 24,
        residents: 44,
        status: 'Estavel',
        notice: 'Sem avisos criticos'
      }
    ],
    buildings: [
      {
        id: 'building-001',
        condominium: 'Condominio Vila Verde',
        name: 'Bloco A',
        floors: 8,
        fractions: 24,
        status: 'Operacional'
      },
      {
        id: 'building-002',
        condominium: 'Condominio Vila Verde',
        name: 'Bloco B',
        floors: 8,
        fractions: 24,
        status: 'Elevador em reparacao'
      }
    ],
    fractions: [
      {
        id: 'fraction-001',
        condominium: 'Condominio Vila Verde',
        building: 'Bloco A',
        number: 'A-1',
        floor: '1',
        typology: 'T2',
        owner: 'Maria Fernandes',
        status: 'Regularizada'
      },
      {
        id: 'fraction-002',
        condominium: 'Condominio Vila Verde',
        building: 'Bloco B',
        number: 'B-4',
        floor: '4',
        typology: 'T3',
        owner: 'Carlos Almeida',
        status: 'Quota em atraso'
      }
    ],
    residents: [
      {
        id: 'resident-001',
        name: 'Maria Fernandes',
        email: 'maria.fernandes@example.pt',
        phone: '+351 910 000 001',
        condominium: 'Condominio Vila Verde',
        fraction: 'A-1',
        status: 'Proprietaria'
      },
      {
        id: 'resident-002',
        name: 'Carlos Almeida',
        email: 'carlos.almeida@example.pt',
        phone: '+351 910 000 002',
        condominium: 'Condominio Vila Verde',
        fraction: 'B-4',
        status: 'Proprietario'
      }
    ],
    tickets: [
      {
        id: 'ticket-001',
        title: 'Avaria no elevador do Bloco B',
        condominium: 'Condominio Vila Verde',
        priority: 'Critico',
        status: 'Fornecedor contactado',
        detail: 'Elevador parado desde as 08:20. Tecnico agendado para hoje.',
        updatedAt: '2026-05-15 10:30'
      },
      {
        id: 'ticket-002',
        title: 'Infiltracao na garagem',
        condominium: 'Condominio Vila Verde',
        priority: 'Importante',
        status: 'Em analise',
        detail: 'Pedido de vistoria aberto para a garagem -1.',
        updatedAt: '2026-05-14 16:10'
      }
    ],
    suppliers: [
      {
        id: 'supplier-001',
        name: 'Elevatec Lisboa',
        category: 'Elevadores',
        status: 'Ativo',
        contact: 'assistencia@elevatec.pt'
      },
      {
        id: 'supplier-002',
        name: 'Limpezas Central',
        category: 'Limpeza',
        status: 'Ativo',
        contact: 'geral@limpezascentral.pt'
      }
    ],
    documents: [
      {
        id: 'doc-001',
        title: 'Seguro multirriscos 2026',
        type: 'Seguro',
        condominium: 'Condominio Vila Verde',
        status: 'A expirar',
        fileName: 'seguro-multirriscos-2026.txt',
        mimeType: 'text/plain',
        sizeBytes: 1200,
        storageKey: 'demo/seguro-multirriscos-2026.txt',
        uploadedAt: '2026-05-15T09:30:00.000Z'
      }
    ],
    reports: [
      {
        id: 'report-001',
        title: 'Relatorio financeiro mensal',
        period: 'Maio 2026',
        status: 'Pronto para exportar'
      }
    ],
    maintenance: [
      {
        id: 'maint-001',
        title: 'Reparacao do elevador Bloco B',
        supplier: 'Elevatec Lisboa',
        status: 'Urgente',
        date: '2026-05-15'
      }
    ],
    assemblies: [
      {
        id: 'assembly-001',
        title: 'Assembleia ordinaria',
        condominium: 'Condominio Vila Verde',
        date: '2026-05-24 19:00',
        status: 'Convocatoria enviada'
      }
    ],
    accounting,
    auditLog: [
      {
        id: 'audit-001',
        userId: 'user-admin',
        userName: 'Joao Silva',
        module: 'Sistema',
        action: 'Sessao demo preparada',
        recordId: 'demo',
        summary: 'Dados locais carregados para a apresentacao publica',
        createdAt: new Date().toISOString()
      }
    ],
    permissions
  };
}

function demoCollectionForPath(
  store: DemoStore,
  pathname: string
): { name: string; items: Array<Record<string, unknown>> } | null {
  const collections: Record<string, Array<Record<string, unknown>>> = {
    condominiums: store.condominiums as unknown as Array<Record<string, unknown>>,
    buildings: store.buildings as unknown as Array<Record<string, unknown>>,
    fractions: store.fractions as unknown as Array<Record<string, unknown>>,
    residents: store.residents as unknown as Array<Record<string, unknown>>,
    tickets: store.tickets as unknown as Array<Record<string, unknown>>,
    suppliers: store.suppliers as unknown as Array<Record<string, unknown>>,
    documents: store.documents as unknown as Array<Record<string, unknown>>,
    reports: store.reports as unknown as Array<Record<string, unknown>>,
    maintenance: store.maintenance as unknown as Array<Record<string, unknown>>,
    assemblies: store.assemblies as unknown as Array<Record<string, unknown>>,
    'audit-log': store.auditLog as unknown as Array<Record<string, unknown>>,
    'accounting/quotas': store.accounting.quotas as unknown as Array<Record<string, unknown>>,
    'accounting/payments': store.accounting.payments as unknown as Array<Record<string, unknown>>,
    'accounting/debts': store.accounting.debts as unknown as Array<Record<string, unknown>>,
    'accounting/receipts': store.accounting.receipts as unknown as Array<Record<string, unknown>>,
    'accounting/expenses': store.accounting.expenses as unknown as Array<Record<string, unknown>>,
    'accounting/reserve-funds': store.accounting.reserveFunds as unknown as Array<Record<string, unknown>>
  };

  const cleaned = collections[pathname]
    ? pathname
    : pathname.replace(/\/[^/]+$/, '');
  const items = collections[cleaned];
  return items ? { name: cleaned, items } : null;
}

function paginateDemoCollection<T>(items: T[], url: URL): PaginatedResponse<T> {
  const page = Number(url.searchParams.get('page') ?? '1');
  const pageSize = Number(url.searchParams.get('pageSize') ?? '50');
  const search = String(url.searchParams.get('search') ?? '').trim().toLowerCase();
  const filtered = search
    ? items.filter((item) => JSON.stringify(item).toLowerCase().includes(search))
    : items;
  const start = Math.max(0, (page - 1) * pageSize);

  return {
    items: filtered.slice(start, start + pageSize),
    page,
    pageSize,
    total: filtered.length,
    totalPages: Math.max(1, Math.ceil(filtered.length / pageSize))
  };
}

function computeAccountingSummary(store: Pick<DemoStore, 'accounting'>): AccountingSummary {
  const paidQuotas = store.accounting.quotas.filter((item) => isPaidDemoStatus(item.status));
  const overdueDebts = store.accounting.debts.filter((item) => !isPaidDemoStatus(item.status));
  const pendingExpenses = store.accounting.expenses.filter((item) => !isPaidDemoStatus(item.status));
  const paymentsTotal = store.accounting.payments.reduce((total, item) => total + Number(item.amount || 0), 0);
  const expensesTotal = store.accounting.expenses.reduce((total, item) => total + Number(item.amount || 0), 0);
  const reserveFund = store.accounting.reserveFunds.reduce((total, item) => total + Number(item.balance || 0), 0);
  const quotaCount = Math.max(1, store.accounting.quotas.length);

  return {
    currentBalance: paymentsTotal + reserveFund - expensesTotal,
    paidQuotaPercentage: Math.round((paidQuotas.length / quotaCount) * 100),
    overdueAmount: overdueDebts.reduce((total, item) => total + Number(item.amount || 0), 0),
    overdueCount: overdueDebts.length,
    monthlyExpenses: pendingExpenses.reduce((total, item) => total + Number(item.amount || 0), 0),
    reserveFund,
    currency: 'EUR'
  };
}

function buildDemoDashboard(store: DemoStore): DashboardResponse {
  const summary = computeAccountingSummary(store);
  const urgentTicket = store.tickets.find((item) => isCriticalDemoStatus(item.priority));
  const expiringDocument = store.documents.find((item) => item.status.toLowerCase().includes('expirar'));
  const urgentTitle = urgentTicket?.title ?? expiringDocument?.title ?? 'Operacao sem alertas criticos';
  const urgentDetail = urgentTicket?.detail ?? expiringDocument?.status ?? 'Nao existem avisos urgentes neste momento.';

  return {
    user: {
      ...store.user,
      activeCondominium: store.activeCondominium,
      activeCondominiums: store.condominiums.length
    },
    activeCondominium: store.activeCondominium,
    urgentNotice: {
      type: urgentTicket ? 'maintenance' : 'documents',
      title: urgentTitle,
      detail: urgentDetail,
      priority: urgentTicket ? 'urgent' : 'warning'
    },
    operationalSummary: [
      { label: `${store.condominiums.length} condominios ativos`, tone: 'blue' },
      { label: `${summary.overdueCount} dividas em aberto`, tone: summary.overdueCount ? 'danger' : 'green' },
      { label: `${store.tickets.length} tickets registados`, tone: 'gold' }
    ],
    quickActions: [
      { title: 'Novo Ticket', description: 'Abrir ocorrencia', icon: '+', tone: 'blue' },
      { title: 'Emitir Recibo', description: 'Gerar recibo', icon: 'EUR', tone: 'green' },
      { title: 'Novo Condominio', description: 'Adicionar predio', icon: 'B', tone: 'purple' },
      { title: 'Gerar Relatorio', description: 'Exportar dados', icon: 'R', tone: 'gold' }
    ],
    dashboardModules: [
      {
        id: 'condominiums',
        title: 'Condominios',
        subtitle: 'Predios, fracoes e moradores',
        tone: 'blue',
        cta: 'Ver condominios',
        path: '/condominios',
        visual: 'building',
        metrics: [
          { value: String(store.condominiums.length), label: 'Condominios' },
          { value: String(store.fractions.length), label: 'Fracoes' },
          { value: String(store.residents.length), label: 'Condominos' },
          { value: String(store.tickets.length), label: 'Alertas', status: 'warning' }
        ]
      },
      {
        id: 'accounting',
        title: 'Contabilidade',
        subtitle: 'Quotas, despesas e fundo de reserva',
        tone: 'green',
        cta: 'Abrir contabilidade',
        path: '/contabilidade',
        visual: 'wallet',
        metrics: [
          { value: formatDemoCurrency(summary.currentBalance), label: 'Saldo atual' },
          { value: `${summary.paidQuotaPercentage}%`, label: 'Quotas pagas', status: 'success' },
          { value: String(summary.overdueCount), label: 'Em atraso', status: summary.overdueCount ? 'urgent' : 'success' },
          { value: formatDemoCurrency(summary.monthlyExpenses), label: 'Despesas' }
        ]
      },
      {
        id: 'administration',
        title: 'Administracao',
        subtitle: 'Tickets, manutencao e fornecedores',
        tone: 'purple',
        cta: 'Gerir administracao',
        path: '/administracao',
        visual: 'tools',
        metrics: [
          { value: String(store.tickets.length), label: 'Tickets' },
          { value: String(store.maintenance.length), label: 'Manutencoes' },
          { value: String(store.suppliers.length), label: 'Fornecedores' },
          { value: String(store.assemblies.length), label: 'Assembleias' }
        ]
      },
      {
        id: 'reports',
        title: 'Relatorios',
        subtitle: 'Documentos, atas e analytics',
        tone: 'gold',
        cta: 'Gerar relatorio',
        path: '/relatorios',
        visual: 'chart',
        metrics: [
          { value: String(store.reports.length), label: 'Relatorios' },
          { value: String(store.documents.length), label: 'Documentos' },
          { value: String(store.assemblies.length), label: 'Atas' },
          { value: '0', label: 'Pendentes', status: 'success' }
        ]
      }
    ],
    alerts: [
      {
        type: 'finance',
        title: 'Imposto municipal a vencer',
        detail: 'Pagamento de 1.840 EUR vence em 20/05/2026',
        tone: 'danger',
        icon: 'EUR'
      },
      {
        type: 'maintenance',
        title: urgentTitle,
        detail: urgentDetail,
        tone: urgentTicket ? 'danger' : 'warning',
        icon: '!'
      },
      {
        type: 'assembly',
        title: 'Assembleia agendada',
        detail: '24/05/2026 as 19:00 - Condominio Vila Verde',
        tone: 'blue',
        icon: 'M'
      }
    ]
  };
}

function createDemoId(prefix: string): string {
  const safePrefix = prefix.replaceAll('/', '-');
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${safePrefix}-${crypto.randomUUID().slice(0, 8)}`;
  }

  return `${safePrefix}-${Date.now().toString(36)}`;
}

function demoTitleFor(record: Record<string, unknown>): string {
  return String(record.title ?? record.name ?? record.number ?? record.id ?? 'Registo');
}

function appendDemoAudit(
  store: DemoStore,
  module: string,
  action: string,
  recordId: string,
  summary: string
): void {
  store.auditLog.unshift({
    id: createDemoId('audit'),
    userId: store.user.id,
    userName: store.user.name,
    module,
    action,
    recordId,
    summary,
    createdAt: new Date().toISOString()
  });
}

export async function demoUploadDocument(payload: FormData): Promise<DocumentItem> {
  const store = readDemoStore();
  const file = payload.get('file');
  const uploadedFile = file instanceof File ? file : null;
  const title = String(payload.get('title') || uploadedFile?.name || 'Documento carregado');
  const document: DocumentItem = {
    id: createDemoId('doc'),
    title,
    type: String(payload.get('type') || 'Documento'),
    condominium: String(payload.get('condominium') || store.activeCondominium),
    status: String(payload.get('status') || 'Arquivado'),
    fileName: uploadedFile?.name ?? `${slugifyDemo(title)}.txt`,
    mimeType: uploadedFile?.type || 'text/plain',
    sizeBytes: uploadedFile?.size ?? 1024,
    storageKey: `demo/${slugifyDemo(title)}.txt`,
    uploadedAt: new Date().toISOString()
  };

  store.documents.unshift(document);
  appendDemoAudit(store, 'documents', 'Carregado', document.id, document.title);
  saveDemoStore(store);
  return document;
}

function createDemoGeneratedDocument(
  store: DemoStore,
  payload: Record<string, string | number>
): DocumentItem {
  const template = String(payload.template || 'documento');
  const templateLabel = demoDocumentTemplates().find((item) => item.id === template)?.label ?? 'Documento gerado';
  const title = `${templateLabel} - ${payload.condominium || store.activeCondominium}`;
  const document: DocumentItem = {
    id: createDemoId('doc'),
    title,
    type: templateLabel,
    condominium: String(payload.condominium || store.activeCondominium),
    status: 'Gerado',
    fileName: `${slugifyDemo(title)}.txt`,
    mimeType: 'text/plain',
    sizeBytes: 2048,
    storageKey: `demo/${slugifyDemo(title)}.txt`,
    uploadedAt: new Date().toISOString()
  };

  store.documents.unshift(document);
  appendDemoAudit(store, 'documents', 'Gerado', document.id, document.title);
  return document;
}

function buildDemoDocumentPreview(store: DemoStore, id: string): DocumentPreview {
  const document = store.documents.find((item) => item.id === id);
  if (!document) {
    throw new Error('Documento nao encontrado');
  }

  return {
    document,
    previewType: 'text',
    content: demoDocumentContent(store, document),
    downloadUrl: `/api/documents/${id}/download`
  };
}

function demoDocumentContent(store: DemoStore, document: DocumentItem): string {
  return [
    'GESTISAC - Gestao de Condominios',
    '',
    document.title,
    `Condominio: ${document.condominium || store.activeCondominium}`,
    `Tipo: ${document.type}`,
    `Estado: ${document.status}`,
    '',
    'Este documento foi preparado automaticamente com base nos dados registados na plataforma.',
    `Gerado em: ${new Date().toLocaleString('pt-PT')}`
  ].join('\n');
}

export function demoDownloadDocument(id: string): { blob: Blob; filename: string } {
  const store = readDemoStore();
  const document = store.documents.find((item) => item.id === id);
  if (!document) {
    throw new Error('Documento nao encontrado');
  }

  return {
    blob: new Blob([demoDocumentContent(store, document)], { type: 'text/plain;charset=utf-8' }),
    filename: document.fileName || `${slugifyDemo(document.title)}.txt`
  };
}

function buildDemoReportPreview(store: DemoStore, id: string): ReportPreview {
  const report = store.reports.find((item) => item.id === id);
  if (!report) {
    throw new Error('Relatorio nao encontrado');
  }

  const summary = computeAccountingSummary(store);
  return {
    report,
    generatedAt: new Date().toISOString(),
    activeCondominium: store.activeCondominium,
    kpis: [
      {
        label: 'Saldo atual',
        value: formatDemoCurrency(summary.currentBalance),
        detail: 'Saldo calculado a partir de pagamentos, despesas e fundo de reserva.',
        tone: 'green'
      },
      {
        label: 'Divida ativa',
        value: formatDemoCurrency(summary.overdueAmount),
        detail: `${summary.overdueCount} registos em aberto.`,
        tone: summary.overdueCount ? 'danger' : 'green'
      },
      {
        label: 'Quotas pagas',
        value: `${summary.paidQuotaPercentage}%`,
        detail: 'Percentagem de quotas regularizadas.',
        tone: 'blue'
      }
    ],
    sections: [
      {
        title: 'Operacao',
        rows: [
          { label: 'Tickets', value: String(store.tickets.length), detail: 'Ocorrencias registadas' },
          { label: 'Manutencao', value: String(store.maintenance.length), detail: 'Intervencoes planeadas' },
          { label: 'Documentos', value: String(store.documents.length), detail: 'Arquivo disponivel' }
        ]
      },
      {
        title: 'Contabilidade',
        rows: [
          { label: 'Despesas pendentes', value: formatDemoCurrency(summary.monthlyExpenses), detail: 'A vencer ou em curso' },
          { label: 'Fundo de reserva', value: formatDemoCurrency(summary.reserveFund), detail: 'Saldo de reserva registado' }
        ]
      }
    ],
    recommendedActions: [
      'Regularizar quotas em atraso antes da proxima assembleia.',
      'Confirmar reparacao do elevador do Bloco B.',
      'Renovar seguro multirriscos antes da data limite.'
    ]
  };
}

export function demoExportReport(id: string): { blob: Blob; filename: string } {
  const store = readDemoStore();
  const preview = buildDemoReportPreview(store, id);
  const rows = [
    ['Indicador', 'Valor', 'Detalhe'],
    ...preview.kpis.map((item) => [item.label, item.value, item.detail])
  ];
  const csv = rows.map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(',')).join('\n');

  return {
    blob: new Blob([csv], { type: 'text/csv;charset=utf-8' }),
    filename: `${slugifyDemo(preview.report.title)}.csv`
  };
}

function demoDocumentTemplates(): DocumentTemplate[] {
  return [
    {
      id: 'assembly-notice',
      label: 'Convocatoria de assembleia',
      category: 'Assembleias',
      description: 'Convocar condominos com data, local e ordem de trabalhos.',
      output: 'PDF/TXT',
      dataSources: ['Condominio', 'Assembleias', 'Documentos']
    },
    {
      id: 'accounts-statement',
      label: 'Prestacao de contas',
      category: 'Contabilidade',
      description: 'Resumo financeiro com saldo, despesas, dividas e fundo de reserva.',
      output: 'PDF/TXT',
      dataSources: ['Quotas', 'Pagamentos', 'Despesas']
    },
    {
      id: 'debt-notice',
      label: 'Aviso de quota em atraso',
      category: 'Cobranca',
      description: 'Carta de cobranca amigavel por condomino ou fracao.',
      output: 'PDF/TXT',
      dataSources: ['Dividas', 'Quotas', 'Condominos']
    },
    {
      id: 'maintenance-notice',
      label: 'Aviso de manutencao ou avaria',
      category: 'Operacao',
      description: 'Comunicacao aos moradores sobre avarias, obras ou manutencoes.',
      output: 'PDF/TXT',
      dataSources: ['Tickets', 'Manutencao']
    }
  ];
}

function isCriticalDemoStatus(value: string): boolean {
  const normalized = value.toLowerCase();
  return normalized.includes('crit') || normalized.includes('urgente');
}

function isPaidDemoStatus(value: string): boolean {
  const normalized = value.toLowerCase();
  return normalized.includes('paga') || normalized.includes('regularizada') || normalized.includes('confirmado');
}

function formatDemoCurrency(value: number): string {
  return `${value.toLocaleString('pt-PT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })} EUR`;
}

function slugifyDemo(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}
