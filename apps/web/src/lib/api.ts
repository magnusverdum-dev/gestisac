export type ApiStatus = 'online' | 'offline' | 'checking';

export type PublicUser = {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  role: string;
  activeCondominium: string;
  activeCondominiums: number;
};

export type DashboardMetric = {
  value: string;
  label: string;
  status?: 'urgent' | 'warning' | 'success' | 'new';
};

export type DashboardModule = {
  id: string;
  title: string;
  subtitle: string;
  tone: 'blue' | 'green' | 'purple' | 'gold';
  cta: string;
  path: string;
  visual: string;
  metrics: DashboardMetric[];
};

export type AlertItem = {
  type: string;
  title: string;
  detail: string;
  tone: string;
  icon: string;
};

export type DashboardResponse = {
  user: PublicUser;
  activeCondominium: string;
  urgentNotice: {
    type: string;
    title: string;
    detail: string;
    priority: string;
  };
  operationalSummary: Array<{
    label: string;
    tone: string;
  }>;
  quickActions: Array<{
    title: string;
    description: string;
    icon: string;
    tone: string;
  }>;
  dashboardModules: DashboardModule[];
  alerts: AlertItem[];
};

export type GlobalSearchResult = {
  id: string;
  title: string;
  detail: string;
  path: string;
  tone: string;
};

export type Condominium = {
  id: string;
  name: string;
  location: string;
  buildings: number;
  fractions: number;
  residents: number;
  status: string;
  notice: string;
};

export type Building = {
  id: string;
  condominium: string;
  name: string;
  floors: number;
  fractions: number;
  status: string;
};

export type Fraction = {
  id: string;
  condominium: string;
  building: string;
  number: string;
  floor: string;
  typology: string;
  owner: string;
  status: string;
};

export type Resident = {
  id: string;
  name: string;
  email: string;
  phone: string;
  condominium: string;
  fraction: string;
  status: string;
};

export type Ticket = {
  id: string;
  title: string;
  condominium: string;
  priority: string;
  status: string;
  detail: string;
  updatedAt: string;
  category: string;
  location: string;
  resident: string;
  reporterName: string;
  assignedTechnician: string;
  slaDueAt: string;
  slaState: string;
  createdAt: string;
  resolvedAt?: string | null;
  confirmedAt?: string | null;
  isEmergency: boolean;
  timeline: AvariaEvent[];
  attachments: AvariaAttachment[];
  messages: AvariaMessage[];
  checklist: AvariaChecklistItem[];
  customerProfile: CustomerOperationalProfile;
};

export type AvariaEvent = {
  id: string;
  type: string;
  label: string;
  detail: string;
  actor: string;
  createdAt: string;
  clientActionId?: string | null;
};

export type AvariaAttachment = {
  id: string;
  kind: string;
  fileName: string;
  mimeType: string;
  url: string;
  storageKey?: string;
  sizeBytes?: number;
  caption: string;
  uploadedBy: string;
  uploadedAt: string;
  pendingSync: boolean;
};

export type AvariaMessage = {
  id: string;
  author: string;
  role: string;
  message: string;
  createdAt: string;
};

export type AvariaChecklistItem = {
  id: string;
  label: string;
  required: boolean;
  completed: boolean;
};

export type CustomerOperationalProfile = {
  validReports: number;
  reopenedReports: number;
  falseAlarms: number;
  internalNotes: string;
  lastInteraction: string;
};

export type Supplier = {
  id: string;
  name: string;
  category: string;
  status: string;
  contact: string;
};

export type DocumentItem = {
  id: string;
  title: string;
  type: string;
  condominium: string;
  status: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  uploadedAt?: string | null;
};

export type DocumentPreview = {
  document: DocumentItem;
  previewType: string;
  content?: string | null;
  downloadUrl: string;
};

export type DocumentTemplate = {
  id: string;
  label: string;
  category: string;
  description: string;
  output: string;
  dataSources: string[];
};

export type GenerateDocumentPayload = {
  template: string;
  condominium?: string;
  resident?: string;
  fraction?: string;
  notes?: string;
  format?: 'pdf' | 'txt';
};

export type Report = {
  id: string;
  title: string;
  period: string;
  status: string;
};

export type ReportPreview = {
  report: Report;
  generatedAt: string;
  activeCondominium: string;
  kpis: Array<{
    label: string;
    value: string;
    detail: string;
    tone: string;
  }>;
  sections: Array<{
    title: string;
    rows: Array<{
      label: string;
      value: string;
      detail: string;
    }>;
  }>;
  recommendedActions: string[];
};

export type MaintenanceItem = {
  id: string;
  title: string;
  supplier: string;
  status: string;
  date: string;
};

export type Assembly = {
  id: string;
  title: string;
  condominium: string;
  date: string;
  status: string;
};

export type AccountingSummary = {
  currentBalance: number;
  paidQuotaPercentage: number;
  overdueAmount: number;
  overdueCount: number;
  monthlyExpenses: number;
  reserveFund: number;
  currency: string;
};

export type Quota = {
  id: string;
  condominium: string;
  fraction: string;
  resident: string;
  period: string;
  amount: number;
  dueDate: string;
  status: string;
};

export type AccountingPayment = {
  id: string;
  condominium: string;
  fraction: string;
  resident: string;
  amount: number;
  paidAt: string;
  method: string;
  status: string;
};

export type Debt = {
  id: string;
  condominium: string;
  fraction: string;
  resident: string;
  amount: number;
  dueDate: string;
  daysOverdue: number;
  status: string;
};

export type Receipt = {
  id: string;
  number: string;
  condominium: string;
  resident: string;
  amount: number;
  issuedAt: string;
  status: string;
};

export type Expense = {
  id: string;
  condominium: string;
  category: string;
  supplier: string;
  amount: number;
  dueDate: string;
  status: string;
};

export type ReserveFund = {
  id: string;
  condominium: string;
  balance: number;
  monthlyChange: number;
  status: string;
};

export type AccountingState = {
  summary: AccountingSummary;
  quotas: Quota[];
  payments: AccountingPayment[];
  debts: Debt[];
  receipts: Receipt[];
  expenses: Expense[];
  reserveFunds: ReserveFund[];
};

export type AuditLogEntry = {
  id: string;
  userId: string;
  userName: string;
  module: string;
  action: string;
  recordId: string;
  summary: string;
  createdAt: string;
};

export type PermissionsResponse = {
  role: string;
  modules: Array<{
    module: string;
    canRead: boolean;
    canWrite: boolean;
    canDelete: boolean;
  }>;
};

export type OperationsMetrics = {
  openTickets: number;
  emergencies: number;
  slaAtRisk: number;
  activeTechnicians: number;
  averageResolutionLabel: string;
};

export type OperationsFeedItem = {
  id: string;
  ticketId?: string;
  type: string;
  title: string;
  detail: string;
  tone: string;
  createdAt: string;
};

export type QrZone = {
  id: string;
  condominium: string;
  label: string;
  location: string;
  ticketTemplate: string;
  qrPayload: string;
};

export type OperationsState = {
  metrics: OperationsMetrics;
  feed: OperationsFeedItem[];
  qrZones: QrZone[];
};

export type TicketTransitionPayload = {
  status: string;
  note?: string;
  clientActionId?: string;
};

export type TicketAssignPayload = {
  technician: string;
  note?: string;
  clientActionId?: string;
};

export type TicketMessagePayload = {
  author?: string;
  role?: string;
  message: string;
  clientActionId?: string;
};

export type TicketResolutionPayload = {
  confirmed: boolean;
  comment?: string;
  signature?: string;
  clientActionId?: string;
};

export type TicketReopenPayload = {
  reason: string;
  clientActionId?: string;
};

export type TicketChecklistPayload = {
  checklistItemId: string;
  completed: boolean;
  clientActionId?: string;
};

export type TicketAttachmentUploadPayload = {
  kind?: string;
  caption?: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  file?: Blob;
  clientActionId?: string;
};

export type PendingTicketActionType =
  | 'transition'
  | 'assign'
  | 'message'
  | 'checklist'
  | 'confirmResolution'
  | 'reopen'
  | 'attachment';

export type PendingTicketAction = {
  id: string;
  ticketId: string;
  type: PendingTicketActionType;
  payload:
    | TicketTransitionPayload
    | TicketAssignPayload
    | TicketMessagePayload
    | TicketResolutionPayload
    | TicketReopenPayload
    | TicketChecklistPayload
    | TicketAttachmentUploadPayload;
  createdAt: string;
  status: 'pending' | 'syncing' | 'failed';
  error?: string;
};

export type ResourceState = {
  condominiums: Condominium[];
  buildings: Building[];
  fractions: Fraction[];
  residents: Resident[];
  tickets: Ticket[];
  suppliers: Supplier[];
  documents: DocumentItem[];
  reports: Report[];
  maintenance: MaintenanceItem[];
  assemblies: Assembly[];
  accounting: AccountingState;
  auditLog: AuditLogEntry[];
  permissions: PermissionsResponse;
  operations: OperationsState;
};

export type PaginatedResponse<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type LoginResponse = {
  token: string;
  refreshToken: string;
  expiresAt: string;
  user: PublicUser;
};

export type CreateResource =
  | 'condominiums'
  | 'buildings'
  | 'fractions'
  | 'residents'
  | 'tickets'
  | 'suppliers'
  | 'documents'
  | 'reports'
  | 'assemblies'
  | 'maintenance'
  | 'accounting/quotas'
  | 'accounting/payments'
  | 'accounting/debts'
  | 'accounting/receipts'
  | 'accounting/expenses';

export type ResourceEndpoint = CreateResource;

export const SESSION_TOKEN_KEY = 'gestisac.sessionToken';
export const SESSION_REFRESH_KEY = 'gestisac.refreshToken';
export const SESSION_EXPIRES_KEY = 'gestisac.expiresAt';
export const PENDING_TICKET_ACTIONS_KEY = 'gestisac.pendingTicketActions.v3';
const PENDING_TICKET_DB_NAME = 'gestisac-avarias-v3';
const PENDING_TICKET_DB_VERSION = 1;
const PENDING_TICKET_STORE = 'pendingTicketActions';
const MAX_OFFLINE_ATTACHMENT_BYTES = 8 * 1024 * 1024;
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/$/, '') ?? '';

export async function getApiHealth(): Promise<{ service: string; status: 'online' }> {
  return apiRequest('/api/health');
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  return apiRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
}

export async function refreshSession(refreshToken: string): Promise<LoginResponse> {
  return apiRequest('/api/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken })
  });
}

export async function me(token: string): Promise<{ user: PublicUser }> {
  return apiRequest('/api/me', { token });
}

export async function logout(token: string): Promise<void> {
  await apiRequest('/api/auth/logout', { method: 'POST', token });
}

export async function getDashboard(token: string): Promise<DashboardResponse> {
  return apiRequest('/api/dashboard', { token });
}

export async function getResources(token: string): Promise<ResourceState> {
  const [
    condominiums,
    buildings,
    fractions,
    residents,
    tickets,
    suppliers,
    documents,
    reports,
    maintenance,
    assemblies,
    accounting,
    auditLog,
    permissions,
    operations
  ] = await Promise.all([
    getResourcePage<Condominium>(token, '/api/condominiums'),
    getResourcePage<Building>(token, '/api/buildings'),
    getResourcePage<Fraction>(token, '/api/fractions'),
    getResourcePage<Resident>(token, '/api/residents'),
    getResourcePage<Ticket>(token, '/api/tickets'),
    getResourcePage<Supplier>(token, '/api/suppliers'),
    getResourcePage<DocumentItem>(token, '/api/documents'),
    getResourcePage<Report>(token, '/api/reports'),
    getResourcePage<MaintenanceItem>(token, '/api/maintenance'),
    getResourcePage<Assembly>(token, '/api/assemblies'),
    getAccounting(token),
    getResourcePage<AuditLogEntry>(token, '/api/audit-log', 1, 25),
    apiRequest<PermissionsResponse>('/api/permissions', { token }),
    getOperations(token)
  ]);

  return {
    condominiums,
    buildings,
    fractions,
    residents,
    tickets,
    suppliers,
    documents,
    reports,
    maintenance,
    assemblies,
    accounting,
    auditLog,
    permissions,
    operations
  };
}

export async function getOperations(token: string): Promise<OperationsState> {
  const [metrics, feed, qrZones] = await Promise.all([
    apiRequest<OperationsMetrics>('/api/operations/metrics', { token }),
    getOperationsFeed(token),
    apiRequest<QrZone[]>('/api/qr-zones', { token })
  ]);

  return { metrics, feed, qrZones };
}

export async function getOperationsFeed(token: string, since = ''): Promise<OperationsFeedItem[]> {
  const params = new URLSearchParams();
  if (since.trim()) {
    params.set('since', since.trim());
  }

  const query = params.toString();
  return apiRequest<OperationsFeedItem[]>(`/api/operations/feed${query ? `?${query}` : ''}`, { token });
}

export async function getAccounting(token: string): Promise<AccountingState> {
  const [summary, quotas, payments, debts, receipts, expenses, reserveFunds] = await Promise.all([
    apiRequest<AccountingSummary>('/api/accounting/summary', { token }),
    getResourcePage<Quota>(token, '/api/accounting/quotas'),
    getResourcePage<AccountingPayment>(token, '/api/accounting/payments'),
    getResourcePage<Debt>(token, '/api/accounting/debts'),
    getResourcePage<Receipt>(token, '/api/accounting/receipts'),
    getResourcePage<Expense>(token, '/api/accounting/expenses'),
    getResourcePage<ReserveFund>(token, '/api/accounting/reserve-funds')
  ]);

  return {
    summary,
    quotas,
    payments,
    debts,
    receipts,
    expenses,
    reserveFunds
  };
}

export async function getResourcePage<T>(
  token: string,
  path: string,
  page = 1,
  pageSize = 50,
  search = ''
): Promise<T[]> {
  const [basePath, existingQuery = ''] = path.split('?');
  const params = new URLSearchParams(existingQuery);
  params.set('page', String(page));
  params.set('pageSize', String(pageSize));
  if (search.trim()) {
    params.set('search', search.trim());
  }

  const response = await apiRequest<PaginatedResponse<T>>(`${basePath}?${params}`, { token });

  return response.items;
}

export async function createResource(
  token: string,
  resource: ResourceEndpoint,
  payload: Record<string, string | number>
): Promise<unknown> {
  return apiRequest(`/api/${resource}`, {
    method: 'POST',
    token,
    body: JSON.stringify(payload)
  });
}

export async function uploadDocument(token: string, payload: FormData): Promise<DocumentItem> {
  const response = await fetch(resolveApiUrl('/api/documents/upload'), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: payload
  });

  if (!response.ok) {
    if (canUseBrowserDemoApi(response.status)) {
      return demoUploadDocument(payload);
    }

    const message = await response
      .json()
      .then((body) => body.message || 'Upload falhou')
      .catch(() => 'Upload falhou');
    throw new Error(message);
  }

  if (isHtmlFallbackResponse(response)) {
    return demoUploadDocument(payload);
  }

  return response.json();
}

export async function getTicket(token: string, id: string): Promise<Ticket> {
  return apiRequest(`/api/tickets/${id}`, { token });
}

export async function transitionTicket(
  token: string,
  id: string,
  payload: TicketTransitionPayload
): Promise<Ticket> {
  return apiRequest(`/api/tickets/${id}/transition`, {
    method: 'PUT',
    token,
    body: JSON.stringify(payload)
  });
}

export async function assignTicket(
  token: string,
  id: string,
  payload: TicketAssignPayload
): Promise<Ticket> {
  return apiRequest(`/api/tickets/${id}/assign`, {
    method: 'PUT',
    token,
    body: JSON.stringify(payload)
  });
}

export async function sendTicketMessage(
  token: string,
  id: string,
  payload: TicketMessagePayload
): Promise<Ticket> {
  return apiRequest(`/api/tickets/${id}/messages`, {
    method: 'POST',
    token,
    body: JSON.stringify(payload)
  });
}

export async function updateTicketChecklist(
  token: string,
  id: string,
  payload: TicketChecklistPayload
): Promise<Ticket> {
  return apiRequest(`/api/tickets/${id}/checklist/${payload.checklistItemId}`, {
    method: 'PUT',
    token,
    body: JSON.stringify({ completed: payload.completed })
  });
}

export async function confirmTicketResolution(
  token: string,
  id: string,
  payload: TicketResolutionPayload
): Promise<Ticket> {
  return apiRequest(`/api/tickets/${id}/confirm-resolution`, {
    method: 'POST',
    token,
    body: JSON.stringify(payload)
  });
}

export async function reopenTicket(
  token: string,
  id: string,
  payload: TicketReopenPayload
): Promise<Ticket> {
  return apiRequest(`/api/tickets/${id}/reopen`, {
    method: 'POST',
    token,
    body: JSON.stringify(payload)
  });
}

export async function uploadTicketAttachment(
  token: string,
  id: string,
  payload: FormData
): Promise<Ticket> {
  const response = await fetch(resolveApiUrl(`/api/tickets/${id}/attachments/upload`), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: payload
  });

  if (!response.ok) {
    if (canUseBrowserDemoApi(response.status)) {
      return demoUploadTicketAttachment(id, payload);
    }

    const message = await response
      .json()
      .then((body) => body.message || 'Upload da avaria falhou')
      .catch(() => 'Upload da avaria falhou');
    throw new Error(message);
  }

  if (isHtmlFallbackResponse(response)) {
    return demoUploadTicketAttachment(id, payload);
  }

  return response.json();
}

export async function getDocumentTemplates(token: string): Promise<DocumentTemplate[]> {
  return apiRequest('/api/documents/templates', { token });
}

export async function generateDocument(
  token: string,
  payload: GenerateDocumentPayload
): Promise<DocumentItem> {
  return apiRequest('/api/documents/generate', {
    method: 'POST',
    token,
    body: JSON.stringify(payload)
  });
}

export async function updateResource(
  token: string,
  resource: ResourceEndpoint,
  id: string,
  payload: Record<string, string | number>
): Promise<unknown> {
  return apiRequest(`/api/${resource}/${id}`, {
    method: 'PUT',
    token,
    body: JSON.stringify(payload)
  });
}

export async function deleteResource(
  token: string,
  resource: ResourceEndpoint,
  id: string
): Promise<unknown> {
  return apiRequest(`/api/${resource}/${id}`, {
    method: 'DELETE',
    token
  });
}

export async function readPendingTicketActions(): Promise<PendingTicketAction[]> {
  return readPendingActionsFromStorage();
}

export async function queuePendingTicketAction(
  action: Omit<PendingTicketAction, 'id' | 'createdAt' | 'status' | 'error'>
): Promise<PendingTicketAction> {
  if (action.type === 'attachment') {
    const payload = action.payload as TicketAttachmentUploadPayload;
    if (payload.sizeBytes > MAX_OFFLINE_ATTACHMENT_BYTES) {
      throw new Error('O ficheiro excede o limite offline de 8 MB. Tenta carregar quando estiveres online.');
    }
  }

  const actionId = createClientActionId();
  const pendingAction: PendingTicketAction = {
    ...action,
    id: actionId,
    payload: {
      ...action.payload,
      clientActionId: action.payload.clientActionId ?? actionId
    },
    createdAt: new Date().toISOString(),
    status: 'pending'
  };
  await savePendingTicketAction(pendingAction);

  return pendingAction;
}

export async function removePendingTicketAction(id: string): Promise<void> {
  await deletePendingTicketAction(id);
}

export async function syncPendingTicketActions(
  token: string
): Promise<{ synced: number; failed: number; remaining: number }> {
  const pending = await readPendingTicketActions();
  let synced = 0;
  let failed = 0;

  for (const action of pending) {
    try {
      await runPendingTicketAction(token, action);
      await removePendingTicketAction(action.id);
      synced += 1;
    } catch (err) {
      failed += 1;
      await savePendingTicketAction({
        ...action,
        status: 'failed',
        error: err instanceof Error ? err.message : 'Falha ao sincronizar'
      });
    }
  }

  const remaining = await readPendingTicketActions();
  return { synced, failed, remaining: remaining.length };
}

export async function updateActiveCondominium(token: string, name: string): Promise<string> {
  return apiRequest('/api/active-condominium', {
    method: 'PUT',
    token,
    body: JSON.stringify({ name })
  });
}

export async function getReportPreview(token: string, id: string): Promise<ReportPreview> {
  return apiRequest(`/api/reports/${id}/preview`, { token });
}

export async function getDocumentPreview(token: string, id: string): Promise<DocumentPreview> {
  return apiRequest(`/api/documents/${id}/preview`, { token });
}

export async function downloadDocument(
  token: string,
  id: string
): Promise<{ blob: Blob; filename: string }> {
  const response = await fetch(resolveApiUrl(`/api/documents/${id}/download`), {
    headers: {
      Accept: '*/*',
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    if (canUseBrowserDemoApi(response.status)) {
      return demoDownloadDocument(id);
    }

    const message = await response
      .json()
      .then((body) => body.message || 'Download falhou')
      .catch(() => 'Download falhou');
    throw new Error(message);
  }

  if (isHtmlFallbackResponse(response)) {
    return demoDownloadDocument(id);
  }

  return {
    blob: await response.blob(),
    filename: filenameFromDisposition(response.headers.get('content-disposition'), 'gestisac-documento')
  };
}

export async function exportReport(
  token: string,
  id: string
): Promise<{ blob: Blob; filename: string }> {
  const response = await fetch(resolveApiUrl(`/api/reports/${id}/export`), {
    method: 'POST',
    headers: {
      Accept: 'text/csv',
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    if (canUseBrowserDemoApi(response.status)) {
      return demoExportReport(id);
    }

    const message = await response
      .json()
      .then((body) => body.message || 'Exportacao falhou')
      .catch(() => 'Exportacao falhou');
    throw new Error(message);
  }

  if (isHtmlFallbackResponse(response)) {
    return demoExportReport(id);
  }

  return {
    blob: await response.blob(),
    filename: filenameFromDisposition(response.headers.get('content-disposition'), 'gestisac-relatorio.csv')
  };
}

function filenameFromDisposition(disposition: string | null, fallback: string): string {
  return disposition?.match(/filename="?([^"]+)"?/)?.[1] ?? fallback;
}

async function readPendingActionsFromStorage(): Promise<PendingTicketAction[]> {
  if (typeof window === 'undefined') {
    return [];
  }

  if (!('indexedDB' in window)) {
    return readPendingActionsFromLocalStorage();
  }

  try {
    const db = await openPendingTicketDb();
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction(PENDING_TICKET_STORE, 'readonly');
      const request = transaction.objectStore(PENDING_TICKET_STORE).getAll();
      request.onsuccess = () => resolve((request.result as PendingTicketAction[]).sort(sortPendingAction));
      request.onerror = () => reject(request.error);
    });
  } catch {
    return readPendingActionsFromLocalStorage();
  }
}

async function savePendingTicketAction(action: PendingTicketAction): Promise<void> {
  if (typeof window === 'undefined') {
    return;
  }

  if (!('indexedDB' in window)) {
    writePendingActionsToLocalStorage([
      ...readPendingActionsFromLocalStorage().filter((item) => item.id !== action.id),
      action
    ]);
    return;
  }

  try {
    const db = await openPendingTicketDb();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(PENDING_TICKET_STORE, 'readwrite');
      const request = transaction.objectStore(PENDING_TICKET_STORE).put(action);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch {
    writePendingActionsToLocalStorage([
      ...readPendingActionsFromLocalStorage().filter((item) => item.id !== action.id),
      withoutQueuedFile(action)
    ]);
  }
}

async function deletePendingTicketAction(id: string): Promise<void> {
  if (typeof window === 'undefined') {
    return;
  }

  if ('indexedDB' in window) {
    try {
      const db = await openPendingTicketDb();
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(PENDING_TICKET_STORE, 'readwrite');
        const request = transaction.objectStore(PENDING_TICKET_STORE).delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch {
      // LocalStorage fallback below keeps deletion best-effort across browsers.
    }
  }

  writePendingActionsToLocalStorage(readPendingActionsFromLocalStorage().filter((action) => action.id !== id));
}

function openPendingTicketDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(PENDING_TICKET_DB_NAME, PENDING_TICKET_DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(PENDING_TICKET_STORE)) {
        const store = db.createObjectStore(PENDING_TICKET_STORE, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
        store.createIndex('ticketId', 'ticketId', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function readPendingActionsFromLocalStorage(): PendingTicketAction[] {
  const stored = localStorage.getItem(PENDING_TICKET_ACTIONS_KEY);
  if (!stored) {
    return [];
  }

  try {
    return (JSON.parse(stored) as PendingTicketAction[]).sort(sortPendingAction);
  } catch {
    localStorage.removeItem(PENDING_TICKET_ACTIONS_KEY);
    return [];
  }
}

function writePendingActionsToLocalStorage(actions: PendingTicketAction[]): void {
  localStorage.setItem(PENDING_TICKET_ACTIONS_KEY, JSON.stringify(actions.map(withoutQueuedFile)));
}

function withoutQueuedFile(action: PendingTicketAction): PendingTicketAction {
  if (action.type !== 'attachment') {
    return action;
  }

  const payload = action.payload as TicketAttachmentUploadPayload;
  return {
    ...action,
    status: 'failed',
    error: action.error ?? 'O browser nao suportou IndexedDB para guardar o ficheiro offline.',
    payload: {
      ...payload,
      file: undefined
    }
  };
}

function sortPendingAction(left: PendingTicketAction, right: PendingTicketAction): number {
  return left.createdAt.localeCompare(right.createdAt);
}

function createClientActionId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `ticket-action-${Date.now()}-${Math.round(Math.random() * 1_000_000)}`;
}

async function runPendingTicketAction(token: string, action: PendingTicketAction): Promise<void> {
  if (action.type === 'transition') {
    await transitionTicket(token, action.ticketId, action.payload as TicketTransitionPayload);
    return;
  }

  if (action.type === 'assign') {
    await assignTicket(token, action.ticketId, action.payload as TicketAssignPayload);
    return;
  }

  if (action.type === 'message') {
    await sendTicketMessage(token, action.ticketId, action.payload as TicketMessagePayload);
    return;
  }

  if (action.type === 'checklist') {
    await updateTicketChecklist(token, action.ticketId, action.payload as TicketChecklistPayload);
    return;
  }

  if (action.type === 'confirmResolution') {
    await confirmTicketResolution(token, action.ticketId, action.payload as TicketResolutionPayload);
    return;
  }

  if (action.type === 'reopen') {
    await reopenTicket(token, action.ticketId, action.payload as TicketReopenPayload);
    return;
  }

  const payload = action.payload as TicketAttachmentUploadPayload;
  if (!payload.file) {
    throw new Error('Ficheiro offline indisponivel. Repete o upload quando estiveres online.');
  }

  const formData = new FormData();
  formData.set('kind', payload.kind ?? 'Foto antes');
  formData.set('caption', payload.caption ?? '');
  formData.set('clientActionId', payload.clientActionId ?? action.id);
  formData.set('file', payload.file, payload.fileName);
  await uploadTicketAttachment(token, action.ticketId, formData);
}

async function apiRequest<T>(
  path: string,
  options: {
    method?: string;
    token?: string;
    body?: BodyInit;
  } = {}
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json'
  };

  if (options.body) {
    headers['Content-Type'] = 'application/json';
  }

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  let response: Response;
  try {
    response = await fetch(resolveApiUrl(path), {
      method: options.method ?? 'GET',
      headers,
      body: options.body
    });
  } catch (error) {
    if (canUseBrowserDemoApi()) {
      return demoApiRequest<T>(path, options);
    }

    throw error;
  }

  if (!response.ok) {
    if (canUseBrowserDemoApi(response.status)) {
      return demoApiRequest<T>(path, options);
    }

    const message = await response
      .json()
      .then((body) => body.message || 'Pedido falhou')
      .catch(() => 'Pedido falhou');
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  if (isHtmlFallbackResponse(response)) {
    return demoApiRequest<T>(path, options);
  }

  return response.json().catch((error) => {
    if (canUseBrowserDemoApi()) {
      return demoApiRequest<T>(path, options);
    }

    throw error;
  });
}

function resolveApiUrl(path: string): string {
  if (!API_BASE_URL) {
    return path;
  }

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return `${API_BASE_URL}${path}`;
}

function isHtmlFallbackResponse(response: Response): boolean {
  return !API_BASE_URL &&
    typeof window !== 'undefined' &&
    response.headers.get('content-type')?.toLowerCase().includes('text/html') === true;
}

const DEMO_STORE_KEY = 'gestisac.publicDemoStore.v1';
const DEMO_TOKEN = 'gestisac-demo-access-token';
const DEMO_REFRESH_TOKEN = 'gestisac-demo-refresh-token';

type DemoStore = Omit<ResourceState, 'permissions'> & {
  user: PublicUser;
  activeCondominium: string;
  permissions: PermissionsResponse;
};

function canUseBrowserDemoApi(status = 0): boolean {
  return !API_BASE_URL && typeof window !== 'undefined' && (status === 0 || status >= 400);
}

async function demoApiRequest<T>(
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

  if (pathname === 'operations/metrics') {
    return buildDemoOperationsMetrics(store) as T;
  }

  if (pathname === 'operations/feed') {
    return buildDemoOperationsFeed(store, url.searchParams.get('since') ?? '') as T;
  }

  if (pathname === 'qr-zones') {
    return buildDemoQrZones(store) as T;
  }

  const ticketTimelineMatch = pathname.match(/^tickets\/([^/]+)\/timeline$/);
  if (ticketTimelineMatch) {
    const ticket = store.tickets.find((item) => item.id === ticketTimelineMatch[1]);
    return (ticket?.timeline ?? []) as T;
  }

  const ticketTransitionMatch = pathname.match(/^tickets\/([^/]+)\/transition$/);
  if (ticketTransitionMatch && method === 'PUT') {
    const ticket = updateDemoTicket(store, ticketTransitionMatch[1], (item) => {
      if (hasDemoClientAction(item, body.clientActionId)) {
        return;
      }
      const status = String(body.status ?? item.status);
      item.status = status;
      item.updatedAt = new Date().toISOString();
      if (status === 'Resolvida') {
        item.resolvedAt = item.updatedAt;
      }
      appendDemoTicketEvent(
        item,
        'StatusChanged',
        `Estado atualizado para ${status}`,
        String(body.note ?? item.detail),
        'GESTISAC Demo',
        String(body.clientActionId ?? '')
      );
    });
    saveDemoStore(store);
    return ticket as T;
  }

  const ticketAssignMatch = pathname.match(/^tickets\/([^/]+)\/assign$/);
  if (ticketAssignMatch && method === 'PUT') {
    const ticket = updateDemoTicket(store, ticketAssignMatch[1], (item) => {
      if (hasDemoClientAction(item, body.clientActionId)) {
        return;
      }
      item.assignedTechnician = String(body.technician ?? '').trim();
      item.status = 'Atribuida';
      item.updatedAt = new Date().toISOString();
      appendDemoTicketEvent(
        item,
        'Assigned',
        'Tecnico atribuido',
        String(body.note ?? `Responsavel: ${item.assignedTechnician}`),
        'GESTISAC Demo',
        String(body.clientActionId ?? '')
      );
    });
    saveDemoStore(store);
    return ticket as T;
  }

  const ticketMessageMatch = pathname.match(/^tickets\/([^/]+)\/messages$/);
  if (ticketMessageMatch && method === 'POST') {
    const ticket = updateDemoTicket(store, ticketMessageMatch[1], (item) => {
      if (hasDemoClientAction(item, body.clientActionId)) {
        return;
      }
      const message = String(body.message ?? '').trim();
      const author = String(body.author ?? store.user.name);
      item.messages.unshift({
        id: createDemoId('msg'),
        author,
        role: String(body.role ?? store.user.role),
        message,
        createdAt: new Date().toISOString()
      });
      item.updatedAt = new Date().toISOString();
      appendDemoTicketEvent(
        item,
        'MessageAdded',
        'Mensagem adicionada',
        message,
        author,
        String(body.clientActionId ?? '')
      );
    });
    saveDemoStore(store);
    return ticket as T;
  }

  const ticketChecklistMatch = pathname.match(/^tickets\/([^/]+)\/checklist\/([^/]+)$/);
  if (ticketChecklistMatch && method === 'PUT') {
    const ticket = updateDemoTicket(store, ticketChecklistMatch[1], (item) => {
      if (hasDemoClientAction(item, body.clientActionId)) {
        return;
      }
      const checklistItem = item.checklist.find((entry) => entry.id === ticketChecklistMatch[2]);
      if (!checklistItem) {
        throw new Error('Item de checklist nao encontrado');
      }
      checklistItem.completed = Boolean(body.completed);
      item.updatedAt = new Date().toISOString();
      appendDemoTicketEvent(
        item,
        'ChecklistUpdated',
        'Checklist atualizada',
        `${checklistItem.label}: ${checklistItem.completed ? 'concluido' : 'pendente'}`,
        'GESTISAC Demo',
        String(body.clientActionId ?? '')
      );
    });
    saveDemoStore(store);
    return ticket as T;
  }

  const ticketConfirmMatch = pathname.match(/^tickets\/([^/]+)\/confirm-resolution$/);
  if (ticketConfirmMatch && method === 'POST') {
    const ticket = updateDemoTicket(store, ticketConfirmMatch[1], (item) => {
      if (hasDemoClientAction(item, body.clientActionId)) {
        return;
      }
      const confirmed = Boolean(body.confirmed);
      item.status = confirmed ? 'Confirmada' : 'Reaberta';
      item.updatedAt = new Date().toISOString();
      if (confirmed) {
        item.confirmedAt = item.updatedAt;
        item.customerProfile.validReports += 1;
      } else {
        item.customerProfile.reopenedReports += 1;
      }
      item.customerProfile.lastInteraction = item.updatedAt;
      appendDemoTicketEvent(
        item,
        confirmed ? 'ResolutionConfirmed' : 'ResolutionRejected',
        confirmed ? 'Resolucao confirmada pelo morador' : 'Resolucao rejeitada pelo morador',
        String(body.comment ?? 'Sem comentario final'),
        'GESTISAC Demo',
        String(body.clientActionId ?? '')
      );
    });
    saveDemoStore(store);
    return ticket as T;
  }

  const ticketReopenMatch = pathname.match(/^tickets\/([^/]+)\/reopen$/);
  if (ticketReopenMatch && method === 'POST') {
    const ticket = updateDemoTicket(store, ticketReopenMatch[1], (item) => {
      if (hasDemoClientAction(item, body.clientActionId)) {
        return;
      }
      item.status = 'Reaberta';
      item.updatedAt = new Date().toISOString();
      item.customerProfile.reopenedReports += 1;
      item.customerProfile.lastInteraction = item.updatedAt;
      appendDemoTicketEvent(
        item,
        'Reopened',
        'Avaria reaberta',
        String(body.reason ?? 'Sem motivo'),
        'GESTISAC Demo',
        String(body.clientActionId ?? '')
      );
    });
    saveDemoStore(store);
    return ticket as T;
  }

  const ticketDetailMatch = pathname.match(/^tickets\/([^/]+)$/);
  if (ticketDetailMatch && method === 'GET') {
    const ticket = store.tickets.find((item) => item.id === ticketDetailMatch[1]);
    if (!ticket) {
      throw new Error('Ticket nao encontrado');
    }
    return ticket as T;
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

function updateDemoTicket(store: DemoStore, id: string, mutate: (ticket: Ticket) => void): Ticket {
  const ticket = store.tickets.find((item) => item.id === id);
  if (!ticket) {
    throw new Error('Ticket nao encontrado');
  }

  mutate(ticket);
  appendDemoAudit(store, 'tickets', 'Atualizado', id, ticket.title);
  return ticket;
}

function hasDemoClientAction(ticket: Ticket, clientActionId: unknown): boolean {
  const normalized = String(clientActionId ?? '').trim();
  return Boolean(
    normalized &&
      ticket.timeline.some((event) => event.clientActionId === normalized)
  );
}

function appendDemoTicketEvent(
  ticket: Ticket,
  type: string,
  label: string,
  detail: string,
  actor = 'GESTISAC Demo',
  clientActionId = ''
): void {
  ticket.timeline.unshift({
    id: createDemoId('evt'),
    type,
    label,
    detail,
    actor,
    createdAt: new Date().toISOString(),
    clientActionId: clientActionId.trim() || null
  });
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
        priority: 'Critica',
        status: 'Atribuida',
        detail: 'Elevador parado desde as 08:20. Tecnico agendado para hoje.',
        updatedAt: '2026-05-15T10:30:00.000Z',
        category: 'Elevadores',
        location: 'Elevador Bloco B',
        resident: 'Carlos Almeida',
        reporterName: 'Carlos Almeida',
        assignedTechnician: 'Elevatec Lisboa',
        slaDueAt: '2026-05-15T16:30:00.000Z',
        slaState: 'SLA em risco',
        createdAt: '2026-05-15T08:20:00.000Z',
        resolvedAt: null,
        confirmedAt: null,
        isEmergency: true,
        timeline: [
          {
            id: 'evt-001',
            type: 'created',
            label: 'Avaria reportada',
            detail: 'Elevador parado desde as 08:20.',
            actor: 'Carlos Almeida',
            createdAt: '2026-05-15T08:20:00.000Z'
          },
          {
            id: 'evt-002',
            type: 'assigned',
            label: 'Tecnico atribuido',
            detail: 'Elevatec Lisboa recebeu a intervencao.',
            actor: 'Joao Silva',
            createdAt: '2026-05-15T10:30:00.000Z'
          }
        ],
        attachments: [
          {
            id: 'att-001',
            kind: 'beforePhoto',
            fileName: 'elevador-bloco-b-antes.jpg',
            mimeType: 'image/jpeg',
            url: '',
            caption: 'Painel do elevador indisponivel',
            uploadedBy: 'Carlos Almeida',
            uploadedAt: '2026-05-15T08:25:00.000Z',
            pendingSync: false
          }
        ],
        messages: [
          {
            id: 'msg-001',
            author: 'Joao Silva',
            role: 'Administrador',
            message: 'Fornecedor notificado. Acompanhamos chegada do tecnico.',
            createdAt: '2026-05-15T10:32:00.000Z'
          }
        ],
        checklist: [
          { id: 'chk-001', label: 'Confirmar elevador afetado', required: true, completed: true },
          { id: 'chk-002', label: 'Contactar fornecedor certificado', required: true, completed: true },
          { id: 'chk-003', label: 'Validar reposicao do servico', required: true, completed: false }
        ],
        customerProfile: {
          validReports: 3,
          reopenedReports: 0,
          falseAlarms: 0,
          internalNotes: 'Reportes objetivos e com fotografia.',
          lastInteraction: '2026-05-15T10:32:00.000Z'
        }
      },
      {
        id: 'ticket-002',
        title: 'Infiltracao na garagem',
        condominium: 'Condominio Vila Verde',
        priority: 'Alta',
        status: 'Em analise',
        detail: 'Pedido de vistoria aberto para a garagem -1.',
        updatedAt: '2026-05-14T16:10:00.000Z',
        category: 'Agua e infiltracoes',
        location: 'Garagem - piso -1',
        resident: 'Maria Fernandes',
        reporterName: 'Maria Fernandes',
        assignedTechnician: '',
        slaDueAt: '2026-05-16T16:10:00.000Z',
        slaState: 'Proximo do limite',
        createdAt: '2026-05-14T16:10:00.000Z',
        resolvedAt: null,
        confirmedAt: null,
        isEmergency: false,
        timeline: [
          {
            id: 'evt-003',
            type: 'created',
            label: 'Avaria reportada',
            detail: 'Infiltracao visivel na zona de garagem.',
            actor: 'Maria Fernandes',
            createdAt: '2026-05-14T16:10:00.000Z'
          }
        ],
        attachments: [],
        messages: [],
        checklist: [
          { id: 'chk-004', label: 'Localizar origem provavel', required: true, completed: false },
          { id: 'chk-005', label: 'Registar fotos antes da intervencao', required: true, completed: false }
        ],
        customerProfile: {
          validReports: 1,
          reopenedReports: 0,
          falseAlarms: 0,
          internalNotes: '',
          lastInteraction: '2026-05-14T16:10:00.000Z'
        }
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
    operations: {
      metrics: {
        openTickets: 0,
        emergencies: 0,
        slaAtRisk: 0,
        activeTechnicians: 0,
        averageResolutionLabel: 'Demo local'
      },
      feed: [],
      qrZones: []
    },
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

function buildDemoOperationsMetrics(store: DemoStore): OperationsMetrics {
  const openTickets = store.tickets.filter((ticket) => !isClosedDemoStatus(ticket.status)).length;
  const emergencies = store.tickets.filter((ticket) => ticket.isEmergency).length;
  const slaAtRisk = store.tickets.filter((ticket) =>
    ['SLA em risco', 'SLA expirado'].includes(ticket.slaState)
  ).length;
  const activeTechnicians = new Set(
    store.tickets
      .filter((ticket) => ticket.assignedTechnician && !isClosedDemoStatus(ticket.status))
      .map((ticket) => ticket.assignedTechnician)
  ).size;

  return {
    openTickets,
    emergencies,
    slaAtRisk,
    activeTechnicians,
    averageResolutionLabel: 'Base demo preparada para medir tempos reais'
  };
}

function buildDemoOperationsFeed(store: DemoStore, since = ''): OperationsFeedItem[] {
  return store.tickets
    .flatMap((ticket) =>
      (ticket.timeline ?? []).map((event) => ({
        id: event.id,
        ticketId: ticket.id,
        type: event.type,
        title: ticket.title,
        detail: `${event.label} - ${event.detail}`,
        tone: ticket.isEmergency ? 'danger' : ticket.slaState.includes('risco') ? 'warning' : 'blue',
        createdAt: event.createdAt
      }))
    )
    .filter((event) => !since.trim() || event.createdAt > since)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, 30);
}

function buildDemoQrZones(store: DemoStore): QrZone[] {
  const condominium = store.activeCondominium || 'Condominio Vila Verde';
  return ['Garagem', 'Elevador', 'Entrada', 'Piscina', 'Quadro eletrico'].map((location) => ({
    id: `qr-${slugifyDemo(condominium)}-${slugifyDemo(location)}`,
    condominium,
    label: `QR ${location}`,
    location,
    ticketTemplate: `Avaria em ${location}`,
    qrPayload: `/condomino/avarias?condominium=${encodeURIComponent(condominium)}&location=${encodeURIComponent(location)}&template=${encodeURIComponent(`Avaria em ${location}`)}`
  }));
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

async function demoUploadDocument(payload: FormData): Promise<DocumentItem> {
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

async function demoUploadTicketAttachment(id: string, payload: FormData): Promise<Ticket> {
  const store = readDemoStore();
  const file = payload.get('file');
  const uploadedFile = file instanceof File ? file : null;
  const ticket = updateDemoTicket(store, id, (item) => {
    const clientActionId = String(payload.get('clientActionId') ?? '');
    if (hasDemoClientAction(item, clientActionId)) {
      return;
    }
    const attachmentId = createDemoId('att');
    const fileName = uploadedFile?.name ?? 'avaria-demo.txt';
    item.attachments.unshift({
      id: attachmentId,
      kind: String(payload.get('kind') || 'Foto antes'),
      fileName,
      mimeType: uploadedFile?.type || 'text/plain',
      url: `/api/tickets/${id}/attachments/${attachmentId}/download`,
      storageKey: `demo/${slugifyDemo(fileName)}`,
      sizeBytes: uploadedFile?.size ?? 512,
      caption: String(payload.get('caption') || 'Anexo registado na demo'),
      uploadedBy: store.user.name,
      uploadedAt: new Date().toISOString(),
      pendingSync: false
    });
    item.updatedAt = new Date().toISOString();
    appendDemoTicketEvent(item, 'AttachmentAdded', 'Ficheiro carregado', fileName, store.user.name, clientActionId);
  });
  saveDemoStore(store);
  return ticket;
}

function createDemoGeneratedDocument(
  store: DemoStore,
  payload: Record<string, unknown>
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

function demoDownloadDocument(id: string): { blob: Blob; filename: string } {
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

function demoExportReport(id: string): { blob: Blob; filename: string } {
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

function isClosedDemoStatus(value: string): boolean {
  const normalized = value.toLowerCase();
  return normalized.includes('resolvida') ||
    normalized.includes('confirmada') ||
    normalized.includes('fechada') ||
    normalized.includes('conclu');
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
