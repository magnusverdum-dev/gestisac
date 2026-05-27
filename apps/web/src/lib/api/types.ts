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
  internalCode?: string;
  externalReference?: string;
  condominiumType?: string;
  subtype?: string;
  managementStartDate?: string;
  managementEndDate?: string;
  manager?: string;
  team?: string;
  managementCompany?: string;
  shortDescription?: string;
  administrativeNotes?: string;
  tags?: string[];
  archived?: boolean;
  archivedAt?: string | null;
  address?: CondominiumAddress;
  structure?: CondominiumStructure;
  operationalStatus?: CondominiumOperationalStatus;
  primaryImageUrl?: string;
  blocksDetailed?: CondominiumBlock[];
  floorsDetailed?: CondominiumFloor[];
  zones?: CondominiumZone[];
  equipment?: CondominiumEquipment[];
  contacts?: CondominiumContact[];
  managedDocuments?: CondominiumManagedDocument[];
  media?: CondominiumMedia[];
  internalNotesRegistry?: CondominiumInternalNote[];
  history?: CondominiumHistoryEvent[];
  onboardingDraft?: CondominiumOnboardingDraft | null;
  createdAt?: string;
  updatedAt?: string;
};

export type CondominiumAddress = {
  street: string;
  number: string;
  lot: string;
  addressBlock: string;
  postalCode: string;
  locality: string;
  parish: string;
  municipality: string;
  district: string;
  country: string;
  latitude?: number | null;
  longitude?: number | null;
  googleMapsUrl: string;
  appleMapsUrl: string;
  accessNotes: string;
  mainEntryPoint: string;
  technicalEntryPoint: string;
  garageEntryPoint: string;
  accessRestrictions: string;
  visualReference: string;
};

export type CondominiumStructure = {
  totalFractions: number;
  residentialFractions: number;
  commercialFractions: number;
  garagesCount: number;
  storageUnitsCount: number;
  shopsCount: number;
  blocksCount: number;
  entrancesCount: number;
  floorsAboveGround: number;
  basementsCount: number;
  technicalFloorsCount: number;
  elevatorsCount: number;
  stairsCount: number;
  parkingSpacesCount: number;
  hasGarden: boolean;
  hasPool: boolean;
  hasCondominiumRoom: boolean;
  hasTrashHouse: boolean;
  hasAccessibleRoof: boolean;
  hasTechnicalRoof: boolean;
  hasSolarPanels: boolean;
  hasCctv: boolean;
  hasPorterDesk: boolean;
  hasDoorman: boolean;
  hasSecurity: boolean;
  constructionYear?: number | null;
  lastRenovationYear?: number | null;
  commonAreaEstimate: string;
  structuralNotes: string;
};

export type CondominiumOperationalStatus = {
  generalStatus: string;
  alertLevel: string;
  summary: string;
  reason: string;
  updatedBy: string;
  updatedAt: string;
};

export type CondominiumBlock = {
  id: string;
  name: string;
  code: string;
  description: string;
  specificAddress: string;
  mainEntry: string;
  floorsCount: number;
  basementsCount: number;
  fractionsCount: number;
  elevatorsCount: number;
  stairsCount: number;
  garagesCount: number;
  operationalStatus: string;
  accessNotes: string;
  internalNotes: string;
  archived: boolean;
};

export type CondominiumFloor = {
  id: string;
  blockId: string;
  name: string;
  number: string;
  floorType: string;
  description: string;
  fractionsCount: number;
  operationalStatus: string;
  notes: string;
};

export type CondominiumZone = {
  id: string;
  blockId: string;
  floorId: string;
  name: string;
  zoneType: string;
  description: string;
  operationalStatus: string;
  alertLevel: string;
  qrCodeReference: string;
  publicQrUrl: string;
  internalLocation: string;
  accessNotes: string;
  technicalNotes: string;
  imageUrl: string;
  planUrl: string;
};

export type CondominiumEquipment = {
  id: string;
  blockId: string;
  floorId: string;
  zoneId: string;
  name: string;
  equipmentType: string;
  brand: string;
  model: string;
  serialNumber: string;
  internalReference: string;
  supplier: string;
  maintenanceCompany: string;
  installationDate: string;
  lastMaintenanceDate: string;
  nextMaintenanceDate: string;
  maintenanceFrequency: string;
  status: string;
  criticality: string;
  warrantyUntil: string;
  contractReference: string;
  technicalNotes: string;
  documentIds: string[];
  mediaIds: string[];
};

export type CondominiumContact = {
  id: string;
  contactType: string;
  name: string;
  company: string;
  role: string;
  phone: string;
  alternatePhone: string;
  email: string;
  schedule: string;
  service: string;
  isEmergency: boolean;
  priority: string;
  favorite: boolean;
  notes: string;
  contractReference: string;
};

export type CondominiumManagedDocument = {
  id: string;
  title: string;
  documentType: string;
  description: string;
  fileName: string;
  fileUrl: string;
  blockId: string;
  zoneId: string;
  equipmentId: string;
  documentDate: string;
  expiryDate: string;
  uploadedBy: string;
  uploadedAt: string;
  version: string;
  status: string;
  notes: string;
};

export type CondominiumMedia = {
  id: string;
  mediaType: string;
  title: string;
  fileName: string;
  fileUrl: string;
  blockId: string;
  floorId: string;
  zoneId: string;
  description: string;
  isPrimary: boolean;
  createdAt: string;
};

export type CondominiumInternalNote = {
  id: string;
  noteType: string;
  title: string;
  content: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  visibility: string;
  priority: string;
  pinned: boolean;
};

export type CondominiumHistoryEvent = {
  id: string;
  eventType: string;
  description: string;
  userName: string;
  timestamp: string;
  source: string;
  oldData: string;
  newData: string;
  entity: string;
};

export type CondominiumOnboardingDraft = {
  currentStep: number;
  completedSteps: number[];
  isQuickMode: boolean;
  savedAt: string;
};

export type CompletenessReport = {
  percentage: number;
  complete: boolean;
  missingItems: string[];
  categories: Array<{
    id: string;
    label: string;
    complete: boolean;
    missingItems: string[];
  }>;
};

export type CondominiumDetailResponse = {
  condominium: Condominium;
  completeness: CompletenessReport;
};

export type ImportRowInput = {
  name: string;
  internalCode: string;
  condominiumType: string;
  status: string;
  street: string;
  number: string;
  postalCode: string;
  locality: string;
  parish: string;
  municipality: string;
  district: string;
  country: string;
  totalFractions: number;
  blocksCount: number;
  elevatorsCount: number;
  manager: string;
  notes: string;
};

export type ImportPreview = {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  rows: Array<{
    rowNumber: number;
    valid: boolean;
    errors: string[];
    values: ImportRowInput;
  }>;
};

export type ImportReport = {
  created: number;
  skipped: number;
  errors: string[];
  condominiums: Condominium[];
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
  requesterName?: string;
  requesterEmail?: string;
  channel?: string;
  type?: string;
  category?: string;
  assignee?: string;
  dueAt?: string;
  createdAt?: string;
  resolvedAt?: string;
  tags?: string[];
  linkedMaintenanceId?: string;
  linkedCalendarEventId?: string;
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
  condominium?: string;
  supplier: string;
  status: string;
  date: string;
  equipmentId?: string;
  zoneId?: string;
  ticketId?: string;
  calendarEventId?: string;
  type?: string;
  priority?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  completedAt?: string;
  costEstimate?: string;
  notes?: string;
};

export type CalendarEvent = {
  id: string;
  title: string;
  description: string;
  eventType: string;
  status: string;
  startAt: string;
  endAt: string;
  condominium: string;
  linkedEntityType: string;
  linkedEntityId: string;
  attendees: string[];
  location: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
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

// ── Ocorrencia (Tickets & Avarias) ──

export type OcorrenciaTipo = 'avaria' | 'pedido' | 'reclamacao' | 'pergunta' | 'tarefaInterna';
export type OcorrenciaStatus = 'nova' | 'emTriagem' | 'aguardaPecas' | 'emCurso' | 'pendente' | 'resolvida' | 'fechada' | 'reaberta';
export type Prioridade = 'baixa' | 'normal' | 'alta' | 'urgente';
export type Impacto = 'baixo' | 'medio' | 'alto' | 'critico';
export type Urgencia = 'baixa' | 'media' | 'alta' | 'imediata';
export type Canal = 'portal' | 'email' | 'telefone' | 'presencial' | 'interno';
export type ComentarioVisibilidade = 'interno' | 'publico';

export type Ocorrencia = {
  id: string;
  titulo: string;
  tipo: OcorrenciaTipo;
  status: OcorrenciaStatus;
  prioridade: Prioridade;
  impacto: Impacto;
  urgencia: Urgencia;
  descricao: string;
  condominiumId: string;
  requisitanteNome: string;
  requisitanteEmail: string;
  requisitanteTelefone: string;
  canal: Canal;
  categoria: string;
  atribuidoA: string;
  tags: string[];
  blocoId: string;
  pisoId: string;
  zonaId: string;
  equipamentoId: string;
  custoEstimado: string;
  custoFinal: string;
  fornecedorId: string;
  referenciaContrato: string;
  mediaIds: string[];
  documentoIds: string[];
  motivoResolucao: string;
  slaRespostaEm: string;
  slaResolucaoEm: string;
  respondidoEm: string;
  resolvidoEm: string;
  fechadoEm: string;
  tokenAcompanhamento: string;
  criadoEm: string;
  atualizadoEm: string;
};

export type OcorrenciaComentario = {
  id: string;
  ocorrenciaId: string;
  autorId: string;
  autorNome: string;
  texto: string;
  visibilidade: ComentarioVisibilidade;
  criadoEm: string;
};

export type OcorrenciaAnexo = {
  id: string;
  ocorrenciaId: string;
  nome: string;
  mimeType: string;
  tamanhoBytes: number;
  storageKey: string;
  uploadedPor: string;
  criadoEm: string;
};

export type OcorrenciaHistoricoItem = {
  timestamp: string;
  autor: string;
  acao: string;
  descricao: string;
};

export type OcorrenciaDetalhe = {
  ocorrencia: Ocorrencia;
  comentarios: OcorrenciaComentario[];
  anexos: OcorrenciaAnexo[];
  historico: OcorrenciaHistoricoItem[];
};

export type OcorrenciasMetricas = {
  totalAbertas: number;
  urgentes: number;
  totalAvarias: number;
  mttrSegundos: number;
  agingMaxDias: number;
};

export type PaginatedOcorrencias = {
  data: Ocorrencia[];
  total: number;
  page: number;
  pageSize: number;
};

export type OcorrenciaInput = {
  titulo: string;
  tipo: OcorrenciaTipo;
  descricao?: string;
  condominiumId?: string;
  requisitanteNome?: string;
  requisitanteEmail?: string;
  requisitanteTelefone?: string;
  canal?: Canal;
  categoria?: string;
  prioridade?: Prioridade;
  impacto?: Impacto;
  urgencia?: Urgencia;
  blocoId?: string;
  pisoId?: string;
  zonaId?: string;
  equipamentoId?: string;
  atribuidoA?: string;
  tags?: string[];
};

export type ResourceState = {
  condominiums: Condominium[];
  buildings: Building[];
  fractions: Fraction[];
  residents: Resident[];
  tickets: Ticket[];
  ocorrencias: Ocorrencia[];
  suppliers: Supplier[];
  documents: DocumentItem[];
  reports: Report[];
  maintenance: MaintenanceItem[];
  calendarEvents: CalendarEvent[];
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
  | 'ocorrencias'
  | 'suppliers'
  | 'documents'
  | 'reports'
  | 'assemblies'
  | 'maintenance'
  | 'calendar-events'
  | 'accounting/quotas'
  | 'accounting/payments'
  | 'accounting/debts'
  | 'accounting/receipts'
  | 'accounting/expenses';

export type ResourceEndpoint = CreateResource;
