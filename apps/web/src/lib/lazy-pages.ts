import type { Component } from '@builder.io/qwik';
import type { EntityRouteMatch } from './entity-navigation';

export type PageLoaderKey =
  | 'dashboard'
  | 'team'
  | 'tasks'
  | 'condominiums'
  | 'accounting'
  | 'calendar'
  | 'tickets'
  | 'maintenance'
  | 'inspections'
  | 'documents'
  | 'chat'
  | 'entity-detail'
  | 'page-overview';

export type LazyPageComponent = Component<any>;

export function resolvePageLoaderKey(pagePath: string, routeKind: EntityRouteMatch['kind']): PageLoaderKey {
  if (routeKind === 'detail') {
    return 'entity-detail';
  }

  switch (pagePath) {
    case '/dashboard':
      return 'dashboard';
    case '/equipa':
      return 'team';
    case '/tarefas':
      return 'tasks';
    case '/condominios':
      return 'condominiums';
    case '/contabilidade':
      return 'accounting';
    case '/calendario':
      return 'calendar';
    case '/tickets':
      return 'tickets';
    case '/manutencao':
      return 'maintenance';
    case '/vistorias':
      return 'inspections';
    case '/documentos':
      return 'documents';
    case '/chat':
      return 'chat';
    default:
      return 'page-overview';
  }
}

const pageComponentCache = new Map<PageLoaderKey, Promise<LazyPageComponent>>();

export async function loadPageComponent(key: PageLoaderKey): Promise<LazyPageComponent> {
  const cached = pageComponentCache.get(key);
  if (cached) {
    return cached;
  }

  const loader = (async () => {
    switch (key) {
    case 'dashboard':
      return (await import('../components/dashboard/DashboardPage')).DashboardPage;
    case 'team':
      return (await import('../components/pages/TeamPage')).TeamPage;
    case 'tasks':
      return (await import('../components/pages/TasksPage')).TasksPage;
    case 'condominiums':
      return (await import('../components/pages/CondominiumsPage')).CondominiumsPage;
    case 'accounting':
      return (await import('../components/pages/AccountingPage')).AccountingPage;
    case 'calendar':
      return (await import('../components/pages/CalendarPage')).CalendarPage;
    case 'tickets':
      return (await import('../components/pages/TicketsPage')).TicketsPage;
    case 'maintenance':
      return (await import('../components/pages/MaintenancePage')).MaintenancePage;
    case 'inspections':
      return (await import('../components/pages/InspectionsPage')).InspectionsPage;
    case 'documents':
      return (await import('../components/pages/DocumentsPage')).DocumentsPage;
    case 'chat':
      return (await import('../components/pages/ChatPage')).ChatPage;
    case 'entity-detail':
      return (await import('../components/pages/EntityDetailPage')).EntityDetailPage;
      default:
        return (await import('../components/pages/PageOverview')).PageOverview;
    }
  })();

  pageComponentCache.set(key, loader);

  return loader.catch((error) => {
    pageComponentCache.delete(key);
    throw error;
  });
}
