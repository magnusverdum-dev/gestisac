import { apiRequest } from './http';
import { getAccounting } from './accounting';
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
  const condominiums = await loadOrFallback(
    'condominios',
    () => getResourcePage<Condominium>(token, '/api/condominiums'),
    [],
    loadWarnings
  );
  const buildings = await loadOrFallback('edificios', () => getResourcePage<Building>(token, '/api/buildings'), [], loadWarnings);
  const fractions = await loadOrFallback('fracoes', () => getResourcePage<Fraction>(token, '/api/fractions'), [], loadWarnings);
  const residents = await loadOrFallback('residentes', () => getResourcePage<Resident>(token, '/api/residents'), [], loadWarnings);
  const tickets = await loadOrFallback('tickets', () => getResourcePage<Ticket>(token, '/api/tickets'), [], loadWarnings);
  const ocorrencias = await loadOrFallback(
    'ocorrencias',
    () => listarOcorrencias(token).then((paginated) => paginated.data),
    [],
    loadWarnings
  );
  const suppliers = await loadOrFallback('fornecedores', () => getResourcePage<Supplier>(token, '/api/suppliers'), [], loadWarnings);
  const documents = await loadOrFallback('documentos', () => getResourcePage<DocumentItem>(token, '/api/documents'), [], loadWarnings);
  const reports = await loadOrFallback('relatorios', () => getResourcePage<Report>(token, '/api/reports'), [], loadWarnings);
  const maintenance = await loadOrFallback(
    'manutencoes',
    () => getResourcePage<MaintenanceItem>(token, '/api/maintenance'),
    [],
    loadWarnings
  );
  const inspections = await loadOrFallback(
    'vistorias',
    () => getResourcePage<InspectionItem>(token, '/api/inspections'),
    [],
    loadWarnings
  );
  const calendarEvents = await loadOrFallback(
    'calendario',
    () => getResourcePage<CalendarEvent>(token, '/api/calendar-events'),
    [],
    loadWarnings
  );
  const assemblies = await loadOrFallback(
    'assembleias',
    () => getResourcePage<Assembly>(token, '/api/assemblies'),
    [],
    loadWarnings
  );
  const accounting = await loadOrFallback('contabilidade', () => getAccounting(token), emptyAccounting, loadWarnings);
  const auditLog = await loadOrFallback(
    'auditoria',
    () => getResourcePage<AuditLogEntry>(token, '/api/audit-log', 1, 25),
    [],
    loadWarnings
  );
  const permissions = await loadOrFallback<PermissionsResponse>(
    'permissoes',
    () => apiRequest('/api/permissions', { token }),
    {
      role: '',
      modules: []
    },
    loadWarnings
  );

  return {
    condominiums,
    buildings,
    fractions,
    residents,
    tickets,
    ocorrencias,
    suppliers,
    documents,
    reports,
    maintenance,
    inspections,
    calendarEvents,
    assemblies,
    accounting,
    auditLog,
    permissions,
    loadWarnings
  };
}
