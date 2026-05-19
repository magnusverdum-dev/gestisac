import { component$, useSignal, useTask$, type PropFunction } from '@builder.io/qwik';
import type {
  CreateResource,
  DocumentPreview,
  GenerateDocumentPayload,
  ReportPreview,
  ResourceEndpoint
} from '../../lib/api';
import type { DemoPage } from '../../data/pages';

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
  const detailIndex = useSignal(-1);
  const editIndex = useSignal(-1);
  const filtersVisible = useSignal(false);
  const searchQuery = useSignal('');
  const statusFilter = useSignal('Todos');
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
    const searchable = `${record.title} ${record.meta} ${record.detail} ${record.status}`.toLowerCase();
    const matchesSearch = !normalizedSearch || searchable.includes(normalizedSearch);

    return matchesStatus && matchesSearch;
  });
  const editRecord = editIndex.value >= 0 ? filteredRecords[editIndex.value] : undefined;

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
      editIndex.value = -1;
      detailIndex.value = -1;
    }
  });

  return (
    <section class="page-view">
      <header class="page-header">
        <div>
          <span class="page-eyebrow">GESTISAC - {props.page.navLabel}</span>
          <h1>{props.page.title}</h1>
          <p>{props.page.description}</p>
        </div>
        <button
          class="primary-action"
          type="button"
          disabled={!createConfig}
          onClick$={() => {
            if (createConfig) {
              isCreating.value = !isCreating.value;
            }
          }}
        >
          {props.page.action}
        </button>
      </header>

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
            editIndex.value = -1;
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
            <button type="button" onClick$={() => (editIndex.value = -1)}>
              Cancelar
            </button>
            <button class="primary-action" type="submit" disabled={props.isSaving}>
              {props.isSaving ? 'A guardar...' : 'Guardar alteracoes'}
            </button>
          </div>
        </form>
      ) : null}


      <section class="summary-grid" aria-label={`Resumo de ${props.page.title}`}>
        {props.page.stats.map((stat) => (
          <article class={`summary-card ${stat.tone ?? 'blue'}`} key={stat.label}>
            <small>{stat.label}</small>
            <strong>{stat.value}</strong>
            <span>{stat.detail}</span>
          </article>
        ))}
      </section>

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


      <section class="records-panel glass-panel">
        <header>
          <div>
            <small>Dados reais da API local</small>
            <h2>Itens recentes</h2>
          </div>
          <button
            type="button"
            onClick$={() => {
              filtersVisible.value = !filtersVisible.value;
            }}
          >
            {filtersVisible.value ? 'Ocultar filtros' : 'Filtrar'}
          </button>
        </header>

        {filtersVisible.value ? (
          <div class="filter-panel">
            <label>
              <span>Pesquisa</span>
              <input
                type="search"
                placeholder="Pesquisar por nome, estado, condominio ou fornecedor"
                value={searchQuery.value}
                onInput$={(event) => {
                  searchQuery.value = (event.target as HTMLInputElement).value;
                  detailIndex.value = -1;
                  editIndex.value = -1;
                }}
              />
            </label>
            <div class="status-filters" aria-label="Filtros por estado">
              <button
                class={statusFilter.value === 'Todos' ? 'active' : ''}
                type="button"
                onClick$={() => {
                  statusFilter.value = 'Todos';
                  detailIndex.value = -1;
                  editIndex.value = -1;
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
                    detailIndex.value = -1;
                    editIndex.value = -1;
                  }}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div class="record-list">
          {filteredRecords.length ? (
            filteredRecords.map((record, index) => (
              <article
                class={`record-card ${detailIndex.value === index ? 'expanded' : ''}`}
                key={`${record.title}-${record.meta}-${record.id ?? index}`}
              >
                <div>
                  <strong>{record.title}</strong>
                  <span>{record.meta}</span>
                </div>
                <p>{record.detail}</p>
                <small>{record.status}</small>
                <div class="record-actions">
                  <button
                    class="primary-action"
                    type="button"
                    onClick$={() => {
                      detailIndex.value = detailIndex.value === index ? -1 : index;
                    }}
                  >
                    Abrir
                  </button>
                  <details class="simple-more-menu">
                    <summary>Mais</summary>
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

                          detailIndex.value = -1;
                          editIndex.value = -1;
                        }}
                      >
                        {quickAction.label}
                      </button>
                    ))}
                    {record.canEdit && record.fields?.length ? (
                      <button
                        type="button"
                        onClick$={() => {
                          isCreating.value = false;
                          editIndex.value = editIndex.value === index ? -1 : index;
                        }}
                      >
                        Editar
                      </button>
                    ) : null}
                    {record.canDelete && record.id && record.resource ? (
                      <button
                        class="danger-action"
                        type="button"
                        onClick$={async () => {
                          if (window.confirm(`Apagar "${record.title}"?`)) {
                            await props.onDelete$(record.resource!, record.id!);
                            detailIndex.value = -1;
                            editIndex.value = -1;
                          }
                        }}
                      >
                        Apagar
                      </button>
                    ) : null}
                  </details>
                </div>
                {detailIndex.value === index ? (
                  <div class="record-detail">
                    <strong>Detalhe operacional</strong>
                    <span>{record.detail}</span>
                    <span>{record.meta}</span>
                    <span>Estado: {record.status}</span>
                  </div>
                ) : null}
              </article>
            ))
          ) : (
            <article class="record-card empty-record">
              <div>
                <strong>{props.page.records.length ? 'Sem resultados' : 'Sem registos ainda'}</strong>
                <span>
                  {props.page.records.length
                    ? 'Ajusta a pesquisa ou limpa o filtro ativo.'
                    : 'Cria o primeiro item quando esta area estiver ativa.'}
                </span>
              </div>
              <p>Esta pagina ja esta ligada ao backend local.</p>
              <small>API Rust</small>
            </article>
          )}
        </div>
      </section>
    </section>
  );
});

