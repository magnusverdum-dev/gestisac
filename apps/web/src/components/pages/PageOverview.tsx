import { component$, useSignal, useTask$, type PropFunction } from '@builder.io/qwik';
import {
  CheckIcon,
  EditIcon,
  EyeIcon,
  FilterIcon,
  MoreHorizontalIcon,
  PlusIcon,
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
  recordVisualFor,
  rowKeyFor,
  searchableRecordText,
  tableLabelsFor
} from './operationalDisplay';

type PageOverviewProps = {
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

export const PageOverview = component$((props: PageOverviewProps) => {
  const isCreating = useSignal(false);
  const activeCreateIndex = useSignal(0);
  const detailKey = useSignal('');
  const editKey = useSignal('');
  const filtersVisible = useSignal(false);
  const searchQuery = useSignal('');
  const selectedRows = useSignal<string[]>([]);
  const statusFilter = useSignal('Todos');
  const visibleLimit = useSignal(OPERATIONAL_PAGE_SIZE);
  const activeOption = props.page.createOptions?.[activeCreateIndex.value];
  const createConfig = activeOption ??
    (props.page.resource
      ? {
          label: props.page.action,
          resource: props.page.resource,
          fields: props.page.createFields ?? []
        }
      : null);
  const statusOptions = Array.from(new Set(props.page.records.map((record) => record.status))).slice(0, 8);
  const normalizedSearch = searchQuery.value.trim().toLowerCase();
  const filteredRecords = props.page.records.filter((record) => {
    const matchesStatus = statusFilter.value === 'Todos' || record.status === statusFilter.value;
    const matchesSearch = !normalizedSearch || searchableRecordText(record).includes(normalizedSearch);

    return matchesStatus && matchesSearch;
  });
  const visibleRecords = filteredRecords.slice(0, visibleLimit.value);
  const hasMoreRecords = filteredRecords.length > visibleRecords.length;
  const editRecord = editKey.value
    ? filteredRecords.find((record) => rowKeyFor(record) === editKey.value)
    : undefined;
  const tableLabels = tableLabelsFor(props.page.path);
  const filteredKeys = visibleRecords.map((record) => rowKeyFor(record));
  const allVisibleSelected =
    filteredKeys.length > 0 && filteredKeys.every((key) => selectedRows.value.includes(key));

  useTask$(({ track }) => {
    track(() => props.createIntentVersion);
    if (!props.createIntentResource) {
      return;
    }

    const optionIndex = props.page.createOptions?.findIndex(
      (option) => option.resource === props.createIntentResource
    );
    if (optionIndex !== undefined && optionIndex >= 0) {
      activeCreateIndex.value = optionIndex;
    }

    if (
      props.page.resource === props.createIntentResource ||
      optionIndex !== undefined && optionIndex >= 0
    ) {
      isCreating.value = true;
      editKey.value = '';
      detailKey.value = '';
    }
  });

  return (
    <section class="page-view operational-page">
      <header class="page-header compact-page-header">
        <div>
          <span class="page-eyebrow">GESTISAC - {props.page.navLabel}</span>
          <h1>{props.page.title}</h1>
          <p>{props.page.description}</p>
        </div>
        <button
          class="primary-action action-with-icon"
          type="button"
          disabled={!createConfig}
          onClick$={() => {
            if (createConfig) {
              isCreating.value = !isCreating.value;
            }
          }}
        >
          <PlusIcon size={16} />
          <span>{props.page.action}</span>
        </button>
      </header>

      <section class="summary-grid" aria-label={`Resumo de ${props.page.title}`}>
        {props.page.stats.map((stat) => (
          <article class={`summary-card ${stat.tone ?? 'blue'}`} key={stat.label}>
            <small>{stat.label}</small>
            <strong>{stat.value}</strong>
            <span>{stat.detail}</span>
          </article>
        ))}
      </section>

      {createConfig && isCreating.value ? (
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
              isCreating.value = false;
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
            isCreating.value = false;
          }}
        >
          <header>
            <strong>{createConfig.label}</strong>
            <span>Os dados ficam persistidos na API Rust local.</span>
          </header>
          {props.page.createOptions?.length ? (
            <div class="create-options" aria-label="Tipo de registo">
              {props.page.createOptions.map((option, index) => (
                <button
                  class={index === activeCreateIndex.value ? 'active' : ''}
                  key={option.resource}
                  type="button"
                  onClick$={() => {
                    activeCreateIndex.value = index;
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          ) : null}
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
            <button type="button" onClick$={() => (isCreating.value = false)}>
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
            <span>Alteracao validada e persistida na API Rust.</span>
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

      {props.page.path === '/relatorios' && (props.reportPreview || props.isPreviewLoading) ? (
        <section class="report-preview glass-panel" aria-label="Preview do relatorio">
          {props.isPreviewLoading ? (
            <div class="preview-loading">
              <strong>A gerar preview...</strong>
              <span>A API esta a consolidar contabilidade, operacao e documentos.</span>
            </div>
          ) : props.reportPreview ? (
            <>
              <header>
                <div>
                  <small>Preview gerado pela API Rust</small>
                  <h2>{props.reportPreview.report.title}</h2>
                  <span>
                    {props.reportPreview.report.period} - {props.reportPreview.activeCondominium}
                  </span>
                </div>
                <button type="button" onClick$={props.onCloseReportPreview$}>
                  Fechar preview
                </button>
              </header>
              <div class="preview-kpis">
                {props.reportPreview.kpis.map((kpi) => (
                  <article class={kpi.tone} key={kpi.label}>
                    <small>{kpi.label}</small>
                    <strong>{kpi.value}</strong>
                    <span>{kpi.detail}</span>
                  </article>
                ))}
              </div>
              <div class="preview-sections">
                {props.reportPreview.sections.map((section) => (
                  <article key={section.title}>
                    <h3>{section.title}</h3>
                    {section.rows.length ? (
                      section.rows.map((row) => (
                        <div class="preview-row" key={`${section.title}-${row.label}-${row.value}`}>
                          <strong>{row.label}</strong>
                          <span>{row.value}</span>
                          <small>{row.detail}</small>
                        </div>
                      ))
                    ) : (
                      <div class="preview-row">
                        <strong>Sem registos</strong>
                        <span>-</span>
                        <small>Nao existem dados nesta categoria.</small>
                      </div>
                    )}
                  </article>
                ))}
              </div>
              <div class="preview-actions">
                <strong>Acoes recomendadas</strong>
                {props.reportPreview.recommendedActions.map((action) => (
                  <span key={action}>{action}</span>
                ))}
              </div>
            </>
          ) : null}
        </section>
      ) : null}

      <section class="records-panel glass-panel ops-panel">
        <header class="ops-panel-header">
          <div>
            <small>Dados reais da API local</small>
            <h2>Registos operacionais</h2>
          </div>
          <div class="ops-toolbar">
            <label class="ops-search">
              <SearchIcon size={16} />
              <input
                type="search"
                placeholder="Pesquisar por nome, estado, condominio ou fornecedor"
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

        <div class="ops-filter-strip">
          <span>{selectedRows.value.length ? `${selectedRows.value.length} selecionados` : `${filteredRecords.length} registos`}</span>
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
                    aria-label="Selecionar registos visiveis"
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange$={(event) => {
                      const checked = (event.target as HTMLInputElement).checked;
                      selectedRows.value = checked
                        ? Array.from(new Set([...selectedRows.value, ...filteredKeys]))
                        : selectedRows.value.filter((key) => !filteredKeys.includes(key));
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
              {filteredRecords.length ? (
                visibleRecords.map((record) => {
                  const visual = recordVisualFor(props.page.path, record);
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
                            {visual.permissions?.length ? (
                              <div class="ops-permission-grid" aria-label="Permissoes">
                                {visual.permissions.map((permission) => (
                                  <span
                                    class={permission.enabled ? 'enabled' : ''}
                                    key={permission.label}
                                  >
                                    {permission.label}
                                  </span>
                                ))}
                              </div>
                            ) : visual.progress !== undefined ? (
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
                                    isCreating.value = false;
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
                              <strong>Detalhe operacional</strong>
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
                    <strong>{props.page.records.length ? 'Sem resultados' : 'Sem registos ainda'}</strong>
                    <span>
                      {props.page.records.length
                        ? 'Ajusta a pesquisa ou limpa o filtro ativo.'
                        : 'Cria o primeiro item quando esta area estiver ativa.'}
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
              A mostrar {visibleRecords.length} de {filteredRecords.length} registos filtrados
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
