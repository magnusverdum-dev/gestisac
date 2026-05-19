import { apiRequest } from './http';
import { getAccounting } from './accounting';
import { getResourcePage } from './pagination';
import type {
  Assembly,
  AuditLogEntry,
  Building,
  Condominium,
  DocumentItem,
  Fraction,
  MaintenanceItem,
  PermissionsResponse,
  Report,
  Resident,
  ResourceState,
  Supplier,
  Ticket
} from './types';

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
