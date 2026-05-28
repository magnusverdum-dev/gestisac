import type { GlobalSearchResult, ResourceState } from '../lib/api';
import { entityPath } from '../lib/entity-navigation';

export function buildGlobalSearchResults(resources: ResourceState): GlobalSearchResult[] {
  return [
    ...resources.condominiums.map((item) => ({
      id: `condominium-${item.id}`,
      title: item.name,
      detail: `${item.location} - ${item.fractions} fracoes - ${item.status}`,
      path: entityPath('condominium', item.id),
      tone: 'blue'
    })),
    ...resources.residents.map((item) => ({
      id: `resident-${item.id}`,
      title: item.name,
      detail: `${item.condominium} - fracao ${item.fraction}`,
      path: entityPath('resident', item.id),
      tone: 'green'
    })),
    ...resources.tickets.map((item) => ({
      id: `ticket-${item.id}`,
      title: item.title,
      detail: `${item.condominium} - ${item.priority} - ${item.status}`,
      path: entityPath('ticket', item.id),
      tone: 'danger'
    })),
    ...resources.ocorrencias.map((item) => ({
      id: `ocorrencia-${item.id}`,
      title: item.titulo,
      detail: `${item.tipo} - ${item.prioridade} - ${item.status}`,
      path: entityPath('ticket', item.id),
      tone: item.tipo === 'avaria' ? 'danger' : 'gold'
    })),
    ...resources.maintenance.map((item) => ({
      id: `maintenance-${item.id}`,
      title: item.title,
      detail: `${item.supplier} - ${item.status} - ${item.date}`,
      path: entityPath('maintenance', item.id),
      tone: 'gold'
    })),
    ...resources.inspections.map((item) => ({
      id: `inspection-${item.id}`,
      title: item.title,
      detail: `${item.condominium || 'Geral'} - ${item.status} - ${item.requiredDate}`,
      path: entityPath('inspection', item.id),
      tone: 'blue'
    })),
    ...resources.calendarEvents.map((item) => ({
      id: `calendar-${item.id}`,
      title: item.title,
      detail: `${item.condominium || 'Geral'} - ${item.eventType} - ${item.status}`,
      path: entityPath('calendarEvent', item.id),
      tone: 'blue'
    })),
    ...resources.suppliers.map((item) => ({
      id: `supplier-${item.id}`,
      title: item.name,
      detail: `${item.category} - ${item.contact}`,
      path: entityPath('supplier', item.id),
      tone: 'blue'
    })),
    ...resources.documents.map((item) => ({
      id: `document-${item.id}`,
      title: item.title,
      detail: `${item.type} - ${item.condominium} - ${item.status}`,
      path: entityPath('document', item.id),
      tone: 'purple'
    })),
    ...resources.reports.map((item) => ({
      id: `report-${item.id}`,
      title: item.title,
      detail: `${item.period} - ${item.status}`,
      path: entityPath('report', item.id),
      tone: 'gold'
    })),
    ...resources.accounting.debts.map((item) => ({
      id: `debt-${item.id}`,
      title: `${item.resident} - divida`,
      detail: `${item.condominium} - ${formatCurrency(item.amount)} - ${item.status}`,
      path: entityPath('accounting', item.id, 'dividas'),
      tone: 'danger'
    })),
    ...resources.accounting.expenses.map((item) => ({
      id: `expense-${item.id}`,
      title: item.category,
      detail: `${item.supplier} - ${formatCurrency(item.amount)} - ${item.status}`,
      path: entityPath('accounting', item.id, 'despesas'),
      tone: 'gold'
    }))
  ];
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0
  }).format(value);
}
