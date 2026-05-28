import type { ResourceEndpoint, ResourceState } from './api';

export type EntityType =
  | 'ticket'
  | 'maintenance'
  | 'inspection'
  | 'calendarEvent'
  | 'condominium'
  | 'resident'
  | 'supplier'
  | 'document'
  | 'report'
  | 'accounting'
  | 'profile';

export type TicketStatusGroup = 'abertos' | 'pendentes' | 'resolvidos' | 'fechados';

export type EntityRouteMatch =
  | { kind: 'detail'; entityType: EntityType; id: string; basePath: string; subtype?: string }
  | { kind: 'ticketStatus'; group: TicketStatusGroup; basePath: '/tickets' }
  | { kind: 'ticketPriority'; priority: string; basePath: '/tickets' }
  | { kind: 'maintenanceStatus'; status: string; basePath: '/manutencao' }
  | { kind: 'calendarType'; eventType: string; basePath: '/calendario' }
  | { kind: 'base'; basePath: string };

const ticketGroups: TicketStatusGroup[] = ['abertos', 'pendentes', 'resolvidos', 'fechados'];

export function encodeRoutePart(value: string): string {
  return encodeURIComponent(value.trim());
}

export function decodeRoutePart(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'sem-identificador';
}

export function entityPath(type: EntityType, id: string, subtype = ''): string {
  const safeId = encodeRoutePart(id);

  switch (type) {
    case 'ticket':
      return `/tickets/registo/${safeId}`;
    case 'maintenance':
      return `/manutencao/registo/${safeId}`;
    case 'inspection':
      return `/vistorias/registo/${safeId}`;
    case 'calendarEvent':
      return `/calendario/evento/${safeId}`;
    case 'condominium':
      return `/condominios/${safeId}`;
    case 'resident':
    case 'profile':
      return `/moradores/${safeId}`;
    case 'supplier':
      return `/fornecedores/${safeId}`;
    case 'document':
      return `/documentos/${safeId}`;
    case 'report':
      return `/relatorios/${safeId}`;
    case 'accounting':
      return `/contabilidade/${encodeRoutePart(subtype || 'movimento')}/${safeId}`;
    default:
      return '/dashboard';
  }
}

export function ticketStatusPath(group: TicketStatusGroup): string {
  return `/tickets/estado/${group}`;
}

export function ticketPriorityPath(priority: string): string {
  return `/tickets/prioridade/${slugify(priority)}`;
}

export function maintenanceStatusPath(status: string): string {
  return `/manutencao/estado/${slugify(status)}`;
}

export function calendarTypePath(eventType: string): string {
  return `/calendario/tipo/${slugify(eventType)}`;
}

export function matchEntityRoute(path: string): EntityRouteMatch {
  const normalized = path === '/' ? '/dashboard' : path.split('?', 1)[0].split('#', 1)[0] || '/dashboard';
  const parts = normalized.split('/').filter(Boolean).map(decodeRoutePart);

  if (parts[0] === 'tickets' && parts[1] === 'registo' && parts[2]) {
    return { kind: 'detail', entityType: 'ticket', id: parts[2], basePath: '/tickets' };
  }
  if (parts[0] === 'tickets' && parts[1] === 'estado' && ticketGroups.includes(parts[2] as TicketStatusGroup)) {
    return { kind: 'ticketStatus', group: parts[2] as TicketStatusGroup, basePath: '/tickets' };
  }
  if (parts[0] === 'tickets' && parts[1] === 'prioridade' && parts[2]) {
    return { kind: 'ticketPriority', priority: titleFromSlug(parts[2]), basePath: '/tickets' };
  }
  if (parts[0] === 'manutencao' && parts[1] === 'registo' && parts[2]) {
    return { kind: 'detail', entityType: 'maintenance', id: parts[2], basePath: '/manutencao' };
  }
  if (parts[0] === 'vistorias' && parts[1] === 'registo' && parts[2]) {
    return { kind: 'detail', entityType: 'inspection', id: parts[2], basePath: '/vistorias' };
  }
  if (parts[0] === 'manutencao' && parts[1] === 'estado' && parts[2]) {
    return { kind: 'maintenanceStatus', status: titleFromSlug(parts[2]), basePath: '/manutencao' };
  }
  if (parts[0] === 'calendario' && parts[1] === 'evento' && parts[2]) {
    return { kind: 'detail', entityType: 'calendarEvent', id: parts[2], basePath: '/calendario' };
  }
  if (parts[0] === 'calendario' && parts[1] === 'tipo' && parts[2]) {
    return { kind: 'calendarType', eventType: titleFromSlug(parts[2]), basePath: '/calendario' };
  }
  if (parts[0] === 'condominios' && parts[1]) {
    return { kind: 'detail', entityType: 'condominium', id: parts[1], basePath: '/condominios' };
  }
  if (parts[0] === 'moradores' && parts[1]) {
    return { kind: 'detail', entityType: 'resident', id: parts[1], basePath: '/condominios' };
  }
  if (parts[0] === 'fornecedores' && parts[1]) {
    return { kind: 'detail', entityType: 'supplier', id: parts[1], basePath: '/fornecedores' };
  }
  if (parts[0] === 'documentos' && parts[1]) {
    return { kind: 'detail', entityType: 'document', id: parts[1], basePath: '/documentos' };
  }
  if (parts[0] === 'relatorios' && parts[1]) {
    return { kind: 'detail', entityType: 'report', id: parts[1], basePath: '/relatorios' };
  }
  if (parts[0] === 'contabilidade' && parts[1] && parts[2]) {
    return { kind: 'detail', entityType: 'accounting', id: parts[2], subtype: parts[1], basePath: '/contabilidade' };
  }

  return { kind: 'base', basePath: normalized };
}

export function isTicketClosed(status: string): boolean {
  const normalized = normalize(status);
  return normalized.includes('resolvido') || normalized.includes('fechado');
}

export function isTicketPending(status: string): boolean {
  const normalized = normalize(status);
  return normalized.includes('pendente') || normalized.includes('espera');
}

export function isTicketOpen(status: string): boolean {
  const normalized = normalize(status);
  return (
    normalized === 'novo' ||
    normalized === 'aberto' ||
    normalized.includes('curso') ||
    normalized.includes('analise') ||
    (!isTicketClosed(status) && !isTicketPending(status))
  );
}

export function ticketMatchesGroup(status: string, group: TicketStatusGroup): boolean {
  if (group === 'abertos') {
    return isTicketOpen(status);
  }
  if (group === 'pendentes') {
    return isTicketPending(status);
  }
  return isTicketClosed(status);
}

export function isMaintenanceClosed(status: string): boolean {
  const normalized = normalize(status);
  return normalized.includes('concluida') || normalized.includes('cancelada') || normalized.includes('conclu') || normalized.includes('cancel');
}

export function isCalendarClosed(status: string): boolean {
  const normalized = normalize(status);
  return normalized.includes('concluido') || normalized.includes('cancelado') || normalized.includes('conclu') || normalized.includes('cancel');
}

export function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function personPath(resources: ResourceState, name?: string, email?: string): string {
  const resident = findResident(resources, name, email);
  if (resident) {
    return entityPath('resident', resident.id);
  }

  const label = name?.trim() || email?.trim() || 'perfil-operacional';
  return entityPath('profile', `perfil-${slugify(label)}`);
}

export function supplierPath(resources: ResourceState, supplierName?: string): string {
  const supplier = resources.suppliers.find((item) => normalize(item.name) === normalize(supplierName ?? ''));
  return supplier ? entityPath('supplier', supplier.id) : entityPath('supplier', `fornecedor-${slugify(supplierName || 'por-definir')}`);
}

export function condominiumPath(resources: ResourceState, condominiumName?: string): string {
  const condominium = resources.condominiums.find((item) => normalize(item.name) === normalize(condominiumName ?? ''));
  return condominium ? entityPath('condominium', condominium.id) : '/condominios';
}

export function pathForRecord(resource: ResourceEndpoint | undefined, id: string | undefined, pagePath: string, values: Record<string, unknown> = {}): string {
  if (!id) {
    return pagePath;
  }

  switch (resource) {
    case 'tickets':
      return entityPath('ticket', id);
    case 'ocorrencias':
      return entityPath('ticket', id);
    case 'maintenance':
      return entityPath('maintenance', id);
    case 'inspections':
      return entityPath('inspection', id);
    case 'calendar-events':
      return entityPath('calendarEvent', id);
    case 'condominiums':
      return entityPath('condominium', id);
    case 'residents':
      return entityPath('resident', id);
    case 'suppliers':
      return entityPath('supplier', id);
    case 'documents':
      return entityPath('document', id);
    case 'reports':
      return entityPath('report', id);
    case 'accounting/debts':
      return entityPath('accounting', id, 'dividas');
    case 'accounting/expenses':
      return entityPath('accounting', id, 'despesas');
    case 'accounting/quotas':
      return entityPath('accounting', id, 'quotas');
    case 'accounting/payments':
      return entityPath('accounting', id, 'pagamentos');
    case 'accounting/receipts':
      return entityPath('accounting', id, 'recibos');
    default: {
      const resourceHint = String(values.resource ?? '').trim();
      return resourceHint ? `/${resourceHint}/${encodeRoutePart(id)}` : pagePath;
    }
  }
}

export function findResident(resources: ResourceState, name?: string, email?: string) {
  const normalizedName = normalize(name ?? '');
  const normalizedEmail = normalize(email ?? '');

  return resources.residents.find((resident) => {
    const nameMatches = normalizedName && normalize(resident.name) === normalizedName;
    const emailMatches = normalizedEmail && normalize(resident.email) === normalizedEmail;
    return Boolean(nameMatches || emailMatches);
  });
}

export function titleFromSlug(value: string): string {
  return value
    .split('-')
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}
