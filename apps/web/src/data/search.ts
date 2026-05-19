import type { GlobalSearchResult, ResourceState } from '../lib/api';

export function buildGlobalSearchResults(resources: ResourceState): GlobalSearchResult[] {
  return [
    ...resources.condominiums.map((item) => ({
      id: `condominium-${item.id}`,
      title: item.name,
      detail: `${item.location} - ${item.fractions} fracoes - ${item.status}`,
      path: '/condominios',
      tone: 'blue'
    })),
    ...resources.residents.map((item) => ({
      id: `resident-${item.id}`,
      title: item.name,
      detail: `${item.condominium} - fracao ${item.fraction}`,
      path: '/condominios',
      tone: 'green'
    })),
    ...resources.tickets.map((item) => ({
      id: `ticket-${item.id}`,
      title: item.title,
      detail: `${item.condominium} - ${item.priority} - ${item.status}`,
      path: '/tickets',
      tone: 'danger'
    })),
    ...resources.maintenance.map((item) => ({
      id: `maintenance-${item.id}`,
      title: item.title,
      detail: `${item.supplier} - ${item.status} - ${item.date}`,
      path: '/manutencao',
      tone: 'gold'
    })),
    ...resources.suppliers.map((item) => ({
      id: `supplier-${item.id}`,
      title: item.name,
      detail: `${item.category} - ${item.contact}`,
      path: '/fornecedores',
      tone: 'blue'
    })),
    ...resources.documents.map((item) => ({
      id: `document-${item.id}`,
      title: item.title,
      detail: `${item.type} - ${item.condominium} - ${item.status}`,
      path: '/documentos',
      tone: 'purple'
    })),
    ...resources.reports.map((item) => ({
      id: `report-${item.id}`,
      title: item.title,
      detail: `${item.period} - ${item.status}`,
      path: '/relatorios',
      tone: 'gold'
    })),
    ...resources.accounting.debts.map((item) => ({
      id: `debt-${item.id}`,
      title: `${item.resident} - divida`,
      detail: `${item.condominium} - ${formatCurrency(item.amount)} - ${item.status}`,
      path: '/contabilidade',
      tone: 'danger'
    })),
    ...resources.accounting.expenses.map((item) => ({
      id: `expense-${item.id}`,
      title: item.category,
      detail: `${item.supplier} - ${formatCurrency(item.amount)} - ${item.status}`,
      path: '/contabilidade',
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
