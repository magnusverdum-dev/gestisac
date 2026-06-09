import type {
  CreateResource,
  DashboardResponse,
  ResourceEndpoint,
  ResourceState
} from '../lib/api';

export type CreateField = {
  name: string;
  label: string;
  type?: 'text' | 'number' | 'file';
  placeholder?: string;
};

export type CreateOption = {
  label: string;
  resource: CreateResource;
  fields: CreateField[];
};

export type DocumentTemplateOption = {
  id: string;
  label: string;
  category: string;
  description: string;
  dataSources: string[];
};

export type RecordQuickAction = {
  label: string;
  tone?: 'primary' | 'success' | 'warning';
  action:
    | {
        type: 'update';
        resource: ResourceEndpoint;
        id: string;
        payload: Record<string, unknown>;
      }
    | {
        type: 'create';
        resource: CreateResource;
        payload: Record<string, unknown>;
      }
    | {
        type: 'reportPreview';
        reportId: string;
      }
    | {
        type: 'reportExport';
        reportId: string;
      }
    | {
        type: 'documentPreview';
        documentId: string;
      }
    | {
        type: 'documentDownload';
        documentId: string;
      };
};

export type DemoPage = {
  path: string;
  navLabel: string;
  icon: string;
  title: string;
  description: string;
  action: string;
  resource?: CreateResource;
  createFields?: CreateField[];
  createOptions?: CreateOption[];
  documentTemplates?: DocumentTemplateOption[];
  stats: Array<{
    label: string;
    value: string;
    detail: string;
    tone?: string;
  }>;
  records: Array<{
    id?: string;
    resource?: ResourceEndpoint;
    title: string;
    meta: string;
    status: string;
    detail: string;
    fields?: CreateField[];
    values?: Record<string, unknown>;
    quickActions?: RecordQuickAction[];
    canEdit?: boolean;
    canDelete?: boolean;
  }>;
};

export const emptyResources: ResourceState = {
  condominiums: [],
  buildings: [],
  fractions: [],
  residents: [],
  team: [],
  tickets: [],
  ocorrencias: [],
  suppliers: [],
  documents: [],
  reports: [],
  maintenance: [],
  inspections: [],
  calendarEvents: [],
  assemblies: [],
  accounting: {
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
  },
  auditLog: [],
  permissions: {
    role: 'Leitura',
    modules: []
  }
};

export const fallbackDashboard: DashboardResponse = {
  user: {
    id: '',
    tenantId: '',
    name: 'Administrador',
    email: 'admin@gestisac.pt',
    role: 'Administrador',
    activeCondominium: 'GESTISAC',
    activeCondominiums: 0
  },
  activeCondominium: 'GESTISAC',
  urgentNotice: {
    type: 'system',
    title: 'A ligar ao backend',
    detail: 'A carregar dados operacionais',
    priority: 'checking'
  },
  operationalSummary: [],
  quickActions: [],
  dashboardModules: [],
  alerts: []
};

export const navPages: Array<Pick<DemoPage, 'path' | 'navLabel' | 'icon'>> = [
  { path: '/dashboard', navLabel: 'Dashboard', icon: 'D' },
  { path: '/condominios', navLabel: 'Condominios', icon: 'C' },
  { path: '/equipa', navLabel: 'Equipa', icon: 'E' },
  { path: '/tarefas', navLabel: 'Tarefas', icon: 'T' },
  { path: '/tickets', navLabel: 'Pedidos', icon: 'P' },
  { path: '/calendario', navLabel: 'Agenda', icon: 'A' },
  { path: '/administracao', navLabel: 'Administracao', icon: 'A' },
  { path: '/contabilidade', navLabel: 'Contabilidade', icon: 'EUR' },
  { path: '/relatorios', navLabel: 'Relatorios', icon: 'R' },
  { path: '/assembleias', navLabel: 'Assembleias', icon: 'M' },
  { path: '/documentos', navLabel: 'Documentos', icon: 'F' },
  { path: '/manutencao', navLabel: 'Manutencao', icon: 'W' },
  { path: '/vistorias', navLabel: 'Vistorias', icon: 'V' },
  { path: '/chat', navLabel: 'Chat', icon: 'H' },
  { path: '/fornecedores', navLabel: 'Fornecedores', icon: 'S' },
  { path: '/definicoes', navLabel: 'Definicoes', icon: 'G' }
];

export function buildPages(resources: ResourceState, dashboard: DashboardResponse): DemoPage[] {
  const urgentTickets = resources.tickets.filter((item) =>
    isCriticalPriority(item.priority)
  ).length;
  const activeSuppliers = resources.suppliers.filter((item) =>
    item.status.toLowerCase().includes('ativo')
  ).length;
  const fractions = resources.condominiums.reduce((total, item) => total + item.fractions, 0);
  const residents = resources.condominiums.reduce((total, item) => total + item.residents, 0);
  const realFractions = resources.fractions.length || fractions;
  const realResidents = resources.residents.length || residents;
  const accountingOverview = resources.accounting.overview;
  const canManageCondominiums = canWrite(resources, 'condominiums');
  const canManageOperations = canWrite(resources, 'operations');
  const canManageReports = canWrite(resources, 'reports');
  const canDeleteCondominiums = canDelete(resources, 'condominiums');
  const canDeleteOperations = canDelete(resources, 'operations');
  const canDeleteReports = canDelete(resources, 'reports');

  return [
    {
      path: '/dashboard',
      navLabel: 'Dashboard',
      icon: 'D',
      title: 'Dashboard',
      description: 'Visao geral com modulos principais, prioridades e avisos operacionais.',
      action: 'Criar aviso',
      stats: [],
      records: []
    },
    {
      path: '/condominios',
      navLabel: 'Condominios',
      icon: 'C',
      title: 'Condominios',
      description: 'Gestao central de predios, fracoes, moradores e alertas por condominio.',
      action: 'Adicionar registo',
      createOptions: condominiumOptions(dashboard.activeCondominium),
      stats: [
        {
          label: 'Condominios ativos',
          value: String(resources.condominiums.length),
          detail: `${realFractions} fracoes no total`,
          tone: 'blue'
        },
        {
          label: 'Moradores',
          value: String(realResidents),
          detail: 'Dados organizados pela API',
          tone: 'green'
        },
        {
          label: 'Alertas',
          value: String(resources.tickets.length),
          detail: `${urgentTickets} exigem atencao`,
          tone: 'gold'
        }
      ],
      records: [
        ...resources.condominiums.map((item) => ({
          id: item.id,
          resource: 'condominiums' as ResourceEndpoint,
          title: item.name,
          meta: `${item.location} - ${item.fractions} fracoes`,
          status: item.status,
          detail: item.notice,
          fields: condominiumFields(),
          values: item,
          canEdit: canManageCondominiums,
          canDelete: canDeleteCondominiums
        })),
        ...resources.buildings.map((item) => ({
          id: item.id,
          resource: 'buildings' as ResourceEndpoint,
          title: item.name,
          meta: `${item.condominium} - ${item.floors} pisos`,
          status: item.status,
          detail: `${item.fractions} fracoes neste edificio`,
          fields: buildingFields(dashboard.activeCondominium),
          values: item,
          canEdit: canManageCondominiums,
          canDelete: canDeleteCondominiums
        })),
        ...resources.fractions.map((item) => ({
          id: item.id,
          resource: 'fractions' as ResourceEndpoint,
          title: `Fracao ${item.number}`,
          meta: `${item.condominium} - ${item.building}`,
          status: item.status,
          detail: `${item.typology} - ${item.owner}`,
          fields: fractionFields(dashboard.activeCondominium),
          values: item,
          canEdit: canManageCondominiums,
          canDelete: canDeleteCondominiums
        })),
        ...resources.residents.map((item) => ({
          id: item.id,
          resource: 'residents' as ResourceEndpoint,
          title: item.name,
          meta: `${item.condominium} - fracao ${item.fraction}`,
          status: item.status,
          detail: `${item.email} - ${item.phone}`,
          fields: residentFields(dashboard.activeCondominium),
          values: item,
          canEdit: canManageCondominiums,
          canDelete: canDeleteCondominiums
        }))
      ]
    },
    {
      path: '/equipa',
      navLabel: 'Equipa',
      icon: 'E',
      title: 'Equipa',
      description: 'Funcionarios, responsabilidades e carga operacional do dia.',
      action: 'Gerir equipa',
      stats: [
        { label: 'Membros', value: String(resources.team.length), detail: 'Utilizadores ativos', tone: 'blue' },
        {
          label: 'Tarefas abertas',
          value: String(resources.team.reduce((total, item) => total + item.openTasks, 0)),
          detail: 'Somatorio por responsavel',
          tone: 'gold'
        },
        {
          label: 'Validacao HQ',
          value: String(resources.team.reduce((total, item) => total + item.pendingValidation, 0)),
          detail: 'Intervencoes a rever',
          tone: 'green'
        }
      ],
      records: resources.team.map((item) => ({
        id: item.id,
        title: item.name,
        meta: `${item.role} - ${item.email}`,
        status: item.inProgressTasks ? 'Em campo' : item.openTasks ? 'Com tarefas' : 'Disponivel',
        detail: `${item.openTasks} abertas - ${item.pendingValidation} a validar`,
        values: item
      }))
    },
    {
      path: '/tarefas',
      navLabel: 'Tarefas',
      icon: 'T',
      title: 'Tarefas',
      description: 'Vista unica do trabalho diario: pedidos, manutencao, vistorias e agenda.',
      action: 'Nova tarefa',
      stats: [
        { label: 'Pedidos abertos', value: String(resources.ocorrencias.filter((item) => !isDoneStatus(item.status)).length), detail: 'Ocorrencias por resolver', tone: 'danger' },
        { label: 'Manutencao', value: String(resources.maintenance.filter((item) => !isDoneStatus(item.status)).length), detail: 'Intervencoes ativas', tone: 'gold' },
        { label: 'Agenda', value: String(resources.calendarEvents.length), detail: 'Eventos operacionais', tone: 'blue' }
      ],
      records: []
    },
    {
      path: '/administracao',
      navLabel: 'Administracao',
      icon: 'A',
      title: 'Administracao',
      description: 'Coordenacao de ocorrencias, fornecedores, seguros e responsabilidades.',
      action: 'Nova ocorrencia',
      resource: 'tickets',
      createFields: ticketFields(),
      stats: [
        { label: 'Tickets abertos', value: String(resources.tickets.length), detail: `${urgentTickets} critico`, tone: 'danger' },
        { label: 'Manutencoes', value: String(resources.maintenance.length), detail: 'Intervencoes ativas', tone: 'gold' },
        { label: 'Fornecedores', value: String(activeSuppliers), detail: 'Com contacto ativo', tone: 'green' }
      ],
      records: resources.tickets.map((item) =>
        ticketRecord(item, canManageOperations, canDeleteOperations)
      )
    },
    {
      path: '/contabilidade',
      navLabel: 'Contabilidade',
      icon: 'EUR',
      title: 'Contabilidade',
      description: 'Painel operacional com avisos, tarefas e saude do modulo, sem detalhe financeiro individual.',
      action: 'Registar movimento',
      createOptions: accountingOptions(dashboard.activeCondominium),
      stats: [
        {
          label: 'Quotas por validar',
          value: String(accountingOverview.quotasToValidate),
          detail: 'Contagem agregada, sem nomes ou valores',
          tone: accountingOverview.quotasToValidate ? 'gold' : 'green'
        },
        {
          label: 'Movimentos por reconciliar',
          value: String(accountingOverview.unreconciledMovements),
          detail: `Antiguidade maxima: ${accountingOverview.oldestUnreconciledAgeDays ?? 0} dias`,
          tone: accountingOverview.unreconciledMovements ? 'danger' : 'green'
        },
        {
          label: 'Recibos por emitir',
          value: String(accountingOverview.receiptsToIssue),
          detail: `${accountingOverview.activePaymentAgreements} acordos ativos`,
          tone: accountingOverview.receiptsToIssue ? 'gold' : 'green'
        }
      ],
      records: []
    },
    {
      path: '/relatorios',
      navLabel: 'Relatorios',
      icon: 'R',
      title: 'Relatorios',
      description: 'Relatorios financeiros, exportacoes, mapas de divida e inteligencia operacional.',
      action: 'Gerar relatorio',
      resource: 'reports',
      createFields: [
        { name: 'title', label: 'Titulo', placeholder: 'Relatorio financeiro mensal' },
        { name: 'period', label: 'Periodo', placeholder: 'Maio 2026' },
        { name: 'status', label: 'Estado', placeholder: 'Pronto para exportar' }
      ],
      stats: [
        { label: 'Relatorios', value: String(resources.reports.length), detail: 'Disponiveis', tone: 'gold' },
        { label: 'Exportacoes', value: '8', detail: 'Ultimos 30 dias', tone: 'blue' },
        { label: 'Pendentes', value: '0', detail: 'Sem bloqueios', tone: 'green' }
      ],
      records: resources.reports.map((item) => ({
        id: item.id,
        resource: 'reports' as ResourceEndpoint,
        title: item.title,
        meta: item.period,
        status: item.status,
        detail: 'Pronto para consulta',
        fields: reportFields(),
        values: item,
        quickActions: [
          {
            label: 'Preview',
            tone: 'primary',
            action: {
              type: 'reportPreview',
              reportId: item.id
            }
          },
          ...(canManageReports
            ? [
                {
                  label: 'Exportar',
                  tone: 'success' as const,
                  action: {
                    type: 'reportExport' as const,
                    reportId: item.id
                  }
                }
              ]
            : []),
          ...(canManageReports && !isDoneStatus(item.status)
            ? [
                {
                  label: 'Marcar exportado',
                  tone: 'warning' as const,
                  action: {
                    type: 'update' as const,
                    resource: 'reports' as ResourceEndpoint,
                    id: item.id,
                    payload: { ...item, status: 'Exportado' }
                  }
                }
              ]
            : [])
        ],
        canEdit: canManageReports,
        canDelete: canDeleteReports
      }))
    },
    {
      path: '/assembleias',
      navLabel: 'Assembleias',
      icon: 'M',
      title: 'Assembleias',
      description: 'Convocatorias, atas, presencas e deliberacoes organizadas por condominio.',
      action: 'Nova assembleia',
      resource: 'assemblies',
      createFields: [
        { name: 'title', label: 'Titulo', placeholder: 'Assembleia ordinaria' },
        { name: 'condominium', label: 'Condominio', placeholder: dashboard.activeCondominium },
        { name: 'date', label: 'Data', placeholder: '24 maio, 19:00' },
        { name: 'status', label: 'Estado', placeholder: 'Convocatoria enviada' }
      ],
      stats: [
        { label: 'Proximas', value: String(resources.assemblies.length), detail: 'Agenda registada', tone: 'gold' },
        { label: 'Atas', value: String(resources.reports.length), detail: 'Arquivo disponivel', tone: 'blue' },
        { label: 'Pendentes', value: '1', detail: 'Ata em revisao', tone: 'warning' }
      ],
      records: resources.assemblies.map((item) => ({
        id: item.id,
        resource: 'assemblies' as ResourceEndpoint,
        title: item.title,
        meta: item.condominium,
        status: item.status,
        detail: item.date,
        fields: assemblyFields(dashboard.activeCondominium),
        values: item,
        quickActions: canManageOperations && !isDoneStatus(item.status)
          ? [
              {
                label: 'Fechar ata',
                tone: 'success',
                action: {
                  type: 'update',
                  resource: 'assemblies',
                  id: item.id,
                  payload: { ...item, status: 'Ata concluida' }
                }
              }
            ]
          : undefined,
        canEdit: canManageOperations,
        canDelete: canDeleteOperations
      }))
    },
    {
      path: '/calendario',
      navLabel: 'Calendario',
      icon: 'C',
      title: 'Calendario',
      description: 'Agenda operacional ligada a vistorias, reunioes, emails, tickets e manutencao.',
      action: 'Adicionar evento',
      resource: 'calendar-events',
      createFields: calendarEventFields(dashboard.activeCondominium),
      stats: [
        { label: 'Eventos', value: String(resources.calendarEvents.length), detail: 'Agenda operacional', tone: 'blue' },
        {
          label: 'Vistorias',
          value: String(resources.calendarEvents.filter((item) => item.eventType === 'Vistoria').length),
          detail: 'Ligadas a manutencao',
          tone: 'gold'
        },
        {
          label: 'Emails',
          value: String(resources.calendarEvents.filter((item) => item.eventType === 'Email').length),
          detail: 'Planeados, sem envio automatico',
          tone: 'green'
        }
      ],
      records: resources.calendarEvents.map((item) => ({
        id: item.id,
        resource: 'calendar-events' as ResourceEndpoint,
        title: item.title,
        meta: `${item.condominium || 'Geral'} - ${item.eventType}`,
        status: item.status,
        detail: item.startAt,
        fields: calendarEventFields(dashboard.activeCondominium),
        values: item,
        canEdit: canManageOperations,
        canDelete: canDeleteOperations
      }))
    },
    {
      path: '/tickets',
      navLabel: 'Pedidos',
      icon: 'P',
      title: 'Pedidos',
      description: 'Ocorrencias, avarias e pedidos com prioridade, estado e responsavel.',
      action: 'Abrir ticket',
      resource: 'tickets',
      createFields: ticketFields(),
      stats: [
        { label: 'Abertos', value: String(resources.tickets.length), detail: `${urgentTickets} critico`, tone: 'danger' },
        { label: 'Em curso', value: String(resources.tickets.filter((item) => item.status !== 'Resolvido').length), detail: 'Acompanhamento ativo', tone: 'gold' },
        { label: 'Resolvidos', value: String(resources.tickets.filter((item) => item.status === 'Resolvido').length), detail: 'Historico', tone: 'green' }
      ],
      records: resources.tickets.map((item) =>
        ticketRecord(item, canManageOperations, canDeleteOperations)
      )
    },
    {
      path: '/documentos',
      navLabel: 'Documentos',
      icon: 'F',
      title: 'Documentos',
      description: 'Modelos de gestao, geracao de PDFs e arquivo documental por condominio.',
      action: 'Carregar ficheiro existente',
      resource: 'documents',
      documentTemplates: documentTemplateOptions(),
      createFields: [
        { name: 'title', label: 'Titulo', placeholder: 'Seguro multirriscos 2026' },
        { name: 'type', label: 'Tipo', placeholder: 'Seguro' },
        { name: 'condominium', label: 'Condominio', placeholder: dashboard.activeCondominium },
        { name: 'status', label: 'Estado', placeholder: 'Arquivado' },
        { name: 'file', label: 'Ficheiro', type: 'file' }
      ],
      stats: [
        { label: 'Documentos', value: String(resources.documents.length), detail: 'Arquivo pesquisavel', tone: 'blue' },
        {
          label: 'Com ficheiro',
          value: String(resources.documents.filter((item) => item.storageKey).length),
          detail: 'Download disponivel',
          tone: 'green'
        },
        {
          label: 'A expirar',
          value: String(resources.documents.filter((item) => item.status.toLowerCase().includes('expirar')).length),
          detail: 'Prazos documentais',
          tone: 'danger'
        }
      ],
      records: resources.documents.map((item) => ({
        id: item.id,
        resource: 'documents' as ResourceEndpoint,
        title: item.title,
        meta: `${item.type} - ${item.condominium}`,
        status: item.status,
        detail: item.fileName
          ? `${item.fileName} - ${formatBytes(item.sizeBytes)}`
          : 'Sem ficheiro associado',
        fields: documentFields(dashboard.activeCondominium),
        values: item,
        quickActions: [
          {
            label: 'Preview',
            tone: 'primary',
            action: {
              type: 'documentPreview',
              documentId: item.id
            }
          },
          {
            label: 'Download',
            tone: 'success',
            action: {
              type: 'documentDownload',
              documentId: item.id
            }
          },
          ...(canManageOperations && item.status !== 'Arquivado'
            ? [
                {
                  label: 'Arquivar',
                  tone: 'warning' as const,
                  action: {
                    type: 'update' as const,
                    resource: 'documents' as ResourceEndpoint,
                    id: item.id,
                    payload: documentPayload(item, 'Arquivado')
                  }
                }
              ]
            : [])
        ],
        canEdit: canManageOperations,
        canDelete: canDeleteOperations
      }))
    },
    {
      path: '/manutencao',
      navLabel: 'Manutencao',
      icon: 'W',
      title: 'Manutencao',
      description: 'Intervencoes, inspecoes, planos preventivos e fornecedores tecnicos.',
      action: 'Agendar intervencao',
      resource: 'maintenance',
      createFields: [
        { name: 'title', label: 'Titulo', placeholder: 'Inspecao do elevador' },
        { name: 'supplier', label: 'Fornecedor', placeholder: 'Elevatec Lisboa' },
        { name: 'date', label: 'Data', placeholder: '18 maio' },
        { name: 'status', label: 'Estado', placeholder: 'Agendado' }
      ],
      stats: [
        { label: 'Urgentes', value: String(urgentTickets), detail: 'Prioridade alta', tone: 'danger' },
        { label: 'Agendadas', value: String(resources.maintenance.length), detail: 'Proximos dias', tone: 'gold' },
        { label: 'Preventivas', value: '6', detail: 'Plano mensal', tone: 'green' }
      ],
      records: resources.maintenance.map((item) => ({
        id: item.id,
        resource: 'maintenance' as ResourceEndpoint,
        title: item.title,
        meta: item.supplier,
        status: item.status,
        detail: item.date,
        fields: maintenanceFields(),
        values: item,
        quickActions: canManageOperations && !isDoneStatus(item.status)
          ? [
              {
                label: 'Concluir',
                tone: 'success',
                action: {
                  type: 'update',
                  resource: 'maintenance',
                  id: item.id,
                  payload: { ...item, status: 'Concluida' }
                }
              }
            ]
          : undefined,
        canEdit: canManageOperations,
        canDelete: canDeleteOperations
      }))
    },
    {
      path: '/vistorias',
      navLabel: 'Vistorias',
      icon: 'V',
      title: 'Vistorias',
      description: 'Planeamento, submissao por trabalhadores e confirmacao final pelo HQ.',
      action: 'Criar vistoria',
      resource: 'inspections',
      createFields: [
        { name: 'title', label: 'Titulo', placeholder: 'Vistoria ao elevador Bloco B' },
        { name: 'condominium', label: 'Condominio', placeholder: dashboard.activeCondominium },
        { name: 'requiredDate', label: 'Data prevista', placeholder: '2026-06-05' },
        { name: 'status', label: 'Estado', placeholder: 'Planeada' }
      ],
      stats: [
        { label: 'Planeadas', value: String(resources.inspections.filter((item) => item.status === 'Planeada').length), detail: 'Por executar', tone: 'blue' },
        { label: 'Submetidas', value: String(resources.inspections.filter((item) => item.status === 'Submetida').length), detail: 'Aguardam HQ', tone: 'gold' },
        { label: 'Confirmadas', value: String(resources.inspections.filter((item) => item.status === 'Confirmada').length), detail: 'Fechadas', tone: 'green' }
      ],
      records: resources.inspections.map((item) => ({
        id: item.id,
        resource: 'inspections' as ResourceEndpoint,
        title: item.title,
        meta: `${item.condominium || 'Geral'} - ${item.location || 'Local por definir'}`,
        status: item.status,
        detail: item.requiredDate || 'Sem data',
        values: item,
        canEdit: canManageOperations,
        canDelete: canDeleteOperations
      }))
    },
    {
      path: '/chat',
      navLabel: 'Chat',
      icon: 'H',
      title: 'Chat',
      description: 'Canal de comunicacao transversal entre Cliente, HQ e Fornecedores.',
      action: 'Enviar mensagem',
      stats: [
        { label: 'Canal', value: 'Global', detail: 'Partilhado entre apps', tone: 'blue' },
        { label: 'SLA', value: 'Ativo', detail: 'Resposta em tempo real', tone: 'green' },
        { label: 'Escala', value: '3 apps', detail: 'Cliente, HQ e Fornecedores', tone: 'gold' }
      ],
      records: []
    },
    {
      path: '/fornecedores',
      navLabel: 'Fornecedores',
      icon: 'S',
      title: 'Fornecedores',
      description: 'Rede de fornecedores, contactos, categorias, estados e servicos ativos.',
      action: 'Adicionar fornecedor',
      resource: 'suppliers',
      createFields: [
        { name: 'name', label: 'Nome', placeholder: 'Elevadores Norte' },
        { name: 'category', label: 'Categoria', placeholder: 'Elevadores' },
        { name: 'contact', label: 'Contacto', placeholder: 'geral@fornecedor.pt' }
      ],
      stats: [
        { label: 'Ativos', value: String(activeSuppliers), detail: 'Fornecedores disponiveis', tone: 'green' },
        { label: 'Com intervencao', value: String(resources.maintenance.length), detail: 'Associados a manutencao', tone: 'gold' },
        { label: 'Criticos', value: String(urgentTickets), detail: 'Prioridade alta', tone: 'danger' }
      ],
      records: resources.suppliers.map((item) => ({
        id: item.id,
        resource: 'suppliers' as ResourceEndpoint,
        title: item.name,
        meta: item.category,
        status: item.status,
        detail: item.contact,
        fields: supplierFields(),
        values: item,
        canEdit: canManageOperations,
        canDelete: canDeleteOperations
      }))
    },
    {
      path: '/definicoes',
      navLabel: 'Definicoes',
      icon: 'G',
      title: 'Definicoes',
      description: 'Utilizadores, permissoes, dados da organizacao e preferencias da plataforma.',
      action: 'Gerir permissoes',
      stats: [
        { label: 'Utilizador', value: dashboard.user.name, detail: dashboard.user.email, tone: 'blue' },
        { label: 'Role', value: dashboard.user.role, detail: 'Sessao ativa', tone: 'gold' },
        {
          label: 'Auditoria',
          value: String(resources.auditLog.length),
          detail: 'Acoes registadas pela API',
          tone: 'green'
        }
      ],
      records: resources.auditLog.length
        ? resources.auditLog.slice(0, 12).map((item) => ({
            title: item.summary,
            meta: `${item.userName} - ${new Date(item.createdAt).toLocaleString('pt-PT')}`,
            status: `${item.module} / ${item.action}`,
            detail: `Registo ${item.recordId}`,
            values: item
          }))
        : resources.permissions.modules.map((item) => ({
            title: item.module,
            meta: `Role: ${resources.permissions.role}`,
            status: item.canWrite ? 'Pode editar' : 'Leitura',
            detail: item.canDelete ? 'Pode apagar e editar' : 'Sem permissao de apagar',
            values: item
          }))
    }
  ];
}

export const getPageByPath = (pages: DemoPage[], path: string) =>
  pages.find((page) => page.path === path) ?? pages[0];

function ticketFields(): CreateField[] {
  return [
    { name: 'title', label: 'Titulo', placeholder: 'Avaria no elevador' },
    { name: 'condominium', label: 'Condominio', placeholder: 'Condominio Vila Verde' },
    { name: 'requesterName', label: 'Requerente', placeholder: 'Carlos Almeida' },
    { name: 'requesterEmail', label: 'Email', placeholder: 'morador@example.pt' },
    { name: 'channel', label: 'Canal', placeholder: 'Portal' },
    { name: 'type', label: 'Tipo', placeholder: 'Avaria' },
    { name: 'category', label: 'Categoria', placeholder: 'Elevadores' },
    { name: 'priority', label: 'Prioridade', placeholder: 'Normal' },
    { name: 'status', label: 'Estado', placeholder: 'Aberto' },
    { name: 'assignee', label: 'Responsavel', placeholder: 'Joao Silva' },
    { name: 'dueAt', label: 'Prazo', placeholder: '2026-05-22T18:00' },
    { name: 'detail', label: 'Detalhe', placeholder: 'Descricao curta da ocorrencia' }
  ];
}

function ticketRecord(
  item: {
    id: string;
    title: string;
    condominium: string;
    priority: string;
    status: string;
    detail: string;
    updatedAt: string;
  },
  canEdit: boolean,
  canDeleteRecord: boolean
) {
  return {
    id: item.id,
    resource: 'tickets' as ResourceEndpoint,
    title: item.title,
    meta: item.condominium,
    status: item.priority,
    detail: `${item.status} - ${item.updatedAt}`,
    fields: ticketFields(),
    values: item,
    quickActions: canEdit && !isDoneStatus(item.status)
      ? [
          {
            label: 'Resolver',
            tone: 'success' as const,
            action: {
              type: 'update' as const,
              resource: 'tickets' as ResourceEndpoint,
              id: item.id,
              payload: { ...item, status: 'Resolvido', priority: 'Normal' }
            }
          }
        ]
      : undefined,
    canEdit,
    canDelete: canDeleteRecord
  };
}

function quotaRecord(
  item: {
    id: string;
    condominium: string;
    fraction: string;
    resident: string;
    period: string;
    amount: number;
    dueDate: string;
    status: string;
  },
  canEdit: boolean,
  canDeleteRecord: boolean
) {
  return {
    id: item.id,
    resource: 'accounting/quotas' as ResourceEndpoint,
    title: `Quota ${item.period}`,
    meta: `${item.resident} - ${item.fraction}`,
    status: item.status,
    detail: `${item.condominium} - ${formatCurrency(item.amount)} - vence ${item.dueDate}`,
    fields: quotaFields(),
    values: item,
    quickActions: canEdit && !isPaidStatus(item.status)
      ? [
          {
            label: 'Marcar paga',
            tone: 'success' as const,
            action: {
              type: 'update' as const,
              resource: 'accounting/quotas' as ResourceEndpoint,
              id: item.id,
              payload: { ...item, status: 'Paga' }
            }
          }
        ]
      : undefined,
    canEdit,
    canDelete: canDeleteRecord
  };
}

function paymentRecord(
  item: {
    id: string;
    condominium: string;
    fraction: string;
    resident: string;
    amount: number;
    paidAt: string;
    method: string;
    status: string;
  },
  canEdit: boolean,
  canDeleteRecord: boolean
) {
  return {
    id: item.id,
    resource: 'accounting/payments' as ResourceEndpoint,
    title: `Pagamento ${item.resident}`,
    meta: `${item.fraction} - ${item.paidAt}`,
    status: item.status,
    detail: `${item.condominium} - ${formatCurrency(item.amount)} via ${item.method}`,
    fields: paymentFields(),
    values: item,
    quickActions: canEdit
      ? [
          {
            label: 'Emitir recibo',
            tone: 'primary' as const,
            action: {
              type: 'create' as const,
              resource: 'accounting/receipts' as CreateResource,
              payload: {
                number: receiptNumberFor(item),
                condominium: item.condominium,
                resident: item.resident,
                amount: item.amount,
                issuedAt: item.paidAt,
                status: 'Emitido'
              }
            }
          }
        ]
      : undefined,
    canEdit,
    canDelete: canDeleteRecord
  };
}

function debtRecord(
  item: {
    id: string;
    condominium: string;
    fraction: string;
    resident: string;
    amount: number;
    dueDate: string;
    daysOverdue: number;
    status: string;
  },
  canEdit: boolean,
  canDeleteRecord: boolean
) {
  return {
    id: item.id,
    resource: 'accounting/debts' as ResourceEndpoint,
    title: `${item.resident} - ${item.fraction}`,
    meta: `${item.condominium} - ${item.dueDate}`,
    status: item.status,
    detail: `${formatCurrency(item.amount)} em atraso ha ${item.daysOverdue} dias`,
    fields: debtFields(),
    values: item,
    quickActions: canEdit && !isPaidStatus(item.status)
      ? [
          {
            label: 'Regularizar',
            tone: 'success' as const,
            action: {
              type: 'update' as const,
              resource: 'accounting/debts' as ResourceEndpoint,
              id: item.id,
              payload: { ...item, status: 'Paga', daysOverdue: 0 }
            }
          }
        ]
      : undefined,
    canEdit,
    canDelete: canDeleteRecord
  };
}

function receiptRecord(
  item: {
    id: string;
    number: string;
    condominium: string;
    resident: string;
    amount: number;
    issuedAt: string;
    status: string;
  },
  canEdit: boolean,
  canDeleteRecord: boolean
) {
  return {
    id: item.id,
    resource: 'accounting/receipts' as ResourceEndpoint,
    title: item.number,
    meta: `${item.resident} - ${item.issuedAt}`,
    status: item.status,
    detail: `${item.condominium} - ${formatCurrency(item.amount)}`,
    fields: receiptFields(),
    values: item,
    quickActions: canEdit && item.status !== 'Arquivado'
      ? [
          {
            label: 'Arquivar',
            tone: 'success' as const,
            action: {
              type: 'update' as const,
              resource: 'accounting/receipts' as ResourceEndpoint,
              id: item.id,
              payload: { ...item, status: 'Arquivado' }
            }
          }
        ]
      : undefined,
    canEdit,
    canDelete: canDeleteRecord
  };
}

function expenseRecord(
  item: {
    id: string;
    condominium: string;
    category: string;
    supplier: string;
    amount: number;
    dueDate: string;
    status: string;
  },
  canEdit: boolean,
  canDeleteRecord: boolean
) {
  return {
    id: item.id,
    resource: 'accounting/expenses' as ResourceEndpoint,
    title: item.category,
    meta: `${item.supplier} - ${item.dueDate}`,
    status: item.status,
    detail: `${item.condominium} - ${formatCurrency(item.amount)}`,
    fields: expenseFields(),
    values: item,
    quickActions: canEdit && !isPaidStatus(item.status)
      ? [
          {
            label: 'Marcar paga',
            tone: 'success' as const,
            action: {
              type: 'update' as const,
              resource: 'accounting/expenses' as ResourceEndpoint,
              id: item.id,
              payload: { ...item, status: 'Paga' }
            }
          }
        ]
      : undefined,
    canEdit,
    canDelete: canDeleteRecord
  };
}

function isCriticalPriority(priority: string): boolean {
  const normalized = priority.toLowerCase();
  return normalized.includes('crit') || normalized.includes('tic');
}

function canWrite(resources: ResourceState, module: string): boolean {
  return Boolean(resources.permissions.modules.find((item) => item.module === module)?.canWrite);
}

function canDelete(resources: ResourceState, module: string): boolean {
  return Boolean(resources.permissions.modules.find((item) => item.module === module)?.canDelete);
}

function isDoneStatus(status: string): boolean {
  const normalized = status.toLowerCase();
  return (
    normalized.includes('resolvid') ||
    normalized.includes('conclu') ||
    normalized.includes('exportado') ||
    normalized.includes('arquivado')
  );
}

function isPaidStatus(status: string): boolean {
  const normalized = status.toLowerCase();
  return normalized.includes('paga') || normalized.includes('regularizada');
}

function receiptNumberFor(item: { id: string; fraction: string; paidAt: string }): string {
  const suffix = item.id.slice(0, 6).toUpperCase();
  const date = item.paidAt.replaceAll('-', '');

  return `REC-${date}-${item.fraction}-${suffix}`;
}

function condominiumOptions(activeCondominium: string): CreateOption[] {
  return [
    { label: 'Condominio', resource: 'condominiums', fields: condominiumFields() },
    { label: 'Edificio', resource: 'buildings', fields: buildingFields(activeCondominium) },
    { label: 'Fracao', resource: 'fractions', fields: fractionFields(activeCondominium) },
    { label: 'Condomino', resource: 'residents', fields: residentFields(activeCondominium) }
  ];
}

function condominiumFields(): CreateField[] {
  return [
    { name: 'name', label: 'Nome', placeholder: 'Condominio Atlantico' },
    { name: 'location', label: 'Localizacao', placeholder: 'Lisboa' },
    { name: 'buildings', label: 'Predios', type: 'number', placeholder: '1' },
    { name: 'fractions', label: 'Fracoes', type: 'number', placeholder: '24' },
    { name: 'residents', label: 'Moradores', type: 'number', placeholder: '48' },
    { name: 'status', label: 'Estado', placeholder: 'Operacional' },
    { name: 'notice', label: 'Aviso', placeholder: 'Sem avisos criticos' }
  ];
}

function buildingFields(activeCondominium: string): CreateField[] {
  return [
    { name: 'condominium', label: 'Condominio', placeholder: activeCondominium },
    { name: 'name', label: 'Nome', placeholder: 'Bloco C' },
    { name: 'floors', label: 'Pisos', type: 'number', placeholder: '8' },
    { name: 'fractions', label: 'Fracoes', type: 'number', placeholder: '32' },
    { name: 'status', label: 'Estado', placeholder: 'Operacional' }
  ];
}

function fractionFields(activeCondominium: string): CreateField[] {
  return [
    { name: 'condominium', label: 'Condominio', placeholder: activeCondominium },
    { name: 'building', label: 'Edificio', placeholder: 'Bloco A' },
    { name: 'number', label: 'Fracao', placeholder: 'A-2' },
    { name: 'floor', label: 'Piso', placeholder: '2' },
    { name: 'typology', label: 'Tipologia', placeholder: 'T2' },
    { name: 'owner', label: 'Proprietario', placeholder: 'Ana Costa' },
    { name: 'status', label: 'Estado', placeholder: 'Regularizada' }
  ];
}

function residentFields(activeCondominium: string): CreateField[] {
  return [
    { name: 'name', label: 'Nome', placeholder: 'Ana Costa' },
    { name: 'email', label: 'Email', placeholder: 'ana@example.pt' },
    { name: 'phone', label: 'Telefone', placeholder: '+351 910 000 004' },
    { name: 'condominium', label: 'Condominio', placeholder: activeCondominium },
    { name: 'fraction', label: 'Fracao', placeholder: 'A-2' },
    { name: 'status', label: 'Estado', placeholder: 'Proprietaria' }
  ];
}

function reportFields(): CreateField[] {
  return [
    { name: 'title', label: 'Titulo', placeholder: 'Relatorio financeiro mensal' },
    { name: 'period', label: 'Periodo', placeholder: 'Maio 2026' },
    { name: 'status', label: 'Estado', placeholder: 'Pronto para exportar' }
  ];
}

function assemblyFields(activeCondominium: string): CreateField[] {
  return [
    { name: 'title', label: 'Titulo', placeholder: 'Assembleia ordinaria' },
    { name: 'condominium', label: 'Condominio', placeholder: activeCondominium },
    { name: 'date', label: 'Data', placeholder: '24 maio, 19:00' },
    { name: 'status', label: 'Estado', placeholder: 'Convocatoria enviada' }
  ];
}

function documentFields(activeCondominium: string): CreateField[] {
  return [
    { name: 'title', label: 'Titulo', placeholder: 'Seguro multirriscos 2026' },
    { name: 'type', label: 'Tipo', placeholder: 'Seguro' },
    { name: 'condominium', label: 'Condominio', placeholder: activeCondominium },
    { name: 'status', label: 'Estado', placeholder: 'Arquivado' }
  ];
}

function documentTemplateOptions(): DocumentTemplateOption[] {
  return [
    {
      id: 'assembly-notice',
      label: 'Convocatoria de assembleia',
      category: 'Assembleias',
      description: 'Modelo para convocar condominos com data, local e ordem de trabalhos.',
      dataSources: ['Condominio', 'Assembleias', 'Documentos']
    },
    {
      id: 'assembly-minutes',
      label: 'Ata de assembleia',
      category: 'Assembleias',
      description: 'Minuta para deliberacoes, presencas, votacoes e assinatura.',
      dataSources: ['Condominio', 'Fracoes', 'Assembleias']
    },
    {
      id: 'accounts-statement',
      label: 'Prestacao de contas',
      category: 'Contabilidade',
      description: 'Resumo financeiro com saldo, despesas, dividas e fundo de reserva.',
      dataSources: ['Quotas', 'Pagamentos', 'Despesas']
    },
    {
      id: 'budget-and-quotas',
      label: 'Orcamento e mapa de quotas',
      category: 'Contabilidade',
      description: 'Base para aprovar orcamento anual, quotas e fundo comum de reserva.',
      dataSources: ['Fracoes', 'Quotas', 'Despesas']
    },
    {
      id: 'debt-notice',
      label: 'Aviso de quota em atraso',
      category: 'Cobranca',
      description: 'Carta de cobranca amigavel por condomino ou fracao.',
      dataSources: ['Dividas', 'Quotas', 'Condominos']
    },
    {
      id: 'receipt',
      label: 'Recibo de pagamento',
      category: 'Cobranca',
      description: 'Recibo simples com dados de pagamento registados.',
      dataSources: ['Pagamentos', 'Condominos']
    },
    {
      id: 'no-debt-declaration',
      label: 'Declaracao de nao divida',
      category: 'Legal',
      description: 'Declaracao baseada nas dividas ativas registadas para fracao/condomino.',
      dataSources: ['Dividas', 'Fracoes']
    },
    {
      id: 'maintenance-notice',
      label: 'Aviso de manutencao ou avaria',
      category: 'Operacao',
      description: 'Comunicacao aos moradores sobre avarias, obras ou manutencoes.',
      dataSources: ['Tickets', 'Manutencao']
    },
    {
      id: 'inspection-report',
      label: 'Relatorio de vistoria',
      category: 'Operacao',
      description: 'Relatorio tecnico individual com checklist, notas e confirmacao HQ.',
      dataSources: ['Vistorias', 'Calendario']
    },
    {
      id: 'supplier-work-order',
      label: 'Ordem de servico a fornecedor',
      category: 'Operacao',
      description: 'Pedido formal de intervencao para fornecedor.',
      dataSources: ['Fornecedores', 'Tickets']
    },
    {
      id: 'insurance-expiry',
      label: 'Aviso de seguro/documento a expirar',
      category: 'Arquivo',
      description: 'Lista documentos, seguros e prazos que exigem revisao.',
      dataSources: ['Documentos']
    },
    {
      id: 'resident-map',
      label: 'Mapa de fracoes e contactos',
      category: 'Administracao',
      description: 'Mapa interno de moradores, proprietarios, fracoes e contactos.',
      dataSources: ['Fracoes', 'Condominos']
    },
    {
      id: 'condominium-regulation',
      label: 'Minuta de regulamento',
      category: 'Legal',
      description: 'Base de regulamento para partes comuns, quotas e manutencao.',
      dataSources: ['Condominio', 'Fracoes']
    }
  ];
}

function maintenanceFields(): CreateField[] {
  return [
    { name: 'title', label: 'Titulo', placeholder: 'Inspecao do elevador' },
    { name: 'condominium', label: 'Condominio', placeholder: 'Condominio Vila Verde' },
    { name: 'supplier', label: 'Fornecedor', placeholder: 'Elevatec Lisboa' },
    { name: 'type', label: 'Tipo', placeholder: 'Preventiva' },
    { name: 'priority', label: 'Prioridade', placeholder: 'Normal' },
    { name: 'date', label: 'Data', placeholder: '2026-05-24' },
    { name: 'scheduledStart', label: 'Inicio', placeholder: '2026-05-24T10:00' },
    { name: 'scheduledEnd', label: 'Fim', placeholder: '2026-05-24T11:00' },
    { name: 'status', label: 'Estado', placeholder: 'Planeada' },
    { name: 'costEstimate', label: 'Custo estimado', placeholder: '420.00' },
    { name: 'notes', label: 'Notas', placeholder: 'Notas da intervencao' }
  ];
}

function calendarEventFields(activeCondominium: string): CreateField[] {
  return [
    { name: 'title', label: 'Titulo', placeholder: 'Vistoria aos elevadores' },
    { name: 'condominium', label: 'Condominio', placeholder: activeCondominium },
    { name: 'eventType', label: 'Tipo', placeholder: 'Vistoria' },
    { name: 'status', label: 'Estado', placeholder: 'Planeado' },
    { name: 'startAt', label: 'Inicio', placeholder: '2026-05-24T10:00' },
    { name: 'endAt', label: 'Fim', placeholder: '2026-05-24T11:00' },
    { name: 'linkedEntityType', label: 'Ligacao', placeholder: 'ticket' },
    { name: 'linkedEntityId', label: 'ID ligado', placeholder: 'ticket-001' },
    { name: 'location', label: 'Local', placeholder: 'Bloco B' },
    { name: 'description', label: 'Descricao', placeholder: 'Resumo do evento' },
    { name: 'notes', label: 'Notas', placeholder: 'Notas internas' }
  ];
}

function supplierFields(): CreateField[] {
  return [
    { name: 'name', label: 'Nome', placeholder: 'Elevadores Norte' },
    { name: 'category', label: 'Categoria', placeholder: 'Elevadores' },
    { name: 'contact', label: 'Contacto', placeholder: 'geral@fornecedor.pt' },
    { name: 'status', label: 'Estado', placeholder: 'Ativo' }
  ];
}

function accountingOptions(activeCondominium: string): CreateOption[] {
  return [
    {
      label: 'Quota',
      resource: 'accounting/quotas',
      fields: quotaFields(activeCondominium)
    },
    {
      label: 'Pagamento',
      resource: 'accounting/payments',
      fields: paymentFields(activeCondominium)
    },
    {
      label: 'Divida',
      resource: 'accounting/debts',
      fields: debtFields(activeCondominium)
    },
    {
      label: 'Despesa',
      resource: 'accounting/expenses',
      fields: expenseFields(activeCondominium)
    },
    {
      label: 'Recibo',
      resource: 'accounting/receipts',
      fields: receiptFields(activeCondominium)
    }
  ];
}

function quotaFields(activeCondominium = 'Condominio Vila Verde'): CreateField[] {
  return [
    { name: 'condominium', label: 'Condominio', placeholder: activeCondominium },
    { name: 'fraction', label: 'Fracao', placeholder: 'B-4' },
    { name: 'resident', label: 'Condomino', placeholder: 'Carlos Almeida' },
    { name: 'period', label: 'Periodo', placeholder: 'Maio 2026' },
    { name: 'amount', label: 'Valor', type: 'number', placeholder: '95' },
    { name: 'dueDate', label: 'Vencimento', placeholder: '2026-05-20' },
    { name: 'status', label: 'Estado', placeholder: 'Pendente' }
  ];
}

function paymentFields(activeCondominium = 'Condominio Vila Verde'): CreateField[] {
  return [
    { name: 'condominium', label: 'Condominio', placeholder: activeCondominium },
    { name: 'fraction', label: 'Fracao', placeholder: 'A-1' },
    { name: 'resident', label: 'Condomino', placeholder: 'Maria Fernandes' },
    { name: 'amount', label: 'Valor', type: 'number', placeholder: '85' },
    { name: 'paidAt', label: 'Data pagamento', placeholder: '2026-05-14' },
    { name: 'method', label: 'Metodo', placeholder: 'Transferencia' },
    { name: 'status', label: 'Estado', placeholder: 'Confirmado' }
  ];
}

function debtFields(activeCondominium = 'Condominio Vila Verde'): CreateField[] {
  return [
    { name: 'condominium', label: 'Condominio', placeholder: activeCondominium },
    { name: 'fraction', label: 'Fracao', placeholder: 'B-4' },
    { name: 'resident', label: 'Condomino', placeholder: 'Carlos Almeida' },
    { name: 'amount', label: 'Valor', type: 'number', placeholder: '95' },
    { name: 'dueDate', label: 'Vencimento', placeholder: '2026-05-20' },
    { name: 'daysOverdue', label: 'Dias em atraso', type: 'number', placeholder: '0' },
    { name: 'status', label: 'Estado', placeholder: 'Em atraso' }
  ];
}

function expenseFields(activeCondominium = 'Condominio Vila Verde'): CreateField[] {
  return [
    { name: 'condominium', label: 'Condominio', placeholder: activeCondominium },
    { name: 'category', label: 'Categoria', placeholder: 'Imposto municipal' },
    { name: 'supplier', label: 'Fornecedor', placeholder: 'Autoridade Tributaria' },
    { name: 'amount', label: 'Valor', type: 'number', placeholder: '1840' },
    { name: 'dueDate', label: 'Vencimento', placeholder: '2026-05-20' },
    { name: 'status', label: 'Estado', placeholder: 'A vencer' }
  ];
}

function receiptFields(activeCondominium = 'Condominio Vila Verde'): CreateField[] {
  return [
    { name: 'number', label: 'Numero', placeholder: 'REC-2026-002' },
    { name: 'condominium', label: 'Condominio', placeholder: activeCondominium },
    { name: 'resident', label: 'Condomino', placeholder: 'Maria Fernandes' },
    { name: 'amount', label: 'Valor', type: 'number', placeholder: '85' },
    { name: 'issuedAt', label: 'Emissao', placeholder: '2026-05-14' },
    { name: 'status', label: 'Estado', placeholder: 'Emitido' }
  ];
}

function formatCurrency(value: number): string {
  return `${value.toLocaleString('pt-PT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })} EUR`;
}

function formatBytes(value: number): string {
  if (!value) {
    return '0 KB';
  }

  if (value < 1024 * 1024) {
    return `${Math.max(1, Math.round(value / 1024))} KB`;
  }

  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function documentPayload(
  item: {
    title: string;
    type: string;
    condominium: string;
    status: string;
  },
  status = item.status
): Record<string, unknown> {
  return {
    title: item.title,
    type: item.type,
    condominium: item.condominium,
    status
  };
}
