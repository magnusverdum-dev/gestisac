import type { DemoPage } from '../../data/pages';

export type OperationalTone = 'blue' | 'green' | 'gold' | 'danger' | 'purple' | 'muted';

export type TableLabels = {
  primary: string;
  visual: string;
  secondary: string;
};

export type RecordVisual = {
  label: string;
  value: string;
  detail: string;
  tone: OperationalTone;
  kind: 'progress' | 'money' | 'date' | 'file' | 'permission' | 'status';
  progress?: number;
  permissions?: Array<{
    label: string;
    enabled: boolean;
  }>;
};

type DemoRecord = DemoPage['records'][number];

export const OPERATIONAL_PAGE_SIZE = 25;

export function rowKeyFor(record: DemoRecord): string {
  if (record.id) {
    return `${record.resource ?? 'record'}:${record.id}`;
  }

  const valuesSignature = Object.entries(record.values ?? {})
    .filter(([, value]) => ['boolean', 'number', 'string'].includes(typeof value))
    .map(([key, value]) => `${key}:${String(value)}`)
    .sort()
    .join('|');

  return [
    record.resource ?? 'record',
    record.title,
    record.meta,
    record.status,
    record.detail,
    valuesSignature
  ].join('::');
}

export function searchableRecordText(record: DemoRecord): string {
  const valuesText = Object.values(record.values ?? {})
    .filter((value) => ['boolean', 'number', 'string'].includes(typeof value))
    .map((value) => String(value))
    .join(' ');

  return `${record.title} ${record.meta} ${record.detail} ${record.status} ${valuesText}`.toLowerCase();
}

export function tableLabelsFor(pagePath: string): TableLabels {
  switch (pagePath) {
    case '/contabilidade':
      return { primary: 'Movimento', visual: 'Valor', secondary: 'Condominio / data' };
    case '/administracao':
    case '/tickets':
      return { primary: 'Ocorrencia', visual: 'Prioridade', secondary: 'Acompanhamento' };
    case '/relatorios':
      return { primary: 'Relatorio', visual: 'Periodo', secondary: 'Prontidao' };
    case '/assembleias':
      return { primary: 'Assembleia', visual: 'Data', secondary: 'Condominio' };
    case '/documentos':
      return { primary: 'Documento', visual: 'Tipo / ficheiro', secondary: 'Condominio' };
    case '/manutencao':
      return { primary: 'Intervencao', visual: 'Agenda', secondary: 'Fornecedor' };
    case '/fornecedores':
      return { primary: 'Fornecedor', visual: 'Categoria', secondary: 'Contacto' };
    case '/definicoes':
      return { primary: 'Registo', visual: 'Permissoes', secondary: 'Auditoria' };
    default:
      return { primary: 'Item', visual: 'Sinal', secondary: 'Detalhe' };
  }
}

export function recordVisualFor(pagePath: string, record: DemoRecord): RecordVisual {
  const values = record.values ?? {};
  const status = textValue(values, 'status') || record.status;
  const tone = statusTone(`${record.status} ${status} ${record.detail}`);

  switch (pagePath) {
    case '/contabilidade': {
      const amount = numberValue(values, 'amount');
      const date = firstText(values, ['dueDate', 'paidAt', 'issuedAt']);

      return {
        label: 'Valor',
        value: amount === null ? record.status : formatCurrency(amount),
        detail: date ? `Data: ${date}` : 'Movimento financeiro',
        tone,
        kind: 'money',
        progress: progressForStatus(status)
      };
    }
    case '/administracao':
    case '/tickets': {
      const priority = textValue(values, 'priority') || record.status;
      const workflow = textValue(values, 'status') || record.detail;

      return {
        label: 'Prioridade',
        value: priority,
        detail: workflow,
        tone: statusTone(priority),
        kind: 'progress',
        progress: progressForStatus(`${priority} ${workflow}`)
      };
    }
    case '/relatorios':
      return {
        label: 'Periodo',
        value: textValue(values, 'period') || record.meta,
        detail: isCompleteStatus(status) ? 'Exportavel' : 'Em preparacao',
        tone,
        kind: 'progress',
        progress: progressForStatus(status)
      };
    case '/assembleias':
      return {
        label: 'Data',
        value: textValue(values, 'date') || record.detail,
        detail: status,
        tone,
        kind: 'date',
        progress: progressForStatus(status)
      };
    case '/documentos': {
      const fileName = textValue(values, 'fileName');
      const size = numberValue(values, 'sizeBytes');

      return {
        label: textValue(values, 'type') || 'Documento',
        value: textValue(values, 'type') || record.meta.split('-')[0]?.trim() || 'Arquivo',
        detail: fileName ? `${fileName}${size ? ` - ${formatBytes(size)}` : ''}` : record.detail,
        tone,
        kind: 'file',
        progress: progressForStatus(status)
      };
    }
    case '/manutencao':
      return {
        label: 'Agenda',
        value: textValue(values, 'date') || record.detail,
        detail: textValue(values, 'supplier') || record.meta,
        tone,
        kind: 'date',
        progress: progressForStatus(status)
      };
    case '/fornecedores':
      return {
        label: 'Categoria',
        value: textValue(values, 'category') || record.meta,
        detail: status,
        tone,
        kind: 'status',
        progress: progressForStatus(status)
      };
    case '/definicoes': {
      const permissions = permissionMatrixFor(record) ?? [];

      return {
        label: permissions.length ? 'Acesso' : 'Auditoria',
        value: record.status,
        detail: record.meta,
        tone,
        kind: 'permission',
        permissions
      };
    }
    default:
      return {
        label: 'Estado',
        value: record.status,
        detail: record.detail,
        tone,
        kind: 'progress',
        progress: progressForStatus(status)
      };
  }
}

export function statusTone(value: string): OperationalTone {
  const normalized = value.toLowerCase();

  if (
    normalized.includes('crit') ||
    normalized.includes('urgente') ||
    normalized.includes('atraso') ||
    normalized.includes('expirar') ||
    normalized.includes('bloque')
  ) {
    return 'danger';
  }

  if (
    normalized.includes('paga') ||
    normalized.includes('confirm') ||
    normalized.includes('resolvido') ||
    normalized.includes('conclu') ||
    normalized.includes('arquivado') ||
    normalized.includes('ativo') ||
    normalized.includes('regularizada') ||
    normalized.includes('saudavel')
  ) {
    return 'green';
  }

  if (
    normalized.includes('pendente') ||
    normalized.includes('vencer') ||
    normalized.includes('pronto') ||
    normalized.includes('convoc') ||
    normalized.includes('agend') ||
    normalized.includes('analise') ||
    normalized.includes('contactado')
  ) {
    return 'gold';
  }

  if (normalized.includes('permiss') || normalized.includes('role')) {
    return 'purple';
  }

  return 'blue';
}

export function matchesDocumentContext(record: DemoRecord, context: string): boolean {
  if (context === 'todos') {
    return true;
  }

  const searchable = searchableRecordText(record);
  const keywords: Record<string, string[]> = {
    condominios: ['condominio', 'seguro', 'planta', 'regulamento', 'ata', 'certificado'],
    fornecedores: ['fornecedor', 'contrato', 'proposta', 'legal'],
    manutencao: ['manutencao', 'relatorio tecnico', 'inspecao', 'garantia', 'manual'],
    vistorias: ['vistoria', 'relatorio de vistoria', 'inspecao', 'checklist', 'validacao hq']
  };

  return (keywords[context] ?? []).some((keyword) => searchable.includes(keyword));
}

function permissionMatrixFor(record: DemoRecord): RecordVisual['permissions'] {
  const values = record.values ?? {};
  const hasPermissionShape =
    typeof values.canRead === 'boolean' ||
    typeof values.canWrite === 'boolean' ||
    typeof values.canDelete === 'boolean';

  if (hasPermissionShape) {
    return [
      { label: 'L', enabled: Boolean(values.canRead) },
      { label: 'E', enabled: Boolean(values.canWrite) },
      { label: 'A', enabled: Boolean(values.canDelete) }
    ];
  }

  const searchable = `${record.status} ${record.detail}`.toLowerCase();
  if (!searchable.includes('pode') && !searchable.includes('leitura')) {
    return [];
  }

  return [
    { label: 'L', enabled: true },
    { label: 'E', enabled: searchable.includes('editar') },
    { label: 'A', enabled: searchable.includes('apagar') }
  ];
}

function progressForStatus(value: string): number {
  const normalized = value.toLowerCase();

  if (isCompleteStatus(value)) {
    return 100;
  }

  if (normalized.includes('pronto') || normalized.includes('confirm')) {
    return 86;
  }

  if (normalized.includes('contactado') || normalized.includes('analise') || normalized.includes('agend')) {
    return 62;
  }

  if (normalized.includes('pendente') || normalized.includes('vencer') || normalized.includes('convoc')) {
    return 46;
  }

  if (
    normalized.includes('crit') ||
    normalized.includes('urgente') ||
    normalized.includes('atraso') ||
    normalized.includes('expirar')
  ) {
    return 28;
  }

  return 56;
}

function isCompleteStatus(value: string): boolean {
  const normalized = value.toLowerCase();

  return (
    normalized.includes('paga') ||
    normalized.includes('confirm') ||
    normalized.includes('resolvido') ||
    normalized.includes('conclu') ||
    normalized.includes('exportado') ||
    normalized.includes('arquivado') ||
    normalized.includes('ativo') ||
    normalized.includes('regularizada')
  );
}

function firstText(values: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = textValue(values, key);
    if (value) {
      return value;
    }
  }

  return '';
}

function textValue(values: Record<string, unknown>, key: string): string {
  const value = values[key];

  if (value === null || value === undefined) {
    return '';
  }

  return String(value).trim();
}

function numberValue(values: Record<string, unknown>, key: string): number | null {
  const value = values[key];

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value.replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
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
