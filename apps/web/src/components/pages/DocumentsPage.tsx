import { component$, useSignal, type PropFunction } from '@builder.io/qwik';
import type {
  CreateResource,
  DocumentPreview,
  GenerateDocumentPayload,
  ReportPreview,
  ResourceEndpoint
} from '../../lib/api';
import type { DemoPage } from '../../data/pages';
import { SimpleHubCards, SimpleSectionShell, type SimpleHubSection } from './SimpleHub';

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

export const DocumentsPage = component$((props: DocumentsPageProps) => {
  const detailIndex = useSignal(-1);
  const editIndex = useSignal(-1);
  const searchQuery = useSignal('');
  const statusFilter = useSignal('Todos');
  const selectedDocumentTemplate = useSignal(props.page.documentTemplates?.[0]?.id ?? '');
  const documentFormat = useSignal<'pdf' | 'txt'>('pdf');
  const activeDocumentContext = useSignal('');
  const documentCreateOpen = useSignal(false);
  const documentFactoryOpen = useSignal(false);
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
    const searchable = `${record.title} ${record.meta} ${record.detail} ${record.status}`.toLowerCase();
    const matchesSearch = !normalizedSearch || searchable.includes(normalizedSearch);

    return matchesStatus && matchesSearch;
  });

  const documentSections: SimpleHubSection[] = [
    {
      id: 'condominios',
      title: 'Condominios',
      description: 'Atas, seguros, plantas, regulamentos e certificados.',
      icon: 'C',
      tone: 'blue',
      count: props.page.records.filter((record) => matchesDocumentContext(record, 'condominios')).length
    },
    {
      id: 'fornecedores',
      title: 'Fornecedores',
      description: 'Contratos, propostas, documentos legais e anexos.',
      icon: 'F',
      tone: 'green',
      count: props.page.records.filter((record) => matchesDocumentContext(record, 'fornecedores')).length
    },
    {
      id: 'manutencao',
      title: 'Manutencao',
      description: 'Relatorios tecnicos, inspecoes, garantias e manuais.',
      icon: 'M',
      tone: 'gold',
      count: props.page.records.filter((record) => matchesDocumentContext(record, 'manutencao')).length
    },
    {
      id: 'tickets',
      title: 'Tickets',
      description: 'Anexos, fotos, comprovativos e documentos de ocorrencia.',
      icon: 'T',
      tone: 'purple',
      count: props.page.records.filter((record) => matchesDocumentContext(record, 'tickets')).length
    }
  ];
  const activeDocumentSection = documentSections.find((section) => section.id === activeDocumentContext.value);
  const visibleDocumentRecords = activeDocumentContext.value
    ? filteredRecords.filter((record) => matchesDocumentContext(record, activeDocumentContext.value))
    : [];

  return (
    <section class="page-view simple-workspace">
      <header class="page-header simple-hero">
        <div>
          <span class="page-eyebrow">GESTISAC - Documentos</span>
          <h1>Documentos</h1>
          <p>Escolhe primeiro o contexto. Depois aparecem so os documentos dessa area.</p>
        </div>
        {activeDocumentContext.value ? (
          <button
            class="primary-action"
            type="button"
            onClick$={() => {
              activeDocumentContext.value = '';
              detailIndex.value = -1;
              editIndex.value = -1;
            }}
          >
            Voltar aos 4 cartoes
          </button>
        ) : null}
      </header>

      <SimpleHubCards
        sections={documentSections}
        activeId={activeDocumentContext.value}
        onSelect$={(id) => {
          activeDocumentContext.value = id;
          detailIndex.value = -1;
          editIndex.value = -1;
        }}
      />

      {!activeDocumentContext.value ? (
        <section class="simple-empty-state glass-panel">
          <strong>Escolhe o tipo de documentos.</strong>
          <span>Assim evitamos misturar contratos, plantas, fotos e documentos de ocorrencias no mesmo ecra.</span>
        </section>
      ) : (
        <SimpleSectionShell
          title={activeDocumentSection?.title ?? 'Documentos'}
          description={activeDocumentSection?.description ?? 'Documentos por contexto'}
          sections={documentSections}
          activeId={activeDocumentContext.value}
          onSelect$={(id) => {
            activeDocumentContext.value = id;
            detailIndex.value = -1;
            editIndex.value = -1;
          }}
        >
          <section class="simple-section-content">
            <header class="simple-content-header">
              <div>
                <small>Arquivo documental</small>
                <h2>{activeDocumentSection?.title}</h2>
                <p>{activeDocumentSection?.description}</p>
              </div>
              <div class="simple-header-actions">
                <button
                  class="primary-action"
                  type="button"
                  disabled={!createConfig}
                  onClick$={() => {
                    documentCreateOpen.value = !documentCreateOpen.value;
                    documentFactoryOpen.value = false;
                  }}
                >
                  Adicionar documento
                </button>
                <details class="simple-more-menu">
                  <summary>Mais</summary>
                  <button
                    type="button"
                    disabled={!props.page.documentTemplates?.length}
                    onClick$={() => {
                      documentFactoryOpen.value = !documentFactoryOpen.value;
                      documentCreateOpen.value = false;
                    }}
                  >
                    Gerador documental
                  </button>
                </details>
              </div>
            </header>

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
                  <span>Adicionar fica escondido ate ser necessario.</span>
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

            {props.page.documentTemplates?.length && documentFactoryOpen.value ? (
              <section class="document-factory glass-panel" aria-label="Gerador de documentos">
                <header>
                  <div>
                    <small>Gerador documental</small>
                    <h2>Escolhe o documento que queres criar</h2>
                    <p>Ferramenta avancada, agora guardada dentro de `Mais` para nao pesar no primeiro ecra.</p>
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
                      Download
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

            <div class="simple-search-row">
              <input
                type="search"
                placeholder="Pesquisar nesta area..."
                value={searchQuery.value}
                onInput$={(event) => {
                  searchQuery.value = (event.target as HTMLInputElement).value;
                  detailIndex.value = -1;
                  editIndex.value = -1;
                }}
              />
              <select
                value={statusFilter.value}
                onChange$={(event) => {
                  statusFilter.value = (event.target as HTMLSelectElement).value;
                  detailIndex.value = -1;
                  editIndex.value = -1;
                }}
              >
                <option value="Todos">Todos os estados</option>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>

            <div class="simple-record-list">
              {visibleDocumentRecords.length ? visibleDocumentRecords.map((record, index) => (
                <article
                  class={`simple-record-card ${detailIndex.value === index ? 'active' : ''}`}
                  key={`${record.title}-${record.meta}-${record.id ?? index}`}
                >
                  <div>
                    <strong>{record.title}</strong>
                    <span>{record.meta}</span>
                  </div>
                  <p>{record.detail}</p>
                  <small>{record.status}</small>
                  <div class="simple-card-actions">
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
                            documentCreateOpen.value = false;
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
                      <strong>Detalhe</strong>
                      <span>{record.detail}</span>
                      <span>{record.meta}</span>
                      <span>Estado: {record.status}</span>
                    </div>
                  ) : null}
                </article>
              )) : (
                <article class="simple-empty-state">
                  <strong>Sem documentos nesta area.</strong>
                  <span>Quando existirem documentos deste contexto, aparecem aqui de forma organizada.</span>
                </article>
              )}
            </div>
          </section>
        </SimpleSectionShell>
      )}
    </section>
  );
});

function matchesDocumentContext(record: DemoPage['records'][number], context: string): boolean {
  const searchable = `${record.title} ${record.meta} ${record.detail} ${record.status}`.toLowerCase();
  const keywords: Record<string, string[]> = {
    condominios: ['condominio', 'seguro', 'planta', 'regulamento', 'ata', 'certificado'],
    fornecedores: ['fornecedor', 'contrato', 'proposta', 'legal'],
    manutencao: ['manutencao', 'relatorio tecnico', 'inspecao', 'garantia', 'manual'],
    tickets: ['ticket', 'ocorrencia', 'avaria', 'foto', 'comprovativo']
  };

  return (keywords[context] ?? []).some((keyword) => searchable.includes(keyword));
}
