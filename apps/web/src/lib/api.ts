export type {
  AccountingPayment,
  AccountingState,
  AccountingSummary,
  AlertItem,
  ApiStatus,
  Assembly,
  AuditLogEntry,
  Building,
  CalendarEvent,
  CompletenessReport,
  Condominium,
  CondominiumAddress,
  CondominiumBlock,
  CondominiumContact,
  CondominiumDetailResponse,
  CondominiumEquipment,
  CondominiumFloor,
  CondominiumHistoryEvent,
  CondominiumInternalNote,
  CondominiumManagedDocument,
  CondominiumMedia,
  CondominiumOnboardingDraft,
  CondominiumOperationalStatus,
  CondominiumStructure,
  CondominiumZone,
  CreateResource,
  DashboardMetric,
  DashboardModule,
  DashboardResponse,
  Debt,
  DocumentItem,
  DocumentPreview,
  DocumentTemplate,
  Expense,
  Fraction,
  GenerateDocumentPayload,
  GlobalSearchResult,
  ImportPreview,
  ImportReport,
  ImportRowInput,
  LoginResponse,
  MaintenanceItem,
  PaginatedResponse,
  PermissionsResponse,
  PublicUser,
  Quota,
  Receipt,
  Report,
  ReportPreview,
  ReserveFund,
  Resident,
  ResourceEndpoint,
  ResourceState,
  Supplier,
  Ticket
} from './api/types';

export {
  SESSION_EXPIRES_KEY,
  SESSION_REFRESH_KEY,
  SESSION_TOKEN_KEY,
  getApiHealth,
  getDashboard,
  login,
  logout,
  me,
  refreshSession,
  updateActiveCondominium
} from './api/auth';

export { getAccounting } from './api/accounting';

export {
  archiveCondominium,
  commitCondominiumImport,
  createCondominiumSubresource,
  deleteCondominiumSubresource,
  getCondominiumCompleteness,
  getCondominiumDetail,
  getCondominiumHistory,
  previewCondominiumImport,
  saveCondominiumDraft,
  updateCondominiumSection,
  updateCondominiumSubresource,
  type CondominiumSubresource
} from './api/condominiums';

export {
  downloadDocument,
  generateDocument,
  getDocumentPreview,
  getDocumentTemplates,
  uploadDocument
} from './api/documents';

export {
  createResource,
  deleteResource,
  getResourcePage,
  updateResource
} from './api/pagination';

export {
  exportReport,
  getReportPreview
} from './api/reports';

export { getResources } from './api/resources';
