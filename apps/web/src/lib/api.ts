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
    permissions
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
    apiRequest<PermissionsResponse>('/api/permissions', { token })
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
    permissions
  };
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
  const response = await fetch('/api/documents/upload', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: payload
  });

  if (!response.ok) {
    const message = await response
      .json()
      .then((body) => body.message || 'Upload falhou')
      .catch(() => 'Upload falhou');
    throw new Error(message);
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
  const response = await fetch(`/api/documents/${id}/download`, {
    headers: {
      Accept: '*/*',
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const message = await response
      .json()
      .then((body) => body.message || 'Download falhou')
      .catch(() => 'Download falhou');
    throw new Error(message);
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
  const response = await fetch(`/api/reports/${id}/export`, {
    method: 'POST',
    headers: {
      Accept: 'text/csv',
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const message = await response
      .json()
      .then((body) => body.message || 'Exportacao falhou')
      .catch(() => 'Exportacao falhou');
    throw new Error(message);
  }

  return {
    blob: await response.blob(),
    filename: filenameFromDisposition(response.headers.get('content-disposition'), 'gestisac-relatorio.csv')
  };
}

function filenameFromDisposition(disposition: string | null, fallback: string): string {
  return disposition?.match(/filename="?([^"]+)"?/)?.[1] ?? fallback;
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

  const response = await fetch(path, {
    method: options.method ?? 'GET',
    headers,
    body: options.body
  });

  if (!response.ok) {
    const message = await response
      .json()
      .then((body) => body.message || 'Pedido falhou')
      .catch(() => 'Pedido falhou');
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}
