import { apiRequest } from './http';
import { getAccounting } from './accounting';
import { loadInBatches } from './batch';
import { getResourcePage } from './pagination';
import { listarOcorrencias } from './ocorrencias';
import type {
  Assembly,
  AuditLogEntry,
  Building,
  CalendarEvent,
  Condominium,
  DocumentItem,
  Fraction,
  InspectionItem,
  MaintenanceItem,
  Ocorrencia,
  PermissionsResponse,
  Report,
  Resident,
  ResourceState,
  Supplier,
  TeamMember,
  Ticket
} from './types';

const emptyAccounting = {
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
};
const INITIAL_RESOURCE_TIMEOUT_MS = 6_000;

async function loadOrFallback<T>(
  label: string,
  load: () => Promise<T>,
  fallback: T,
  warnings: string[]
): Promise<T> {
  try {
    return await load();
  } catch {
    warnings.push(label);
    return fallback;
  }
}

export async function getResources(token: string): Promise<ResourceState> {
  const loadWarnings: string[] = [];
  const loaded = await loadInBatches({
    condominiums: () =>
      loadOrFallback(
        'condominios',
        () => getResourcePage<Condominium>(token, '/api/condominiums', 1, 50, '', INITIAL_RESOURCE_TIMEOUT_MS),
        [],
        loadWarnings
      ),
    buildings: () => loadOrFallback('edificios', () => getResourcePage<Building>(token, '/api/buildings', 1, 50, '', INITIAL_RESOURCE_TIMEOUT_MS), [], loadWarnings),
    fractions: () => loadOrFallback('fracoes', () => getResourcePage<Fraction>(token, '/api/fractions', 1, 50, '', INITIAL_RESOURCE_TIMEOUT_MS), [], loadWarnings),
    residents: () => loadOrFallback('residentes', () => getResourcePage<Resident>(token, '/api/residents', 1, 50, '', INITIAL_RESOURCE_TIMEOUT_MS), [], loadWarnings),
    team: () => loadOrFallback('equipa', () => getResourcePage<TeamMember>(token, '/api/team', 1, 50, '', INITIAL_RESOURCE_TIMEOUT_MS), [], loadWarnings),
    tickets: () => loadOrFallback('tickets', () => getResourcePage<Ticket>(token, '/api/tickets', 1, 50, '', INITIAL_RESOURCE_TIMEOUT_MS), [], loadWarnings),
    ocorrencias: () =>
      loadOrFallback<Ocorrencia[]>(
        'ocorrencias',
        () => listarOcorrencias(token).then((paginated) => paginated.data),
        [],
        loadWarnings
      ),
    suppliers: () => loadOrFallback('fornecedores', () => getResourcePage<Supplier>(token, '/api/suppliers', 1, 50, '', INITIAL_RESOURCE_TIMEOUT_MS), [], loadWarnings),
    documents: () => loadOrFallback('documentos', () => getResourcePage<DocumentItem>(token, '/api/documents', 1, 50, '', INITIAL_RESOURCE_TIMEOUT_MS), [], loadWarnings),
    reports: () => loadOrFallback('relatorios', () => getResourcePage<Report>(token, '/api/reports', 1, 50, '', INITIAL_RESOURCE_TIMEOUT_MS), [], loadWarnings),
    maintenance: () =>
      loadOrFallback(
        'manutencoes',
        () => getResourcePage<MaintenanceItem>(token, '/api/maintenance', 1, 50, '', INITIAL_RESOURCE_TIMEOUT_MS),
        [],
        loadWarnings
      ),
    inspections: () =>
      loadOrFallback(
        'vistorias',
        () => getResourcePage<InspectionItem>(token, '/api/inspections', 1, 50, '', INITIAL_RESOURCE_TIMEOUT_MS),
        [],
        loadWarnings
      ),
    calendarEvents: () =>
      loadOrFallback(
        'calendario',
        () => getResourcePage<CalendarEvent>(token, '/api/calendar-events', 1, 50, '', INITIAL_RESOURCE_TIMEOUT_MS),
        [],
        loadWarnings
      ),
    assemblies: () =>
      loadOrFallback(
        'assembleias',
        () => getResourcePage<Assembly>(token, '/api/assemblies', 1, 50, '', INITIAL_RESOURCE_TIMEOUT_MS),
        [],
        loadWarnings
      ),
    accounting: () => loadOrFallback('contabilidade', () => getAccounting(token), emptyAccounting, loadWarnings),
    auditLog: () =>
      loadOrFallback(
        'auditoria',
        () => getResourcePage<AuditLogEntry>(token, '/api/audit-log', 1, 25, '', INITIAL_RESOURCE_TIMEOUT_MS),
        [],
        loadWarnings
      ),
    permissions: () =>
      loadOrFallback<PermissionsResponse>(
        'permissoes',
        () => apiRequest('/api/permissions', { token }),
        {
          role: '',
          modules: []
        },
        loadWarnings
      )
  });

  return {
    ...loaded,
    loadWarnings
  };
}
