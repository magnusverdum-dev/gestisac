export type AppContext = 'hq' | 'client' | 'worker';

export type TenantRef = {
  id: string;
  name: string;
  slug?: string;
};

export type PublicUser = {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  role: string;
  activeCondominium: string;
  activeCondominiums: number;
};

export type PermissionModule = {
  module: string;
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
};

export type SharedMeResponse = {
  user: PublicUser;
  tenantId: string;
  activeCondominium: string;
  appContext: AppContext;
  permissions: PermissionModule[];
  guardrails: string[];
};

export type DashboardMetric = {
  label: string;
  value: string;
  tone: 'neutral' | 'success' | 'warning' | 'danger' | 'info';
};

export type DashboardCard = {
  title: string;
  description: string;
  endpoint: string;
  actionLabel: string;
};

export type NamespacedDashboardResponse = {
  appContext: AppContext;
  title: string;
  subtitle: string;
  user: PublicUser;
  activeCondominium: string;
  metrics: DashboardMetric[];
  cards: DashboardCard[];
  guardrails: string[];
};

export type TicketStatus =
  | 'nova'
  | 'emTriagem'
  | 'aguardaPecas'
  | 'emCurso'
  | 'pendente'
  | 'resolvida'
  | 'fechada'
  | 'reaberta';

export type TicketPriority = 'baixa' | 'normal' | 'alta' | 'urgente';

export type TicketSummary = {
  id: string;
  titulo: string;
  status: TicketStatus | string;
  prioridade: TicketPriority | string;
  condominiumId: string;
  categoria: string;
  publicStatusText: string;
  publicTimelineStatus: string;
  criadoEm: string;
  atualizadoEm: string;
};

export type ClientTicketSummary = TicketSummary & {
  canReopen: boolean;
};

export type WorkerTicketSummary = TicketSummary & {
  assignedWorkerId: string;
  nextAction: 'arrive' | 'start' | 'await_parts' | 'resolve' | 'none';
  workerTimeMinutes: number;
};

export type AccountingOverviewSummary = {
  quotasPorValidar: number;
  movimentosPorReconciliar: number;
  recibosPorEmitir: number;
  dividasEmAcompanhamento: number;
  acordosPagamentoAtivos: number;
  fundoReservaEstado: string;
};

export type AccountingContextKind =
  | 'condominium'
  | 'fraction'
  | 'supplier'
  | 'bank'
  | 'cash';

export type ApiEnvelope<T> = {
  data: T;
  meta: {
    appContext: AppContext;
    tenantId: string;
    generatedAt: string;
  };
};
