import { component$, useSignal, useTask$, useVisibleTask$, type PropFunction } from '@builder.io/qwik';
import type {
  CreateResource,
  DocumentPreview,
  GenerateDocumentPayload,
  ReportPreview,
  ResourceEndpoint,
  TicketAssignPayload,
  TicketChecklistPayload,
  TicketMessagePayload,
  TicketReopenPayload,
  TicketResolutionPayload,
  TicketTransitionPayload
} from '../../lib/api';
import type { DemoPage } from '../../data/pages';
import { TicketOperationalPanel } from './TicketOperationalPanel';

type PageOverviewProps = {
  page: DemoPage;
  isSaving: boolean;
  isPreviewLoading: boolean;
  pendingTicketActions: number;
  failedTicketActions: number;
  pendingTicketUploads: number;
  reportPreview: ReportPreview | null;
  documentPreview: DocumentPreview | null;
  activeCondominium: string;
  createIntentResource: CreateResource | '';
  createIntentVersion: number;
  onCreate$: PropFunction<(resource: ResourceEndpoint, payload: Record<string, string | number>) => void>;
  onUpdate$: PropFunction<(
    resource: ResourceEndpoint,
    id: string,
    payload: Record<string, string | number>
  ) => void>;
  onDelete$: PropFunction<(resource: ResourceEndpoint, id: string) => void>;
  onTicketTransition$: PropFunction<(id: string, payload: TicketTransitionPayload) => void>;
  onTicketAssign$: PropFunction<(id: string, payload: TicketAssignPayload) => void>;
  onTicketMessage$: PropFunction<(id: string, payload: TicketMessagePayload) => void>;
  onTicketAttachmentUpload$: PropFunction<(id: string, payload: FormData) => void>;
  onTicketChecklist$: PropFunction<(id: string, payload: TicketChecklistPayload) => void>;
  onTicketConfirmResolution$: PropFunction<(id: string, payload: TicketResolutionPayload) => void>;
  onTicketReopen$: PropFunction<(id: string, payload: TicketReopenPayload) => void>;
  onSyncPendingTicketActions$: PropFunction<() => void>;
  onUploadDocument$: PropFunction<(payload: FormData) => void>;
  onGenerateDocument$: PropFunction<(payload: GenerateDocumentPayload) => void>;
  onPreviewReport$: PropFunction<(id: string) => void>;
  onExportReport$: PropFunction<(id: string) => void>;
  onPreviewDocument$: PropFunction<(id: string) => void>;
  onDownloadDocument$: PropFunction<(id: string) => void>;
  onSelectCondominium$: PropFunction<(name: string) => void>;
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
  const routeCreateDefaults = useSignal<Record<string, string>>({});
  const selectedDocumentTemplate = useSignal(props.page.documentTemplates?.[0]?.id ?? '');
  const documentFormat = useSignal<'pdf' | 'txt'>('pdf');
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

  useVisibleTask$(({ track }) => {
    const pagePath = track(() => props.page.path);
    if (pagePath !== '/condomino/avarias') {
      routeCreateDefaults.value = {};
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const condominium = params.get('condominium')?.trim() ?? '';
    const location = params.get('location')?.trim() ?? '';
    const template = params.get('template')?.trim() ?? '';
    if (!condominium && !location && !template) {
      routeCreateDefaults.value = {};
      return;
    }

    routeCreateDefaults.value = {
      title: template,
      condominium,
      location,
      category: location ? `Avaria em ${location}` : '',
      priority: 'Normal',
      status: 'Aberta'
    };
    isCreating.value = true;
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
                  value={routeCreateDefaults.value[field.name] ?? undefined}
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

      {props.page.documentTemplates?.length ? (
        <section class="document-factory glass-panel" aria-label="Gerador de documentos">
          <header>
            <div>
              <small>Gerador documental</small>
              <h2>Escolhe o documento que queres criar</h2>
              <p>
                O ficheiro e gerado pela API com informacao do condominio, condominos,
                contabilidade, assembleias e manutencao.
              </p>
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
              <input name="condominium" placeholder="Condomínio Vila Verde" />
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
              <textarea
                name="notes"
                placeholder="Ex.: assembleia ordinaria, regularizacao ate 20 de maio, intervencao urgente no elevador..."
              />
            </label>
            <button class="primary-action" type="submit" disabled={props.isSaving}>
              {props.isSaving ? 'A gerar...' : `Gerar ${documentFormat.value.toUpperCase()}`}
            </button>
          </form>
        </section>
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

      {props.page.operations ? (
        <section class="operations-board glass-panel" aria-label="Centro operacional de avarias">
          <header>
            <div>
              <small>Centro operacional live-ready</small>
              <h2>Avarias, tecnicos e condominio no mesmo pulso</h2>
              <p>
                A base ja separa administracao, tecnico e condomino, com feed, SLA,
                QR zones e contratos preparados para realtime.
              </p>
            </div>
            <span>{props.page.operations.metrics.averageResolutionLabel}</span>
          </header>

          <div class="operations-kpis">
            <article>
              <small>Abertas</small>
              <strong>{props.page.operations.metrics.openTickets}</strong>
              <span>Tickets operacionais em curso</span>
            </article>
            <article class="danger">
              <small>Emergencias</small>
              <strong>{props.page.operations.metrics.emergencies}</strong>
              <span>Movidas para o topo da operacao</span>
            </article>
            <article class="warning">
              <small>SLA em risco</small>
              <strong>{props.page.operations.metrics.slaAtRisk}</strong>
              <span>Exigem decisao rapida</span>
            </article>
            <article class="green">
              <small>Tecnicos ativos</small>
              <strong>{props.page.operations.metrics.activeTechnicians}</strong>
              <span>Atribuicoes em aberto</span>
            </article>
          </div>

          <div class="operations-columns">
            <article>
              <small>Feed operacional</small>
              <h3>Sistema vivo</h3>
              {props.page.operations.feed.length ? (
                props.page.operations.feed.slice(0, 5).map((item) => (
                  <div class={`operations-feed-item ${item.tone}`} key={item.id}>
                    <strong>{item.title}</strong>
                    <span>{item.detail}</span>
                    <small>{item.createdAt}</small>
                  </div>
                ))
              ) : (
                <div class="operations-feed-item">
                  <strong>Sem eventos ainda</strong>
                  <span>As proximas alteracoes de avarias aparecem aqui.</span>
                  <small>Realtime-ready</small>
                </div>
              )}
            </article>
            <article>
              <small>Experiencias PWA</small>
              <h3>Tecnico e condomino</h3>
              <div class="pwa-mode-card">
                <strong>Tecnico</strong>
                <span>Botoes grandes, check-in, fotos antes/depois e fila offline.</span>
              </div>
              <div class="pwa-mode-card resident">
                <strong>Condomino</strong>
                <span>Reportar, acompanhar timeline, confirmar ou reabrir.</span>
              </div>
            </article>
            <article>
              <small>QR zones</small>
              <h3>Reporte rapido</h3>
              {props.page.operations.qrZones.slice(0, 5).map((zone) => (
                <div class="qr-zone-row" key={zone.id}>
                  <strong>{zone.location}</strong>
                  <span>{zone.ticketTemplate}</span>
                </div>
              ))}
            </article>
          </div>
        </section>
      ) : null}

      {props.page.operations && props.pendingTicketActions ? (
        <section class="offline-queue-panel glass-panel" aria-label="Fila offline de avarias">
          <div>
            <small>Offline-first V3</small>
            <strong>{props.pendingTicketActions} acoes pendentes</strong>
            <span>
              {props.pendingTicketUploads} uploads em fila, {props.failedTicketActions} falhas para retry.
              Estados, mensagens, checklist e confirmacoes serao reenviados quando a API voltar.
            </span>
          </div>
          <button type="button" disabled={props.isSaving} onClick$={props.onSyncPendingTicketActions$}>
            {props.isSaving ? 'A sincronizar...' : 'Sincronizar agora'}
          </button>
        </section>
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

      {props.page.path === '/documentos' && props.documentPreview ? (
        <section class="document-preview glass-panel" aria-label="Preview do documento">
          <header>
            <div>
              <small>Arquivo documental</small>
              <h2>{props.documentPreview.document.title}</h2>
              <span>
                {props.documentPreview.document.type} - {props.documentPreview.document.condominium}
              </span>
            </div>
            <div class="document-preview-actions">
              <button type="button" onClick$={() => props.onDownloadDocument$(props.documentPreview!.document.id)}>
                Download
              </button>
              <button type="button" onClick$={props.onCloseDocumentPreview$}>
                Fechar preview
              </button>
            </div>
          </header>
          <div class="document-meta-grid">
            <article>
              <small>Estado</small>
              <strong>{props.documentPreview.document.status}</strong>
            </article>
            <article>
              <small>Ficheiro</small>
              <strong>{props.documentPreview.document.fileName || 'Sem ficheiro'}</strong>
            </article>
            <article>
              <small>Formato</small>
              <strong>{props.documentPreview.document.mimeType || 'Metadados'}</strong>
            </article>
          </div>
          <pre class="document-preview-content">
            {props.documentPreview.content ??
              'Este documento existe no arquivo e pode ser descarregado. Preview textual indisponivel para este formato.'}
          </pre>
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
                    type="button"
                    onClick$={() => {
                      detailIndex.value = detailIndex.value === index ? -1 : index;
                    }}
                  >
                    Detalhes
                  </button>
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
                  {props.page.path === '/condominios' && record.resource === 'condominiums' ? (
                    <button
                      class="quick-record-action success"
                      type="button"
                      disabled={props.isSaving || record.title === props.activeCondominium}
                      onClick$={async () => {
                        await props.onSelectCondominium$(record.title);
                        detailIndex.value = -1;
                        editIndex.value = -1;
                      }}
                    >
                      {record.title === props.activeCondominium ? 'Ativo' : 'Tornar ativo'}
                    </button>
                  ) : null}
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
                </div>
                {detailIndex.value === index ? (
                  <div class="record-detail">
                    <strong>Detalhe operacional</strong>
                    <span>{record.detail}</span>
                    <span>{record.meta}</span>
                    <span>Estado: {record.status}</span>
                    {record.operational ? (
                      <TicketOperationalPanel
                        record={record}
                        pagePath={props.page.path}
                        pageNavLabel={props.page.navLabel}
                        isSaving={props.isSaving}
                        onTicketTransition$={props.onTicketTransition$}
                        onTicketAssign$={props.onTicketAssign$}
                        onTicketMessage$={props.onTicketMessage$}
                        onTicketAttachmentUpload$={props.onTicketAttachmentUpload$}
                        onTicketChecklist$={props.onTicketChecklist$}
                        onTicketConfirmResolution$={props.onTicketConfirmResolution$}
                        onTicketReopen$={props.onTicketReopen$}
                      />
                    ) : null}
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
