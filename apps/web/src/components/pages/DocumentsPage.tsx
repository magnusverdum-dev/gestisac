import { component$, useSignal, useTask$, type PropFunction } from '@builder.io/qwik';
import {
  CheckIcon,
  DownloadIcon,
  EditIcon,
  EyeIcon,
  FilePlusIcon,
  FileTextIcon,
  FilterIcon,
  MoreHorizontalIcon,
  SearchIcon,
  Trash2Icon
} from 'lucide-qwik';
import type {
  CreateResource,
  DocumentPreview,
  GenerateDocumentPayload,
  ReportPreview,
  ResourceEndpoint
} from '../../lib/api';
import type { DemoPage } from '../../data/pages';
import {
  OPERATIONAL_PAGE_SIZE,
  matchesDocumentContext,
  recordVisualFor,
  rowKeyFor,
  searchableRecordText,
  tableLabelsFor
} from './operationalDisplay';

type DocumentsPageProps = {
  page: DemoPage;
  isSaving: boolean;
  isPreviewLoading: boolean;
  reportPreview: ReportPreview | null;
  documentPreview: DocumentPreview | null;
  createIntentResource: CreateResource | '';
  createIntentVersion: number;
  onCreate$: PropFunction<(resource: ResourceEndpoint, payload: Record<string, string | number>) => void>;
  onUpdate$: PropFunction<(
    resource: ResourceEndpoint,
    id: string,
    payload: Record<string, string | number>
  ) => void>;
  onDelete$: PropFunction<(resource: ResourceEndpoint, id: string) => void>;
  onUploadDocument$: PropFunction<(payload: FormData) => void>;
  onGenerateDocument$: PropFunction<(payload: GenerateDocumentPayload) => void>;
  onPreviewReport$: PropFunction<(id: string) => void>;
  onExportReport$: PropFunction<(id: string) => void>;
  onPreviewDocument$: PropFunction<(id: string) => void>;
  onDownloadDocument$: PropFunction<(id: string) => void>;
  onCloseReportPreview$: PropFunction<() => void>;
  onCloseDocumentPreview$: PropFunction<() => void>;
};

const documentContexts = [
  { id: 'todos', title: 'Todos', detail: 'Arquivo completo' },
  { id: 'condominios', title: 'Condominios', detail: 'Atas, seguros e plantas' },
  { id: 'fornecedores', title: 'Fornecedores', detail: 'Contratos e propostas' },
  { id: 'manutencao', title: 'Manutencao', detail: 'Relatorios tecnicos' },
  { id: 'tickets', title: 'Tickets', detail: 'Anexos de ocorrencias' }
] as const;

export const DocumentsPage = component$((props: DocumentsPageProps) => {
  const detailKey = useSignal('');
  const editKey = useSignal('');
  const searchQuery = useSignal('');
  const selectedRows = useSignal<string[]>([]);
  const statusFilter = useSignal('Todos');
  const visibleLimit = useSignal(OPERATIONAL_PAGE_SIZE);
  const selectedDocumentTemplate = useSignal(props.page.documentTemplates?.[0]?.id ?? '');
  const documentFormat = useSignal<'pdf' | 'txt'>('pdf');
  const activeDocumentContext = useSignal('todos');
  const documentCreateOpen = useSignal(false);
  const documentFactoryOpen = useSignal(false);
  const filtersVisible = useSignal(false);
  const createConfig = props.page.resource
    ? {
        label: props.page.action,
        resource: props.page.resource,
        fields: props.page.createFields ?? []
      }
    : null;
  const statusOptions = Array.from(new Set(props.page.records.map((record) => record.status))).slice(0, 8);
  const normalizedSearch = searchQuery.value.trim().toLowerCase();
  const filteredRecords = props.page.records.filter((record) => {
    const matchesStatus = statusFilter.value === 'Todos' || record.status === statusFilter.value;
    const matchesSearch = !normalizedSearch || searchableRecordText(record).includes(normalizedSearch);

    return matchesStatus && matchesSearch;
  });
  const visibleDocumentRecords = filteredRecords.filter((record) =>
    matchesDocumentContext(record, activeDocumentContext.value)
  );
  const displayedDocumentRecords = visibleDocumentRecords.slice(0, visibleLimit.value);
  const hasMoreRecords = visibleDocumentRecords.length > displayedDocumentRecords.length;
  const editRecord = editKey.value
    ? visibleDocumentRecords.find((record) => rowKeyFor(record) === editKey.value)
    : undefined;
  const tableLabels = tableLabelsFor('/documentos');
  const visibleKeys = displayedDocumentRecords.map((record) => rowKeyFor(record));
  const allVisibleSelected =
    visibleKeys.length > 0 && visibleKeys.every((key) => selectedRows.value.includes(key));

  useTask$(({ track }) => {
    track(() => props.createIntentVersion);
    if (props.createIntentResource === 'documents') {
      documentCreateOpen.value = true;
      documentFactoryOpen.value = false;
      editKey.value = '';
      detailKey.value = '';
    }
  });

  return (
    <section class="page-view operational-page documents-operational-page">
      <header class="page-header compact-page-header">
        <div>
          <span class="page-eyebrow">GESTISAC - Documentos</span>
          <h1>Documentos</h1>
          <p>Arquivo pesquisavel por contexto, com upload, preview, download e geracao documental.</p>
        </div>
        <div class="simple-header-actions">
          <button
            class="primary-action action-with-icon"
            type="button"
            disabled={!createConfig}
            onClick$={() => {
              documentCreateOpen.value = !documentCreateOpen.value;
              documentFactoryOpen.value = false;
              editKey.value = '';
            }}
          >
            <FilePlusIcon size={16} />
            <span>Adicionar documento</span>
          </button>
          <button
            class="secondary-action action-with-icon"
            type="button"
            disabled={!props.page.documentTemplates?.length}
            onClick$={() => {
              documentFactoryOpen.value = !documentFactoryOpen.value;
              documentCreateOpen.value = false;
              editKey.value = '';
            }}
          >
            <FileTextIcon size={16} />
            <span>Gerador</span>
          </button>
        </div>
      </header>

      <section class="summary-grid" aria-label="Resumo de documentos">
        {props.page.stats.map((stat) => (
          <article class={`summary-card ${stat.tone ?? 'blue'}`} key={stat.label}>
            <small>{stat.label}</small>
            <strong>{stat.value}</strong>
            <span>{stat.detail}</span>
          </article>
        ))}
      </section>

      {createConfig && documentCreateOpen.value ? (
        <form
          class="create-panel glass-panel"
          preventdefault:submit
          onSubmit$={async (event) => {
            const form = event.target as HTMLFormElement;
            const formData = new FormData(form);
            const payload: Record<string, string | number> = {};
            const hasFileField = createConfig.fields.some((field) => field.type === 'file');

            if (hasFileField && createConfig.resource === 'documents') {
              await props.onUploadDocument$(formData);
              form.reset();
              documentCreateOpen.value = false;
              return;
            }

            createConfig.fields.forEach((field) => {
              if (field.type === 'file') {
                return;
              }
              const value = String(formData.get(field.name) ?? '').trim();
              payload[field.name] = field.type === 'number' ? Number(value || 0) : value;
            });

            await props.onCreate$(createConfig.resource, payload);
            form.reset();
            documentCreateOpen.value = false;
          }}
        >
          <header>
            <strong>{createConfig.label}</strong>
            <span>Upload direto para o arquivo operacional.</span>
          </header>
          <div class="create-grid">
            {createConfig.fields.map((field) => (
              <label key={field.name}>
                <span>{field.label}</span>
                <input
                  name={field.name}
                  type={field.type ?? 'text'}
                  placeholder={field.placeholder}
                  required
                />
              </label>
            ))}
          </div>
          <div class="create-actions">
            <button type="button" onClick$={() => (documentCreateOpen.value = false)}>
              Cancelar
            </button>
            <button class="primary-action" type="submit" disabled={props.isSaving}>
              {props.isSaving ? 'A guardar...' : 'Guardar'}
            </button>
          </div>
        </form>
      ) : null}

      {editRecord?.id && editRecord.resource && editRecord.fields?.length ? (
        <form
          class="create-panel edit-panel glass-panel"
          preventdefault:submit
          onSubmit$={async (event) => {
            const form = event.target as HTMLFormElement;
            const formData = new FormData(form);
            const payload: Record<string, string | number> = {};

            editRecord.fields?.forEach((field) => {
              const value = String(formData.get(field.name) ?? '').trim();
              const fallback = String(editRecord.values?.[field.name] ?? '').trim();
              payload[field.name] = field.type === 'number' ? Number(value || fallback || 0) : value || fallback;
            });

            await props.onUpdate$(editRecord.resource!, editRecord.id!, payload);
            editKey.value = '';
          }}
        >
          <header>
            <strong>Editar {editRecord.title}</strong>
            <span>Atualizacao persistida no arquivo documental.</span>
          </header>
          <div class="create-grid">
            {editRecord.fields.map((field) => (
              <label key={field.name}>
                <span>{field.label}</span>
                <input
                  name={field.name}
                  type={field.type ?? 'text'}
                  value={String(editRecord.values?.[field.name] ?? '')}
                  placeholder={String(editRecord.values?.[field.name] ?? field.placeholder ?? '')}
                  required
                />
              </label>
            ))}
          </div>
          <div class="create-actions">
            <button type="button" onClick$={() => (editKey.value = '')}>
              Cancelar
            </button>
            <button class="primary-action" type="submit" disabled={props.isSaving}>
              {props.isSaving ? 'A guardar...' : 'Guardar alteracoes'}
            </button>
          </div>
        </form>
      ) : null}

      {props.page.documentTemplates?.length && documentFactoryOpen.value ? (
        <section class="document-factory glass-panel" aria-label="Gerador de documentos">
          <header>
            <div>
              <small>Gerador documental</small>
              <h2>Escolhe o documento que queres criar</h2>
              <p>Modelos operacionais para assembleias, cobranca, manutencao e arquivo.</p>
            </div>
            <div class="format-toggle" aria-label="Formato do documento">
              <button
                class={documentFormat.value === 'pdf' ? 'active' : ''}
                type="button"
                onClick$={() => {
                  documentFormat.value = 'pdf';
                }}
              >
                PDF
              </button>
              <button
                class={documentFormat.value === 'txt' ? 'active' : ''}
                type="button"
                onClick$={() => {
                  documentFormat.value = 'txt';
                }}
              >
                Texto
              </button>
            </div>
          </header>
          <div class="document-template-grid">
            {props.page.documentTemplates.map((template) => (
              <button
                class={selectedDocumentTemplate.value === template.id ? 'active' : ''}
                key={template.id}
                type="button"
                onClick$={() => {
                  selectedDocumentTemplate.value = template.id;
                }}
              >
                <small>{template.category}</small>
                <strong>{template.label}</strong>
                <span>{template.description}</span>
                <em>{template.dataSources.join(' + ')}</em>
              </button>
            ))}
          </div>
          <form
            class="document-generator-form"
            preventdefault:submit
            onSubmit$={async (event) => {
              const form = event.target as HTMLFormElement;
              const formData = new FormData(form);
              await props.onGenerateDocument$({
                template: selectedDocumentTemplate.value,
                condominium: String(formData.get('condominium') ?? '').trim(),
                resident: String(formData.get('resident') ?? '').trim(),
                fraction: String(formData.get('fraction') ?? '').trim(),
                notes: String(formData.get('notes') ?? '').trim(),
                format: documentFormat.value
              });
            }}
          >
            <label>
              <span>Condominio</span>
              <input name="condominium" placeholder="Condominio Vila Verde" />
            </label>
            <label>
              <span>Condomino</span>
              <input name="resident" placeholder="Maria Fernandes" />
            </label>
            <label>
              <span>Fracao</span>
              <input name="fraction" placeholder="A-1" />
            </label>
            <label class="document-notes">
              <span>Notas / contexto</span>
              <textarea name="notes" placeholder="Contexto simples para gerar o documento..." />
            </label>
            <button class="primary-action" type="submit" disabled={props.isSaving}>
              {props.isSaving ? 'A gerar...' : `Gerar ${documentFormat.value.toUpperCase()}`}
            </button>
          </form>
        </section>
      ) : null}

      {props.documentPreview ? (
        <section class="document-preview glass-panel" aria-label="Preview do documento">
          <header>
            <div>
              <small>Arquivo documental</small>
              <h2>{props.documentPreview.document.title}</h2>
              <span>{props.documentPreview.document.type} - {props.documentPreview.document.condominium}</span>
            </div>
            <div class="document-preview-actions">
              <button type="button" onClick$={() => props.onDownloadDocument$(props.documentPreview!.document.id)}>
                <DownloadIcon size={16} />
                <span>Download</span>
              </button>
              <button type="button" onClick$={props.onCloseDocumentPreview$}>
                Fechar preview
              </button>
            </div>
          </header>
          <pre class="document-preview-content">
            {props.documentPreview.content ??
              'Este documento existe no arquivo e pode ser descarregado. Preview textual indisponivel para este formato.'}
          </pre>
        </section>
      ) : null}

      <section class="records-panel glass-panel ops-panel">
        <header class="ops-panel-header">
          <div>
            <small>Arquivo documental</small>
            <h2>Documentos por contexto</h2>
          </div>
          <div class="ops-toolbar">
            <label class="ops-search">
              <SearchIcon size={16} />
              <input
                type="search"
                placeholder="Pesquisar por titulo, tipo, estado ou condominio"
                value={searchQuery.value}
                onInput$={(event) => {
                  searchQuery.value = (event.target as HTMLInputElement).value;
                  detailKey.value = '';
                  editKey.value = '';
                  visibleLimit.value = OPERATIONAL_PAGE_SIZE;
                }}
              />
            </label>
            <button
              class="secondary-action action-with-icon"
              type="button"
              onClick$={() => {
                filtersVisible.value = !filtersVisible.value;
              }}
            >
              <FilterIcon size={16} />
              <span>{filtersVisible.value ? 'Ocultar' : 'Filtrar'}</span>
            </button>
          </div>
        </header>

        <div class="document-context-strip" aria-label="Contexto documental">
          {documentContexts.map((context) => {
            const count = props.page.records.filter((record) => matchesDocumentContext(record, context.id)).length;

            return (
              <button
                class={activeDocumentContext.value === context.id ? 'active' : ''}
                key={context.id}
                type="button"
                onClick$={() => {
                  activeDocumentContext.value = context.id;
                  detailKey.value = '';
                  editKey.value = '';
                  visibleLimit.value = OPERATIONAL_PAGE_SIZE;
                }}
              >
                <strong>{context.title}</strong>
                <span>{count}</span>
                <small>{context.detail}</small>
              </button>
            );
          })}
        </div>

        <div class="ops-filter-strip">
          <span>{selectedRows.value.length ? `${selectedRows.value.length} selecionados` : `${visibleDocumentRecords.length} registos`}</span>
          {filtersVisible.value ? (
            <div class="status-filters" aria-label="Filtros por estado">
              <button
                class={statusFilter.value === 'Todos' ? 'active' : ''}
                type="button"
                onClick$={() => {
                  statusFilter.value = 'Todos';
                  detailKey.value = '';
                  editKey.value = '';
                  visibleLimit.value = OPERATIONAL_PAGE_SIZE;
                }}
              >
                Todos
              </button>
              {statusOptions.map((status) => (
                <button
                  class={statusFilter.value === status ? 'active' : ''}
                  key={status}
                  type="button"
                  onClick$={() => {
                    statusFilter.value = status;
                    detailKey.value = '';
                    editKey.value = '';
                    visibleLimit.value = OPERATIONAL_PAGE_SIZE;
                  }}
                >
                  {status}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div class="ops-table-shell">
          <table class="ops-table">
            <thead>
              <tr>
                <th class="ops-select-cell">
                  <input
                    aria-label="Selecionar documentos visiveis"
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange$={(event) => {
                      const checked = (event.target as HTMLInputElement).checked;
                      selectedRows.value = checked
                        ? Array.from(new Set([...selectedRows.value, ...visibleKeys]))
                        : selectedRows.value.filter((key) => !visibleKeys.includes(key));
                    }}
                  />
                </th>
                <th>{tableLabels.primary}</th>
                <th>{tableLabels.visual}</th>
                <th>{tableLabels.secondary}</th>
                <th>Estado</th>
                <th>Acoes</th>
              </tr>
            </thead>
            <tbody>
              {visibleDocumentRecords.length ? (
                displayedDocumentRecords.map((record) => {
                  const visual = recordVisualFor('/documentos', record);
                  const rowKey = rowKeyFor(record);
                  const isExpanded = detailKey.value === rowKey;
                  const isSelected = selectedRows.value.includes(rowKey);

                  return (
                    <>
                      <tr class={`ops-row ${isExpanded ? 'expanded' : ''} ${isSelected ? 'selected' : ''}`} key={rowKey}>
                        <td class="ops-select-cell">
                          <input
                            aria-label={`Selecionar ${record.title}`}
                            type="checkbox"
                            checked={isSelected}
                            onChange$={(event) => {
                              const checked = (event.target as HTMLInputElement).checked;
                              selectedRows.value = checked
                                ? Array.from(new Set([...selectedRows.value, rowKey]))
                                : selectedRows.value.filter((key) => key !== rowKey);
                            }}
                          />
                        </td>
                        <td>
                          <div class="ops-primary-cell">
                            <strong>{record.title}</strong>
                            <span>{record.meta}</span>
                          </div>
                        </td>
                        <td>
                          <div class={`ops-visual ${visual.tone}`}>
                            <small>{visual.label}</small>
                            <strong>{visual.value}</strong>
                            <span>{visual.detail}</span>
                            {visual.progress !== undefined ? (
                              <div class="ops-progress" aria-hidden="true">
                                <span style={{ width: `${visual.progress}%` }} />
                              </div>
                            ) : null}
                          </div>
                        </td>
                        <td>
                          <span class="ops-secondary">{record.detail}</span>
                        </td>
                        <td>
                          <span class={`ops-status ${visual.tone}`}>{record.status}</span>
                        </td>
                        <td>
                          <div class="ops-actions">
                            <button
                              class="icon-action"
                              type="button"
                              title="Abrir detalhe"
                              aria-label={`Abrir detalhe de ${record.title}`}
                              onClick$={() => {
                                detailKey.value = detailKey.value === rowKey ? '' : rowKey;
                              }}
                            >
                              <EyeIcon size={16} />
                              <span>Abrir</span>
                            </button>
                            <details class="simple-more-menu ops-more-menu">
                              <summary aria-label={`Mais acoes para ${record.title}`}>
                                <MoreHorizontalIcon size={16} />
                                <span>Mais</span>
                              </summary>
                              {record.quickActions?.map((quickAction) => (
                                <button
                                  class={`quick-record-action ${quickAction.tone ?? 'primary'}`}
                                  key={quickAction.label}
                                  type="button"
                                  disabled={props.isSaving}
                                  onClick$={async () => {
                                    if (quickAction.action.type === 'update') {
                                      await props.onUpdate$(
                                        quickAction.action.resource,
                                        quickAction.action.id,
                                        quickAction.action.payload
                                      );
                                    } else if (quickAction.action.type === 'create') {
                                      await props.onCreate$(
                                        quickAction.action.resource,
                                        quickAction.action.payload
                                      );
                                    } else if (quickAction.action.type === 'reportPreview') {
                                      await props.onPreviewReport$(quickAction.action.reportId);
                                    } else if (quickAction.action.type === 'reportExport') {
                                      await props.onExportReport$(quickAction.action.reportId);
                                    } else if (quickAction.action.type === 'documentPreview') {
                                      await props.onPreviewDocument$(quickAction.action.documentId);
                                    } else {
                                      await props.onDownloadDocument$(quickAction.action.documentId);
                                    }

                                    detailKey.value = '';
                                    editKey.value = '';
                                  }}
                                >
                                  <CheckIcon size={14} />
                                  <span>{quickAction.label}</span>
                                </button>
                              ))}
                              {record.canEdit && record.fields?.length ? (
                                <button
                                  type="button"
                                  onClick$={() => {
                                    documentCreateOpen.value = false;
                                    editKey.value = editKey.value === rowKey ? '' : rowKey;
                                  }}
                                >
                                  <EditIcon size={14} />
                                  <span>Editar</span>
                                </button>
                              ) : null}
                              {record.canDelete && record.id && record.resource ? (
                                <button
                                  class="danger-action"
                                  type="button"
                                  onClick$={async () => {
                                    if (window.confirm(`Apagar "${record.title}"?`)) {
                                      await props.onDelete$(record.resource!, record.id!);
                                      detailKey.value = '';
                                      editKey.value = '';
                                    }
                                  }}
                                >
                                  <Trash2Icon size={14} />
                                  <span>Apagar</span>
                                </button>
                              ) : null}
                            </details>
                          </div>
                        </td>
                      </tr>
                      {isExpanded ? (
                        <tr class="ops-detail-row">
                          <td colSpan={6}>
                            <div class="record-detail">
                              <strong>Detalhe documental</strong>
                              <span>{record.detail}</span>
                              <span>{record.meta}</span>
                              <span>Estado: {record.status}</span>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </>
                  );
                })
              ) : (
                <tr class="ops-empty-row">
                  <td colSpan={6}>
                    <strong>{props.page.records.length ? 'Sem resultados' : 'Sem documentos ainda'}</strong>
                    <span>
                      {props.page.records.length
                        ? 'Ajusta a pesquisa, o contexto ou o filtro ativo.'
                        : 'Carrega o primeiro documento quando esta area estiver ativa.'}
                    </span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {hasMoreRecords ? (
          <div class="ops-load-more">
            <span>
              A mostrar {displayedDocumentRecords.length} de {visibleDocumentRecords.length} documentos filtrados
            </span>
            <button
              class="secondary-action"
              type="button"
              onClick$={() => {
                visibleLimit.value += OPERATIONAL_PAGE_SIZE;
              }}
            >
              Mostrar mais
            </button>
          </div>
        ) : null}
      </section>
    </section>
  );
});
