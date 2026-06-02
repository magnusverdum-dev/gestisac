import type {
  ApiStatus,
  ChatMessage,
  PublicUser,
  DashboardMetric,
  DashboardModule,
  AlertItem,
  DashboardResponse,
  GlobalSearchResult,
  CalendarEvent,
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
  InspectionItem,
  MaintenanceItem,
  Ocorrencia,
  OcorrenciaComentario,
  OcorrenciaDetalhe,
  OcorrenciasMetricas,
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
  PaginatedOcorrencias,
  PaginatedResponse,
  LoginResponse,
  CreateResource,
  ResourceEndpoint,
  WorkerChecklistItem
} from './types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/$/, '') ?? '';
const DEMO_STORE_KEY = 'gestisac.publicDemoStore.v1';
const DEMO_TOKEN = 'gestisac-demo-access-token';
const DEMO_REFRESH_TOKEN = 'gestisac-demo-refresh-token';

type DemoStore = Omit<ResourceState, 'permissions'> & {
  user: PublicUser;
  activeCondominium: string;
  permissions: PermissionsResponse;
  chatMessages: ChatMessage[];
};

export function canUseBrowserDemoApi(status = 0): boolean {
  if (API_BASE_URL || typeof window === 'undefined') {
    return false;
  }

  return status === 0 || status === 404 || status === 405 || status >= 500;
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

    return buildDemoLogin(store, body.appContext) as T;
  }

  if (pathname === 'auth/refresh' && method === 'POST') {
    return buildDemoLogin(store, body.appContext) as T;
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

  if (pathname === 'chat/messages' && method === 'GET') {
    return store.chatMessages as T;
  }

  if (pathname === 'chat/messages' && method === 'POST') {
    const text = String(body.text ?? '').trim();
    if (!text) {
      throw new Error('Mensagem vazia');
    }
    const message: ChatMessage = {
      id: createDemoId('chat'),
      text,
      senderName: store.user.name,
      senderRole: store.user.role,
      sourceApp: normalizeDemoAppContext(body.appContext),
      createdAt: new Date().toISOString()
    };
    store.chatMessages.push(message);
    if (store.chatMessages.length > 500) {
      store.chatMessages.splice(0, store.chatMessages.length - 500);
    }
    saveDemoStore(store);
    return message as T;
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

  if (pathname === 'accounting/overview') {
    return store.accounting.overview as T;
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

  const ocorrenciaResponse = handleDemoOcorrencias(store, pathname, method, body, url);
  if (ocorrenciaResponse.handled) {
    return ocorrenciaResponse.value as T;
  }

  const inspectionResponse = handleDemoInspections(store, pathname, method, body, url);
  if (inspectionResponse.handled) {
    return inspectionResponse.value as T;
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
      const parsed = JSON.parse(stored) as DemoStore;
      return ensureDemoStoreDefaults(parsed);
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

function ensureDemoStoreDefaults(store: DemoStore): DemoStore {
  if (!Array.isArray(store.chatMessages)) {
    store.chatMessages = [];
  }

  if (!Array.isArray(store.calendarEvents)) {
    store.calendarEvents = demoCalendarEvents();
  }

  if (!Array.isArray(store.ocorrencias) || store.ocorrencias.length === 0) {
    store.ocorrencias = demoOcorrencias();
  }

  store.tickets = store.tickets.map((ticket) => ({
    ...ticket,
    priority: ticket.priority || 'Normal',
    status: ticket.status || 'Aberto',
    requesterName: ticket.requesterName || '',
    requesterEmail: ticket.requesterEmail || '',
    channel: ticket.channel || 'Portal',
    type: ticket.type || 'Pedido',
    category: ticket.category || 'Operacional',
    assignee: ticket.assignee || '',
    dueAt: ticket.dueAt || '',
    createdAt: ticket.createdAt || ticket.updatedAt || new Date().toISOString(),
    resolvedAt: ticket.resolvedAt || '',
    tags: ticket.tags || [],
    linkedMaintenanceId: ticket.linkedMaintenanceId || '',
    linkedCalendarEventId: ticket.linkedCalendarEventId || ''
  }));

  store.maintenance = store.maintenance.map((item) => ({
    ...item,
    condominium: item.condominium || store.activeCondominium,
    type: item.type || 'Preventiva',
    priority: item.priority || 'Normal',
    scheduledStart: item.scheduledStart || '',
    scheduledEnd: item.scheduledEnd || '',
    completedAt: item.completedAt || '',
    costEstimate: item.costEstimate || '',
    notes: item.notes || '',
    equipmentId: item.equipmentId || '',
    zoneId: item.zoneId || '',
    ticketId: item.ticketId || '',
    calendarEventId: item.calendarEventId || ''
  }));

  if (!Array.isArray(store.inspections) || store.inspections.length === 0) {
    store.inspections = demoInspections(store.activeCondominium);
  }
  for (let index = 0; index < store.inspections.length; index += 1) {
    const normalized = normalizeInspectionRecord(store.inspections[index] as InspectionItem);
    syncInspectionCalendarEvent(store, normalized);
    store.inspections[index] = normalized;
  }

  return store;
}

function parseJsonBody(body: BodyInit | undefined): Record<string, unknown> {
  if (typeof body !== 'string') {
    return {};
  }

  try {
    return JSON.parse(body) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function isDemoToken(token: string | undefined): boolean {
  return token === DEMO_TOKEN || token === DEMO_REFRESH_TOKEN;
}

function buildDemoLogin(store: DemoStore, appContext: unknown = 'hq'): LoginResponse {
  return {
    token: DEMO_TOKEN,
    refreshToken: DEMO_REFRESH_TOKEN,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 8).toISOString(),
    user: store.user,
    appContext: normalizeDemoAppContext(appContext)
  };
}

function normalizeDemoAppContext(value: unknown): LoginResponse['appContext'] {
  return value === 'worker' || value === 'client' ? value : 'hq';
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
    overview: {
      quotasToValidate: 1,
      unreconciledMovements: 1,
      oldestUnreconciledAgeDays: 2,
      receiptsToIssue: 0,
      debtsInFollowUp: 1,
      overdueDebtSeverity: 'normal',
      activePaymentAgreements: 1,
      brokenPaymentAgreements: 0,
      reserveFundStatus: 'conforme'
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
    ],
    paymentAgreements: [
      {
        id: 'agreement-001',
        condominium: 'Condominio Vila Verde',
        fraction: 'B-4',
        resident: 'Carlos Almeida',
        debtId: 'debt-001',
        totalAmount: 95,
        installmentCount: 2,
        installmentAmount: 47.5,
        nextDueDate: '2026-06-08',
        status: 'Ativo',
        notes: 'Plano simples para regularizar quota em atraso.',
        installments: [
          { installmentNumber: 1, dueDate: '2026-06-08', amount: 47.5, status: 'Pendente' },
          { installmentNumber: 2, dueDate: '2026-07-08', amount: 47.5, status: 'Pendente' }
        ]
      }
    ],
    cashMovements: [
      {
        id: 'cash-001',
        condominium: 'Condominio Vila Verde',
        movementType: 'entrada',
        accountType: 'caixa',
        amount: 85,
        occurredAt: '2026-05-14',
        source: 'Quota A-1',
        method: 'Transferencia',
        reference: 'REC-2026-001',
        status: 'Confirmado'
      }
    ],
    bankTransactions: [
      {
        id: 'bank-001',
        condominium: 'Condominio Vila Verde',
        occurredAt: '2026-05-14',
        description: 'TRF Maria Fernandes A-1',
        amount: 85,
        direction: 'entrada',
        reference: 'A-1 Maio',
        reconciliationStatus: 'reconciliado'
      },
      {
        id: 'bank-002',
        condominium: 'Condominio Vila Verde',
        occurredAt: '2026-05-18',
        description: 'TRF Carlos Almeida B-4',
        amount: 47.5,
        direction: 'entrada',
        reference: 'B-4 acordo',
        reconciliationStatus: 'por reconciliar'
      }
    ],
    bankReconciliations: []
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
        priority: 'Urgente',
        status: 'Em curso',
        detail: 'Elevador parado desde as 08:20. Tecnico agendado para hoje.',
        requesterName: 'Carlos Almeida',
        requesterEmail: 'carlos.almeida@example.pt',
        channel: 'Portal',
        type: 'Avaria',
        category: 'Elevadores',
        assignee: 'Joao Silva',
        dueAt: '2026-05-22T18:00',
        createdAt: '2026-05-15T08:20:00.000Z',
        resolvedAt: '',
        tags: ['elevador', 'bloco-b', 'urgente'],
        linkedMaintenanceId: 'maint-001',
        linkedCalendarEventId: 'cal-001',
        updatedAt: '2026-05-15 10:30'
      },
      {
        id: 'ticket-002',
        title: 'Infiltracao na garagem',
        condominium: 'Condominio Vila Verde',
        priority: 'Alta',
        status: 'Pendente',
        detail: 'Pedido de vistoria aberto para a garagem -1.',
        requesterName: 'Maria Fernandes',
        requesterEmail: 'maria.fernandes@example.pt',
        channel: 'Email',
        type: 'Pedido',
        category: 'Infiltracoes',
        assignee: 'Equipa tecnica',
        dueAt: '2026-05-25T17:30',
        createdAt: '2026-05-14T16:10:00.000Z',
        resolvedAt: '',
        tags: ['garagem', 'vistoria'],
        linkedMaintenanceId: '',
        linkedCalendarEventId: 'cal-003',
        updatedAt: '2026-05-14 16:10'
      }
    ],
    ocorrencias: demoOcorrencias(),
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
        condominium: 'Condominio Vila Verde',
        supplier: 'Elevatec Lisboa',
        status: 'Agendada',
        date: '2026-05-24',
        equipmentId: 'elevador-bloco-b',
        zoneId: 'bloco-b',
        ticketId: 'ticket-001',
        calendarEventId: 'cal-001',
        type: 'Corretiva',
        priority: 'Urgente',
        scheduledStart: '2026-05-24T10:00',
        scheduledEnd: '2026-05-24T11:00',
        completedAt: '',
        costEstimate: '420.00',
        notes: 'Verificar quadro de comando e preparar aviso aos moradores.'
      }
    ],
    chatMessages: [],
    inspections: demoInspections('Condominio Vila Verde'),
    calendarEvents: demoCalendarEvents(),
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

function demoCalendarEvents(): CalendarEvent[] {
  const now = new Date().toISOString();

  return [
    {
      id: 'cal-001',
      title: 'Vistoria aos elevadores',
      description: 'Verificacao tecnica do elevador do Bloco B.',
      eventType: 'Vistoria',
      status: 'Agendado',
      startAt: '2026-05-24T10:00',
      endAt: '2026-05-24T11:00',
      condominium: 'Condominio Vila Verde',
      linkedEntityType: 'maintenance',
      linkedEntityId: 'maint-001',
      attendees: ['assistencia@elevatec.pt', 'administracao@gestisac.pt'],
      location: 'Bloco B',
      notes: 'Confirmar acesso tecnico antes da chegada da equipa.',
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'cal-002',
      title: 'Reuniao de administracao',
      description: 'Resumo de quotas, tickets e manutencao semanal.',
      eventType: 'Reuniao',
      status: 'Planeado',
      startAt: '2026-05-24T19:00',
      endAt: '2026-05-24T20:00',
      condominium: 'Condominio Vila Verde',
      linkedEntityType: 'assembly',
      linkedEntityId: 'assembly-001',
      attendees: ['administracao@gestisac.pt'],
      location: 'Sala do condominio',
      notes: 'Levar mapa de dividas e ocorrencias em aberto.',
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'cal-003',
      title: 'Email aos moradores',
      description: 'Aviso planeado sobre a vistoria e acesso a garagem.',
      eventType: 'Email',
      status: 'Rascunho',
      startAt: '2026-05-23T09:30',
      endAt: '2026-05-23T09:45',
      condominium: 'Condominio Vila Verde',
      linkedEntityType: 'ticket',
      linkedEntityId: 'ticket-002',
      attendees: ['moradores@vilaverde.example.pt'],
      location: 'Email planeado',
      notes: 'Sem envio real nesta fase. Apenas planeamento/registo.',
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'cal-004',
      title: 'Limpeza tecnica',
      description: 'Plano preventivo mensal em areas comuns.',
      eventType: 'Manutencao',
      status: 'Planeado',
      startAt: '2026-05-27T08:30',
      endAt: '2026-05-27T10:30',
      condominium: 'Condominio Atlantico',
      linkedEntityType: 'maintenance',
      linkedEntityId: '',
      attendees: ['geral@limpezascentral.pt'],
      location: 'Areas comuns',
      notes: 'Confirmar fornecedor 24h antes.',
      createdAt: now,
      updatedAt: now
    }
  ];
}

function demoInspections(condominium: string): InspectionItem[] {
  return [
    {
      id: 'inspection-001',
      title: 'Vistoria anual aos extintores',
      condominium,
      location: 'Garagens e patamares',
      requiredDate: '2026-06-03',
      status: 'Planeada',
      result: 'Pendente',
      checklist: [
        'Validar pressao dos extintores',
        'Confirmar sinaletica visivel',
        'Registar extintores fora de prazo'
      ],
      workerNotes: '',
      hqNotes: '',
      submittedAt: '',
      confirmedAt: '',
      confirmedBy: '',
      calendarEventId: '',
      assignedWorkerId: 'worker-demo-1'
    },
    {
      id: 'inspection-002',
      title: 'Vistoria tecnica ao elevador Bloco B',
      condominium,
      location: 'Casa das maquinas',
      requiredDate: '2026-06-05',
      status: 'Submetida',
      result: 'A rever HQ',
      checklist: [
        'Testar paragem de emergencia',
        'Verificar alarmes e comunicacao',
        'Inspecionar ruido e vibracao'
      ],
      workerNotes: 'Ligacao de alarme intermitente exige validacao HQ.',
      hqNotes: '',
      submittedAt: '2026-05-28T09:15:00Z',
      confirmedAt: '',
      confirmedBy: '',
      calendarEventId: '',
      assignedWorkerId: 'worker-demo-1'
    }
  ];
}

function demoOcorrencias(): Ocorrencia[] {
  return [
    {
      id: 'ocorr-demo-001',
      titulo: 'Avaria no elevador do Bloco B',
      tipo: 'avaria',
      status: 'emCurso',
      prioridade: 'urgente',
      impacto: 'alto',
      urgencia: 'imediata',
      descricao: 'Elevador parado desde as 08:20. Tecnico agendado para hoje.',
      condominiumId: 'cond-001',
      requisitanteNome: 'Carlos Almeida',
      requisitanteEmail: 'carlos.almeida@example.pt',
      requisitanteTelefone: '+351 910 000 002',
      canal: 'portal',
      categoria: 'Elevadores',
      atribuidoA: 'Joao Silva',
      tags: ['elevador', 'bloco-b', 'urgente'],
      blocoId: 'B',
      pisoId: '4',
      zonaId: 'Entrada principal',
      equipamentoId: 'elevador-bloco-b',
      custoEstimado: '420.00',
      custoFinal: '',
      fornecedorId: 'supplier-001',
      referenciaContrato: 'CTR-ELEV-2026',
      mediaIds: [],
      documentoIds: [],
      motivoResolucao: '',
      slaRespostaEm: '2026-05-15T09:00:00.000Z',
      slaResolucaoEm: '2026-05-24T18:00:00.000Z',
      respondidoEm: '2026-05-15T08:45:00.000Z',
      resolvidoEm: '',
      fechadoEm: '',
      tokenAcompanhamento: 'demo-elevador-b',
      originChannel: 'hq',
      publicStatusText: 'Tecnico agendado e administracao notificada.',
      technicalNotes: 'Confirmar quadro de comando e verificar necessidade de peca.',
      assignedWorkerId: 'worker-demo-1',
      workStartedAt: '2026-05-15T10:00:00.000Z',
      workPausedAt: '',
      arrivedAt: '2026-05-15T09:45:00.000Z',
      resolvedByWorkerAt: '',
      resolutionSummary: '',
      workerChecklist: defaultDemoWorkerChecklist('Elevadores'),
      workerTimeMinutes: 45,
      requiresHqValidation: false,
      hqValidationStatus: 'nao_requerida',
      hqValidationNotes: '',
      publicTimelineStatus: 'Intervencao em curso',
      qrSourceType: 'equipment',
      qrSourceId: 'elevador-bloco-b',
      criadoEm: '2026-05-15T08:20:00.000Z',
      atualizadoEm: '2026-05-15T10:30:00.000Z'
    },
    {
      id: 'ocorr-demo-002',
      titulo: 'Infiltracao na garagem -1',
      tipo: 'pedido',
      status: 'pendente',
      prioridade: 'alta',
      impacto: 'medio',
      urgencia: 'alta',
      descricao: 'Pedido de vistoria aberto para a garagem -1 apos alerta de morador.',
      condominiumId: 'cond-001',
      requisitanteNome: 'Maria Fernandes',
      requisitanteEmail: 'maria.fernandes@example.pt',
      requisitanteTelefone: '+351 910 000 001',
      canal: 'email',
      categoria: 'Infiltracoes',
      atribuidoA: 'Equipa tecnica',
      tags: ['garagem', 'vistoria'],
      blocoId: 'A',
      pisoId: '-1',
      zonaId: 'Garagem',
      equipamentoId: '',
      custoEstimado: '',
      custoFinal: '',
      fornecedorId: '',
      referenciaContrato: '',
      mediaIds: [],
      documentoIds: [],
      motivoResolucao: '',
      slaRespostaEm: '2026-05-16T12:00:00.000Z',
      slaResolucaoEm: '2026-05-25T17:30:00.000Z',
      respondidoEm: '',
      resolvidoEm: '',
      fechadoEm: '',
      tokenAcompanhamento: 'demo-garagem',
      originChannel: 'hq',
      publicStatusText: 'Vistoria em preparacao.',
      technicalNotes: 'Avaliar origem da infiltracao antes de abrir obra.',
      assignedWorkerId: 'worker-demo-2',
      workStartedAt: '',
      workPausedAt: '',
      arrivedAt: '',
      resolvedByWorkerAt: '',
      resolutionSummary: '',
      workerChecklist: defaultDemoWorkerChecklist('Infiltracoes'),
      workerTimeMinutes: 0,
      requiresHqValidation: false,
      hqValidationStatus: 'nao_requerida',
      hqValidationNotes: '',
      publicTimelineStatus: 'Vistoria em preparacao',
      qrSourceType: 'zone',
      qrSourceId: 'garagem-a-minus-1',
      criadoEm: '2026-05-14T16:10:00.000Z',
      atualizadoEm: '2026-05-14T16:10:00.000Z'
    }
  ];
}

function defaultDemoWorkerChecklist(category: string): WorkerChecklistItem[] {
  const normalized = category.toLowerCase();
  const labels = normalized.includes('elev')
    ? ['Confirmar seguranca do elevador', 'Verificar quadro/comando', 'Registar teste final']
    : normalized.includes('infil')
      ? ['Identificar origem da infiltracao', 'Fotografar zona afetada', 'Indicar reparacao necessaria']
      : ['Confirmar local e seguranca', 'Executar intervencao', 'Registar conclusao e evidencias'];

  return labels.map((label, index) => ({
    id: `step-${index + 1}`,
    label,
    done: index === 0 && normalized.includes('elev'),
    note: ''
  }));
}

function handleDemoInspections(
  store: DemoStore,
  pathname: string,
  method: string,
  body: Record<string, unknown>,
  url: URL
): { handled: true; value: unknown } | { handled: false } {
  if (pathname === 'inspections' && method === 'GET') {
    return { handled: true, value: paginateDemoCollection(store.inspections, url) };
  }

  if (pathname === 'inspections' && method === 'POST') {
    const created = normalizeInspectionRecord({
      id: createDemoId('inspection'),
      title: String(body.title || '').trim(),
      condominium: String(body.condominium || store.activeCondominium),
      location: String(body.location || ''),
      requiredDate: String(body.requiredDate || new Date().toISOString().slice(0, 10)),
      status: String(body.status || 'Planeada'),
      result: String(body.result || 'Pendente'),
      checklist: Array.isArray(body.checklist) ? body.checklist : [],
      workerNotes: String(body.workerNotes || ''),
      hqNotes: String(body.hqNotes || ''),
      submittedAt: String(body.submittedAt || ''),
      confirmedAt: String(body.confirmedAt || ''),
      confirmedBy: String(body.confirmedBy || ''),
      calendarEventId: String(body.calendarEventId || '')
    });
    if (!created.title) {
      throw new Error('Titulo e obrigatorio');
    }
    if (inspectionStatusKey(created.status) !== 'planeada') {
      throw new Error('Nova vistoria deve iniciar no estado Planeada');
    }

    syncInspectionCalendarEvent(store, created);
    store.inspections.unshift(created);
    appendDemoAudit(store, 'inspections', 'Criado', created.id, created.title);
    saveDemoStore(store);
    return { handled: true, value: created };
  }

  const match = pathname.match(/^inspections\/([^/]+)$/);
  if (!match) {
    return { handled: false };
  }

  const id = match[1];
  const index = store.inspections.findIndex((item) => item.id === id);
  if (index < 0) {
    throw new Error('Vistoria nao encontrada');
  }

  if (method === 'PUT') {
    const current = store.inspections[index];
    const updated = normalizeInspectionRecord({
      ...current,
      ...body,
      id
    });
    const from = inspectionStatusKey(current.status);
    const to = inspectionStatusKey(updated.status);
    if (!isAllowedInspectionTransition(from, to)) {
      throw new Error('Transicao de estado da vistoria invalida');
    }
    if (from !== to && to === 'submetida' && !updated.submittedAt) {
      updated.submittedAt = new Date().toISOString();
    }
    if (from !== to && (to === 'confirmada' || to === 'rejeitada')) {
      if (!updated.confirmedAt) updated.confirmedAt = new Date().toISOString();
      if (!updated.confirmedBy) updated.confirmedBy = store.user.name;
    }

    syncInspectionCalendarEvent(store, updated);
    store.inspections[index] = updated;
    appendDemoAudit(store, 'inspections', 'Atualizado', updated.id, updated.title);
    saveDemoStore(store);
    return { handled: true, value: updated };
  }

  if (method === 'DELETE') {
    const [deleted] = store.inspections.splice(index, 1);
    if (deleted.calendarEventId) {
      store.calendarEvents = store.calendarEvents.filter((event) => event.id !== deleted.calendarEventId);
    } else {
      store.calendarEvents = store.calendarEvents.filter((event) => !(event.linkedEntityType === 'inspection' && event.linkedEntityId === deleted.id));
    }
    appendDemoAudit(store, 'inspections', 'Apagado', deleted.id, deleted.title);
    saveDemoStore(store);
    return { handled: true, value: { deleted: true } };
  }

  return { handled: false };
}

function handleDemoOcorrencias(
  store: DemoStore,
  pathname: string,
  method: string,
  body: Record<string, unknown>,
  url: URL
): { handled: true; value: unknown } | { handled: false } {
  if (pathname === 'ocorrencias/metricas' && method === 'GET') {
    return { handled: true, value: computeDemoOcorrenciasMetricas(store.ocorrencias) };
  }

  if (pathname === 'worker/tickets' && method === 'GET') {
    const items = store.ocorrencias
      .filter((item) => isDemoWorkerTicket(item))
      .sort((left, right) => demoWorkerRank(left) - demoWorkerRank(right));
    return { handled: true, value: items };
  }

  if (pathname === 'ocorrencias' && method === 'GET') {
    return { handled: true, value: paginateDemoOcorrencias(store.ocorrencias, url) };
  }

  if (pathname === 'ocorrencias' && method === 'POST') {
    const created = createDemoOcorrencia(store, body);
    store.ocorrencias.unshift(created);
    appendDemoAudit(store, 'ocorrencias', 'Criado', created.id, created.titulo);
    saveDemoStore(store);
    return { handled: true, value: created };
  }

  if (pathname === 'ocorrencias/from-qr' && method === 'POST') {
    const created = createDemoOcorrencia(store, {
      ...body,
      tipo: 'avaria',
      tags: ['qr', String(body.qrSourceType || 'unknown')],
      publicStatusText: 'Avaria recebida por QR.',
      technicalNotes: `Criada via QR: ${String(body.qrSourceType || '')} ${String(body.qrSourceId || '')}`.trim(),
      originChannel: 'client'
    });
    store.ocorrencias.unshift(created);
    appendDemoAudit(store, 'ocorrencias', 'Criado por QR', created.id, created.titulo);
    saveDemoStore(store);
    return { handled: true, value: created };
  }

  const match = pathname.match(/^ocorrencias\/([^/]+)(?:\/([^/]+))?$/);
  if (!match) {
    return { handled: false };
  }

  const [, id, action] = match;
  const index = store.ocorrencias.findIndex((item) => item.id === id);
  if (index < 0) {
    throw new Error('Ocorrencia nao encontrada');
  }

  const current = store.ocorrencias[index];
  if (!action && method === 'GET') {
    return { handled: true, value: buildDemoOcorrenciaDetalhe(current) };
  }

  if (!action && method === 'PUT') {
    const updated = updateDemoOcorrencia(current, body);
    store.ocorrencias[index] = updated;
    appendDemoAudit(store, 'ocorrencias', 'Atualizado', updated.id, updated.titulo);
    saveDemoStore(store);
    return { handled: true, value: updated };
  }

  if (!action && method === 'DELETE') {
    store.ocorrencias.splice(index, 1);
    appendDemoAudit(store, 'ocorrencias', 'Apagado', current.id, current.titulo);
    saveDemoStore(store);
    return { handled: true, value: store.ocorrencias };
  }

  if (action === 'status' && method === 'PATCH') {
    const updated = updateDemoOcorrencia(current, { status: body.status });
    store.ocorrencias[index] = updated;
    appendDemoAudit(store, 'ocorrencias', 'Status atualizado', updated.id, updated.titulo);
    saveDemoStore(store);
    return { handled: true, value: updated };
  }

  if (action === 'worker-action' && method === 'POST') {
    const updated = applyDemoWorkerAction(current, body);
    store.ocorrencias[index] = updated;
    appendDemoAudit(store, 'ocorrencias', 'Acao trabalhador', updated.id, updated.titulo);
    saveDemoStore(store);
    return { handled: true, value: updated };
  }

  if (action === 'validate-resolution' && method === 'POST') {
    const decision = String(body.decision || '').toLowerCase();
    const accepted = decision === 'accept' || decision === 'aceitar';
    const updated = updateDemoOcorrencia(current, {
      status: accepted ? 'resolvida' : 'emCurso',
      requiresHqValidation: !accepted,
      hqValidationStatus: accepted ? 'aprovada' : 'rejeitada',
      hqValidationNotes: String(body.notes || (accepted ? '' : 'Rever intervencao e submeter novamente.')),
      publicTimelineStatus: accepted ? 'Resolucao validada.' : 'Intervencao em revisao tecnica.'
    });
    store.ocorrencias[index] = updated;
    appendDemoAudit(store, 'ocorrencias', 'Validacao HQ', updated.id, updated.titulo);
    saveDemoStore(store);
    return { handled: true, value: updated };
  }

  if (action === 'reabrir' && method === 'POST') {
    const updated = updateDemoOcorrencia(current, { status: 'reaberta' });
    store.ocorrencias[index] = updated;
    appendDemoAudit(store, 'ocorrencias', 'Reaberto', updated.id, updated.titulo);
    saveDemoStore(store);
    return { handled: true, value: updated };
  }

  if (action === 'comentarios' && method === 'GET') {
    return { handled: true, value: demoOcorrenciaComentarios(current) };
  }

  if (action === 'comentarios' && method === 'POST') {
    const comment: OcorrenciaComentario = {
      id: createDemoId('comentario'),
      ocorrenciaId: current.id,
      autorId: store.user.id,
      autorNome: store.user.name,
      texto: String(body.texto ?? '').trim(),
      visibilidade: body.visibilidade === 'publico' ? 'publico' : 'interno',
      criadoEm: new Date().toISOString()
    };
    appendDemoAudit(store, 'ocorrencias', 'Comentario', current.id, current.titulo);
    saveDemoStore(store);
    return { handled: true, value: comment };
  }

  return { handled: false };
}

function paginateDemoOcorrencias(items: Ocorrencia[], url: URL): PaginatedOcorrencias {
  const page = Number(url.searchParams.get('page') ?? '1');
  const pageSize = Number(url.searchParams.get('pageSize') ?? '50');
  const search = String(url.searchParams.get('search') ?? '').trim().toLowerCase();
  const filtered = search
    ? items.filter((item) => JSON.stringify(item).toLowerCase().includes(search))
    : items;
  const start = Math.max(0, (page - 1) * pageSize);

  return {
    data: filtered.slice(start, start + pageSize),
    page,
    pageSize,
    total: filtered.length
  };
}

function computeDemoOcorrenciasMetricas(items: Ocorrencia[]): OcorrenciasMetricas {
  const abertas = items.filter((item) => !['resolvida', 'fechada'].includes(item.status));

  return {
    totalAbertas: abertas.length,
    urgentes: abertas.filter((item) => item.prioridade === 'urgente').length,
    totalAvarias: items.filter((item) => item.tipo === 'avaria').length,
    mttrSegundos: 0,
    agingMaxDias: abertas.length ? 3 : 0
  };
}

function buildDemoOcorrenciaDetalhe(ocorrencia: Ocorrencia): OcorrenciaDetalhe {
  return {
    ocorrencia,
    comentarios: demoOcorrenciaComentarios(ocorrencia),
    anexos: [],
    historico: [
      {
        timestamp: ocorrencia.criadoEm,
        autor: ocorrencia.requisitanteNome || 'Sistema',
        acao: 'Criacao',
        descricao: ocorrencia.descricao
      },
      {
        timestamp: ocorrencia.atualizadoEm,
        autor: ocorrencia.atribuidoA || 'Administracao',
        acao: 'Atualizacao',
        descricao: ocorrencia.publicStatusText || 'Ocorrencia em acompanhamento.'
      }
    ]
  };
}

function demoOcorrenciaComentarios(ocorrencia: Ocorrencia): OcorrenciaComentario[] {
  return [
    {
      id: `${ocorrencia.id}-comentario-001`,
      ocorrenciaId: ocorrencia.id,
      autorId: 'user-admin',
      autorNome: 'Joao Silva',
      texto: ocorrencia.publicStatusText || 'Registo acompanhado pela administracao.',
      visibilidade: 'interno',
      criadoEm: ocorrencia.atualizadoEm
    }
  ];
}

function createDemoOcorrencia(store: DemoStore, body: Record<string, unknown>): Ocorrencia {
  const now = new Date().toISOString();
  const title = String(body.titulo || body.title || 'Nova ocorrencia').trim();
  const category = String(body.categoria || 'Operacional');

  return {
    id: createDemoId('ocorr'),
    titulo: title,
    tipo: normalizeDemoEnum(body.tipo, ['avaria', 'pedido', 'reclamacao', 'pergunta', 'tarefaInterna'], 'pedido'),
    status: 'nova',
    prioridade: normalizeDemoEnum(body.prioridade, ['baixa', 'normal', 'alta', 'urgente'], 'normal'),
    impacto: normalizeDemoEnum(body.impacto, ['baixo', 'medio', 'alto', 'critico'], 'medio'),
    urgencia: normalizeDemoEnum(body.urgencia, ['baixa', 'media', 'alta', 'imediata'], 'media'),
    descricao: String(body.descricao || body.detail || ''),
    condominiumId: String(body.condominiumId || store.condominiums[0]?.id || ''),
    requisitanteNome: String(body.requisitanteNome || store.user.name),
    requisitanteEmail: String(body.requisitanteEmail || store.user.email),
    requisitanteTelefone: String(body.requisitanteTelefone || ''),
    canal: normalizeDemoEnum(body.canal, ['portal', 'email', 'telefone', 'presencial', 'interno'], 'portal'),
    categoria: category,
    atribuidoA: String(body.atribuidoA || ''),
    tags: Array.isArray(body.tags) ? body.tags.map(String) : [],
    blocoId: String(body.blocoId || ''),
    pisoId: String(body.pisoId || ''),
    zonaId: String(body.zonaId || ''),
    equipamentoId: String(body.equipamentoId || ''),
    custoEstimado: '',
    custoFinal: '',
    fornecedorId: '',
    referenciaContrato: '',
    mediaIds: [],
    documentoIds: [],
    motivoResolucao: '',
    slaRespostaEm: '',
    slaResolucaoEm: '',
    respondidoEm: '',
    resolvidoEm: '',
    fechadoEm: '',
    tokenAcompanhamento: createDemoId('tracking'),
    originChannel: normalizeDemoEnum(body.originChannel, ['hq', 'client', 'worker'], 'hq'),
    publicStatusText: String(body.publicStatusText || 'Registo recebido.'),
    technicalNotes: String(body.technicalNotes || ''),
    assignedWorkerId: String(body.assignedWorkerId || ''),
    workStartedAt: String(body.workStartedAt || ''),
    workPausedAt: String(body.workPausedAt || ''),
    arrivedAt: String(body.arrivedAt || ''),
    resolvedByWorkerAt: String(body.resolvedByWorkerAt || ''),
    resolutionSummary: String(body.resolutionSummary || ''),
    workerChecklist: Array.isArray(body.workerChecklist)
      ? body.workerChecklist as WorkerChecklistItem[]
      : defaultDemoWorkerChecklist(category),
    workerTimeMinutes: Number(body.workerTimeMinutes || 0),
    requiresHqValidation: Boolean(body.requiresHqValidation || false),
    hqValidationStatus: String(body.hqValidationStatus || 'nao_requerida'),
    hqValidationNotes: String(body.hqValidationNotes || ''),
    publicTimelineStatus: String(body.publicTimelineStatus || 'Registo recebido.'),
    qrSourceType: String(body.qrSourceType || ''),
    qrSourceId: String(body.qrSourceId || ''),
    criadoEm: now,
    atualizadoEm: now
  };
}

function updateDemoOcorrencia(
  current: Ocorrencia,
  body: Record<string, unknown>
): Ocorrencia {
  return {
    ...current,
    ...body,
    id: current.id,
    status: normalizeDemoEnum(
      body.status,
      ['nova', 'emTriagem', 'aguardaPecas', 'emCurso', 'pendente', 'resolvida', 'fechada', 'reaberta'],
      current.status
    ),
    atualizadoEm: new Date().toISOString()
  } as Ocorrencia;
}

function applyDemoWorkerAction(current: Ocorrencia, body: Record<string, unknown>): Ocorrencia {
  const now = new Date().toISOString();
  const action = String(body.action || '').toLowerCase();
  const checklist = Array.isArray(body.workerChecklist)
    ? body.workerChecklist as WorkerChecklistItem[]
    : current.workerChecklist;
  const note = String(body.note || '').trim();

  if (action === 'arrive') {
    return updateDemoOcorrencia(current, {
      arrivedAt: now,
      publicTimelineStatus: 'Tecnico no local',
      workerChecklist: checklist,
      technicalNotes: appendDemoNote(current.technicalNotes, note)
    });
  }
  if (action === 'start') {
    return updateDemoOcorrencia(current, {
      status: 'emCurso',
      workStartedAt: current.workStartedAt || now,
      respondidoEm: current.respondidoEm || now,
      publicTimelineStatus: 'Intervencao em curso',
      workerChecklist: checklist,
      technicalNotes: appendDemoNote(current.technicalNotes, note)
    });
  }
  if (action === 'pause') {
    return updateDemoOcorrencia(current, {
      status: 'pendente',
      workPausedAt: now,
      publicTimelineStatus: 'Intervencao pausada',
      workerChecklist: checklist,
      technicalNotes: appendDemoNote(current.technicalNotes, note)
    });
  }
  if (action === 'await_parts') {
    return updateDemoOcorrencia(current, {
      status: 'aguardaPecas',
      publicTimelineStatus: 'A aguardar pecas/material',
      workerChecklist: checklist,
      technicalNotes: appendDemoNote(current.technicalNotes, note)
    });
  }

  const summary = String(body.resolutionSummary || body.note || 'Intervencao concluida').trim();
  return updateDemoOcorrencia(current, {
    status: 'resolvida',
    resolvidoEm: now,
    resolvedByWorkerAt: now,
    motivoResolucao: summary,
    resolutionSummary: summary,
    workerChecklist: checklist,
    workerTimeMinutes: Number(body.workerTimeMinutes || current.workerTimeMinutes || 0),
    requiresHqValidation: true,
    hqValidationStatus: 'pendente',
    publicTimelineStatus: 'Resolvida pelo tecnico, em validacao',
    technicalNotes: appendDemoNote(current.technicalNotes, note)
  });
}

function appendDemoNote(existing: string, note: string): string {
  if (!note) return existing;
  return existing ? `${existing}\n${note}` : note;
}

function isDemoWorkerTicket(item: Ocorrencia): boolean {
  const assigned = `${item.assignedWorkerId} ${item.atribuidoA}`.toLowerCase();
  return assigned.includes('worker') || assigned.includes('tecnico') || assigned.includes('funcionario');
}

function demoWorkerRank(item: Ocorrencia): number {
  const priority = item.prioridade === 'urgente' ? 0 : item.prioridade === 'alta' ? 1 : item.prioridade === 'normal' ? 2 : 3;
  const status = item.status === 'emCurso' ? 0 : item.status === 'aguardaPecas' ? 1 : item.status === 'resolvida' ? 4 : 2;
  return priority + status;
}

function normalizeDemoEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T
): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

function inspectionStatusKey(value: string): 'planeada' | 'submetida' | 'confirmada' | 'rejeitada' {
  const normalized = value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (normalized.includes('submet')) return 'submetida';
  if (normalized.includes('confirm')) return 'confirmada';
  if (normalized.includes('rejeit')) return 'rejeitada';
  return 'planeada';
}

function inspectionStatusLabel(value: string): 'Planeada' | 'Submetida' | 'Confirmada' | 'Rejeitada' {
  const key = inspectionStatusKey(value);
  if (key === 'submetida') return 'Submetida';
  if (key === 'confirmada') return 'Confirmada';
  if (key === 'rejeitada') return 'Rejeitada';
  return 'Planeada';
}

function isAllowedInspectionTransition(
  from: 'planeada' | 'submetida' | 'confirmada' | 'rejeitada',
  to: 'planeada' | 'submetida' | 'confirmada' | 'rejeitada'
): boolean {
  if (from === to) return true;
  return (from === 'planeada' && to === 'submetida') ||
    (from === 'submetida' && (to === 'confirmada' || to === 'rejeitada'));
}

function normalizeInspectionRecord(input: Partial<InspectionItem> & { id: string; title: string }): InspectionItem {
  const checklistSource = Array.isArray(input.checklist) ? input.checklist : [];
  const checklist = checklistSource.map((item) => String(item || '').trim()).filter(Boolean);
  return {
    id: input.id,
    title: String(input.title || '').trim(),
    condominium: String(input.condominium || 'Geral'),
    location: String(input.location || ''),
    requiredDate: String(input.requiredDate || ''),
    status: inspectionStatusLabel(String(input.status || 'Planeada')),
    result: String(input.result || 'Pendente'),
    checklist,
    workerNotes: String(input.workerNotes || ''),
    hqNotes: String(input.hqNotes || ''),
    submittedAt: String(input.submittedAt || ''),
    confirmedAt: String(input.confirmedAt || ''),
    confirmedBy: String(input.confirmedBy || ''),
    calendarEventId: String(input.calendarEventId || ''),
    assignedWorkerId: String(input.assignedWorkerId || '')
  };
}

function syncInspectionCalendarEvent(store: DemoStore, inspection: InspectionItem): void {
  const now = new Date().toISOString();
  const startAt = inspection.requiredDate
    ? (inspection.requiredDate.includes('T') ? inspection.requiredDate : `${inspection.requiredDate}T09:00:00`)
    : now;
  const endAt = inspection.requiredDate
    ? (inspection.requiredDate.includes('T') ? inspection.requiredDate : `${inspection.requiredDate}T10:00:00`)
    : now;
  const statusByInspection: Record<string, string> = {
    planeada: 'Planeado',
    submetida: 'Agendado',
    confirmada: 'Confirmado',
    rejeitada: 'Cancelado'
  };
  const status = statusByInspection[inspectionStatusKey(inspection.status)] || 'Planeado';
  const existing = store.calendarEvents.find((event) =>
    event.id === inspection.calendarEventId ||
    (event.linkedEntityType === 'inspection' && event.linkedEntityId === inspection.id)
  );
  if (existing) {
    existing.title = `Vistoria - ${inspection.title}`;
    existing.description = inspection.result ? `Resultado preliminar: ${inspection.result}` : 'Vistoria operacional registada.';
    existing.status = status;
    existing.startAt = startAt;
    existing.endAt = endAt;
    existing.condominium = inspection.condominium;
    existing.linkedEntityType = 'inspection';
    existing.linkedEntityId = inspection.id;
    existing.location = inspection.location;
    existing.notes = inspection.workerNotes;
    existing.attendees = inspection.assignedWorkerId ? [inspection.assignedWorkerId] : [];
    existing.updatedAt = now;
    inspection.calendarEventId = existing.id;
    return;
  }

  const createdId = createDemoId('cal');
  store.calendarEvents.unshift({
    id: createdId,
    title: `Vistoria - ${inspection.title}`,
    description: inspection.result ? `Resultado preliminar: ${inspection.result}` : 'Vistoria operacional registada.',
    eventType: 'Vistoria',
    status,
    startAt,
    endAt,
    condominium: inspection.condominium,
    linkedEntityType: 'inspection',
    linkedEntityId: inspection.id,
    attendees: inspection.assignedWorkerId ? [inspection.assignedWorkerId] : [],
    location: inspection.location,
    notes: inspection.workerNotes,
    createdAt: now,
    updatedAt: now
  });
  inspection.calendarEventId = createdId;
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
    ocorrencias: store.ocorrencias as unknown as Array<Record<string, unknown>>,
    suppliers: store.suppliers as unknown as Array<Record<string, unknown>>,
    documents: store.documents as unknown as Array<Record<string, unknown>>,
    reports: store.reports as unknown as Array<Record<string, unknown>>,
    maintenance: store.maintenance as unknown as Array<Record<string, unknown>>,
    inspections: store.inspections as unknown as Array<Record<string, unknown>>,
    'calendar-events': store.calendarEvents as unknown as Array<Record<string, unknown>>,
    assemblies: store.assemblies as unknown as Array<Record<string, unknown>>,
    'audit-log': store.auditLog as unknown as Array<Record<string, unknown>>,
    'accounting/quotas': store.accounting.quotas as unknown as Array<Record<string, unknown>>,
    'accounting/payments': store.accounting.payments as unknown as Array<Record<string, unknown>>,
    'accounting/debts': store.accounting.debts as unknown as Array<Record<string, unknown>>,
    'accounting/receipts': store.accounting.receipts as unknown as Array<Record<string, unknown>>,
    'accounting/expenses': store.accounting.expenses as unknown as Array<Record<string, unknown>>,
    'accounting/reserve-funds': store.accounting.reserveFunds as unknown as Array<Record<string, unknown>>,
    'accounting/payment-agreements': store.accounting.paymentAgreements as unknown as Array<Record<string, unknown>>,
    'accounting/cash-movements': store.accounting.cashMovements as unknown as Array<Record<string, unknown>>,
    'accounting/bank-transactions': store.accounting.bankTransactions as unknown as Array<Record<string, unknown>>
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
  const overview = store.accounting.overview;
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
      { label: `${overview.debtsInFollowUp} dividas em acompanhamento`, tone: overview.debtsInFollowUp ? 'danger' : 'green' },
      { label: `${store.tickets.length} tickets registados`, tone: 'gold' }
    ],
    quickActions: [
      { title: 'Extrato de Conta', description: 'Resumo por fracao', icon: 'E', tone: 'blue' },
      { title: 'Avarias', description: 'Ocorrencias do condominio', icon: 'A', tone: 'green' },
      { title: 'Email', description: 'Comunicacoes rapidas', icon: '@', tone: 'purple' },
      { title: 'Calendario', description: 'Agenda operacional', icon: 'C', tone: 'gold' }
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
          { value: String(overview.quotasToValidate), label: 'Quotas por validar', status: overview.quotasToValidate ? 'warning' : 'success' },
          { value: String(overview.unreconciledMovements), label: 'Por reconciliar', status: overview.unreconciledMovements ? 'warning' : 'success' },
          { value: String(overview.receiptsToIssue), label: 'Recibos por emitir', status: overview.receiptsToIssue ? 'warning' : 'success' },
          { value: String(overview.activePaymentAgreements), label: 'Acordos ativos', status: 'success' }
        ]
      },
      {
        id: 'administration',
        title: 'Vistorias',
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
  payload: Record<string, unknown>
): DocumentItem {
  const template = String(payload.template || 'documento');
  const templateLabel = demoDocumentTemplates().find((item) => item.id === template)?.label ?? 'Documento gerado';
  const inspectionId = String(payload.inspectionId || '').trim();
  const inspection = inspectionId
    ? store.inspections.find((item) => item.id === inspectionId)
    : undefined;
  if (template === 'inspection-report' && !inspection) {
    throw new Error('Vistoria nao encontrada para gerar relatorio');
  }
  const titleSuffix = inspection?.title || String(payload.condominium || store.activeCondominium);
  const title = `${templateLabel} - ${titleSuffix}`;
  const document: DocumentItem = {
    id: createDemoId('doc'),
    title,
    type: templateLabel,
    condominium: inspection?.condominium || String(payload.condominium || store.activeCondominium),
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
    },
    {
      id: 'inspection-report',
      label: 'Relatorio de vistoria',
      category: 'Operacao',
      description: 'Relatorio tecnico individual com checklist, notas e decisao HQ.',
      output: 'PDF/TXT',
      dataSources: ['Vistorias', 'Calendario']
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
