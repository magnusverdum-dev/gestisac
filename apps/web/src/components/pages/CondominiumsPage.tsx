import { $, component$, useSignal, useTask$, type PropFunction } from '@builder.io/qwik';
import {
  archiveCondominium,
  commitCondominiumImport,
  createCondominiumSubresource,
  createResource,
  getCondominiumDetail,
  previewCondominiumImport,
  saveCondominiumDraft,
  updateCondominiumSection,
  type CompletenessReport,
  type Condominium,
  type CondominiumDetailResponse,
  type ImportPreview,
  type ResourceState
} from '../../lib/api';
import { SimpleHubCards, type SimpleHubSection } from './SimpleHub';
import {
  Field,
  FuturePanel,
  History,
  Kpi,
  Overview,
  SectionEditor,
  SubresourcePanel,
  type FieldConfig,
  type SubresourceName
} from './CondominiumsParts';

type CondominiumsPageProps = {
  token: string;
  resources: ResourceState;
  isSaving: boolean;
  onRefresh$: PropFunction<() => void>;
};

const tabs = [
  'overview',
  'identification',
  'address',
  'structure',
  'blocks',
  'floors',
  'zones',
  'equipment',
  'contacts',
  'documents',
  'media',
  'history',
  'status',
  'notes',
  'future'
] as const;

type TabId = (typeof tabs)[number];

type CondoAreaId =
  | 'general'
  | 'reports'
  | 'documentation'
  | 'avarias'
  | 'inspections'
  | 'timeline'
  | 'support'
  | 'tickets';

const tabLabels: Record<TabId, string> = {
  overview: 'Visao geral',
  identification: 'Identificacao',
  address: 'Morada',
  structure: 'Estrutura fisica',
  blocks: 'Blocos',
  floors: 'Pisos',
  zones: 'Zonas',
  equipment: 'Equipamentos',
  contacts: 'Contactos',
  documents: 'Documentos',
  media: 'Imagens e plantas',
  history: 'Historico',
  status: 'Estado operacional',
  notes: 'Notas internas',
  future: 'Mapa/QR/3D'
};

const emptyCompleteness: CompletenessReport = {
  percentage: 0,
  complete: false,
  missingItems: ['Abrir condominio para calcular completude'],
  categories: []
};

export const CondominiumsPage = component$((props: CondominiumsPageProps) => {
  const selectedId = useSignal(props.resources.condominiums[0]?.id ?? '');
  const activeTab = useSignal<TabId>('overview');
  const activeArea = useSignal<CondoAreaId | ''>('');
  const detailOpen = useSignal(false);
  const creationOpen = useSignal(false);
  const importOpen = useSignal(false);
  const search = useSignal('');
  const statusFilter = useSignal('todos');
  const localSaving = useSignal(false);
  const localError = useSignal('');
  const localNotice = useSignal('');
  const detail = useSignal<CondominiumDetailResponse | null>(null);
  const importPreview = useSignal<ImportPreview | null>(null);

  const selectedFromDetail = detail.value?.condominium.id === selectedId.value ? detail.value.condominium : undefined;
  const selected =
    selectedFromDetail ??
    props.resources.condominiums.find((item) => item.id === selectedId.value) ??
    props.resources.condominiums[0];
  const completeness = selectedFromDetail ? detail.value!.completeness : localCompleteness(selected);
  const filtered = props.resources.condominiums.filter((item) => {
    const haystack = [
      item.name,
      item.internalCode,
      item.location,
      item.address?.street,
      item.address?.locality,
      item.address?.postalCode,
      item.manager,
      item.notice,
      item.administrativeNotes
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    const matchesSearch = !search.value.trim() || haystack.includes(search.value.trim().toLowerCase());
    const matchesStatus =
      statusFilter.value === 'todos' || item.status?.toLowerCase() === statusFilter.value;
    return matchesSearch && matchesStatus && !item.archived;
  });
  const activeCount = props.resources.condominiums.filter((item) => !item.archived).length;

  const loadDetail$ = $(async (id: string) => {
    if (!id) {
      detail.value = null;
      return;
    }
    if (detail.value?.condominium.id === id) {
      return;
    }
    localError.value = '';
    try {
      detail.value = await getCondominiumDetail(props.token, id);
    } catch (err) {
      localError.value = err instanceof Error ? err.message : 'Nao foi possivel abrir o condominio';
    }
  });

  const refreshDetail$ = $(async () => {
    await props.onRefresh$();
    await loadDetail$(selectedId.value);
  });

  useTask$(({ track }) => {
    track(() => props.resources.condominiums.length);
    if (!selectedId.value && props.resources.condominiums[0]?.id) {
      selectedId.value = props.resources.condominiums[0].id;
    }
  });

  useTask$(async ({ track }) => {
    const id = track(() => selectedId.value);
    const shouldLoadDetail = track(() => detailOpen.value);
    if (!shouldLoadDetail) {
      return;
    }
    await loadDetail$(id);
  });

  const submitQuickCreate$ = $(async (form: HTMLFormElement) => {
    const formData = new FormData(form);
    localSaving.value = true;
    localError.value = '';
    localNotice.value = '';
    try {
      const created = await createResource(props.token, 'condominiums', {
        name: text(formData, 'name'),
        location: text(formData, 'location'),
        fractions: numberValue(formData, 'fractions'),
        buildings: numberValue(formData, 'buildings'),
        status: text(formData, 'status') || 'em onboarding',
        manager: text(formData, 'manager'),
        internalCode: text(formData, 'internalCode'),
        condominiumType: text(formData, 'condominiumType') || 'residencial'
      });
      const id = (created as Condominium).id;
      await props.onRefresh$();
      if (id) {
        selectedId.value = id;
      }
      localNotice.value = 'Condominio criado em onboarding.';
      form.reset();
    } catch (err) {
      localError.value = err instanceof Error ? err.message : 'Nao foi possivel criar condominio';
    } finally {
      localSaving.value = false;
    }
  });

  const submitSection$ = $(async (
    form: HTMLFormElement,
    section: 'identification' | 'address' | 'structure' | 'operational-status',
    fields: FieldConfig[]
  ) => {
    if (!selected?.id) {
      return;
    }
    localSaving.value = true;
    localError.value = '';
    localNotice.value = '';
    try {
      await updateCondominiumSection(props.token, selected.id, section, payloadFromForm(form, fields));
      localNotice.value = 'Seccao guardada.';
      await refreshDetail$();
    } catch (err) {
      localError.value = err instanceof Error ? err.message : 'Nao foi possivel guardar seccao';
    } finally {
      localSaving.value = false;
    }
  });

  const submitSubresource$ = $(async (form: HTMLFormElement, resource: SubresourceName, fields: FieldConfig[]) => {
    if (!selected?.id) {
      return;
    }
    localSaving.value = true;
    localError.value = '';
    localNotice.value = '';
    try {
      await createCondominiumSubresource(props.token, selected.id, resource, payloadFromForm(form, fields));
      form.reset();
      localNotice.value = 'Informacao adicionada.';
      await refreshDetail$();
    } catch (err) {
      localError.value = err instanceof Error ? err.message : 'Nao foi possivel adicionar informacao';
    } finally {
      localSaving.value = false;
    }
  });

  const archiveSelected$ = $(async () => {
    if (!selected?.id) {
      return;
    }
    localSaving.value = true;
    localError.value = '';
    localNotice.value = '';
    try {
      await archiveCondominium(props.token, selected.id);
      localNotice.value = 'Condominio arquivado.';
      await props.onRefresh$();
    } catch (err) {
      localError.value = err instanceof Error ? err.message : 'Nao foi possivel arquivar';
    } finally {
      localSaving.value = false;
    }
  });

  const saveDraft$ = $(async () => {
    if (!selected?.id) {
      return;
    }
    await saveCondominiumDraft(props.token, selected.id, {
      currentStep: tabToStep(activeTab.value),
      completedSteps: [1, 2],
      isQuickMode: false
    });
    localNotice.value = 'Rascunho de onboarding guardado.';
    await refreshDetail$();
  });

  const previewImport$ = $(async (form: HTMLFormElement) => {
    const csv = String(new FormData(form).get('csv') ?? '');
    localSaving.value = true;
    localError.value = '';
    try {
      importPreview.value = await previewCondominiumImport(props.token, csv);
      localNotice.value = 'Preview de importacao preparado.';
    } catch (err) {
      localError.value = err instanceof Error ? err.message : 'Nao foi possivel validar CSV';
    } finally {
      localSaving.value = false;
    }
  });

  const commitImport$ = $(async () => {
    if (!importPreview.value) {
      return;
    }
    localSaving.value = true;
    localError.value = '';
    try {
      const validRows = importPreview.value.rows.filter((row) => row.valid).map((row) => row.values);
      const report = await commitCondominiumImport(props.token, validRows, true);
      localNotice.value = `${report.created} condominios importados, ${report.skipped} ignorados.`;
      await props.onRefresh$();
      importPreview.value = null;
    } catch (err) {
      localError.value = err instanceof Error ? err.message : 'Nao foi possivel importar';
    } finally {
      localSaving.value = false;
    }
  });

  const relatedTickets = props.resources.tickets.filter((ticket) =>
    selected?.name ? ticket.condominium === selected.name : true
  );
  const relatedDocuments = [
    ...props.resources.documents
      .filter((document) => !selected?.name || document.condominium === selected.name)
      .map((document) => ({
        id: document.id,
        title: document.title,
        meta: `${document.type} - ${document.condominium}`,
        status: document.status,
        detail: document.fileName || 'Sem ficheiro associado'
      })),
    ...(selected?.managedDocuments ?? []).map((document) => ({
      id: document.id,
      title: document.title,
      meta: `${document.documentType} - ficha do condominio`,
      status: document.status,
      detail: document.fileName || document.description || 'Documento de condominio'
    })),
    ...(selected?.media ?? []).map((media) => ({
      id: media.id,
      title: media.title,
      meta: `${media.mediaType} - imagem/planta`,
      status: media.isPrimary ? 'Imagem principal' : 'Arquivo visual',
      detail: media.fileName || media.description || 'Media associado'
    }))
  ];
  const condoSections: SimpleHubSection[] = [
    {
      id: 'general',
      title: 'Condominios Geral',
      description: 'Condominios, fracoes e utilizadores ligados por ficha operacional.',
      icon: 'C',
      tone: 'blue',
      count: activeCount,
      quickActions: ['Extrato de Conta']
    },
    {
      id: 'reports',
      title: 'Relatorios',
      description: 'Relatorios e leituras de gestao ligados aos condominios.',
      icon: 'R',
      tone: 'gold',
      count: props.resources.reports.length,
      quickActions: ['Contencioso']
    },
    {
      id: 'documentation',
      title: 'Documentacao',
      description: 'Atas, seguros, plantas, certificados, imagens e ficheiros.',
      icon: 'D',
      tone: 'green',
      count: relatedDocuments.length,
      quickActions: ['Extrato de Conta', 'Atalho 2', 'Atalho 3', 'Atalho 4']
    },
    {
      id: 'avarias',
      title: 'Avarias',
      description: 'Resumo de ocorrencias associadas, sem reabrir o modulo tecnico.',
      icon: 'A',
      tone: 'red',
      count: props.resources.tickets.length
    },
    {
      id: 'inspections',
      title: 'Vistorias',
      description: 'Acompanhamento de verificacoes, pendentes e pontos de estado.',
      icon: 'V',
      tone: 'purple',
      count: props.resources.maintenance.length
    },
    {
      id: 'timeline',
      title: 'Time Line',
      description: 'Historico de alteracoes, eventos e momentos do condominio.',
      icon: 'T',
      tone: 'blue',
      count: selected?.history?.length ?? 0
    },
    {
      id: 'support',
      title: 'Apoio Cliente/Administradores',
      description: 'Contacto rapido entre utilizadores, administradores e equipa.',
      icon: 'S',
      tone: 'green',
      count: props.resources.residents.length
    },
    {
      id: 'tickets',
      title: 'Tickets',
      description: 'Pedidos abertos, seguimento operacional e prioridades.',
      icon: 'K',
      tone: 'gold',
      count: props.resources.tickets.length
    }
  ];
  const accountExtractRows = props.resources.residents.map((user) => {
    const debts = props.resources.accounting.debts.filter((debt) =>
      debt.resident === user.name && debt.fraction === user.fraction && debt.condominium === user.condominium
    );
    const quotas = props.resources.accounting.quotas.filter((quota) =>
      quota.resident === user.name && quota.fraction === user.fraction && quota.condominium === user.condominium
    );
    const debtTotal = debts.reduce((total, debt) => total + debt.amount, 0);
    return {
      id: user.id,
      name: user.name,
      condominium: user.condominium,
      fraction: user.fraction,
      status: debtTotal > 0 ? 'Com saldo em aberto' : user.status,
      detail: `${quotas.length} quotas - divida ${debtTotal.toLocaleString('pt-PT', {
        style: 'currency',
        currency: 'EUR'
      })}`
    };
  });
  return (
    <section class="condominiums-workspace simple-workspace">
      <header class="condo-hero simple-hero glass-panel">
        <div>
          <span class="page-eyebrow">GESTISAC - Condominios</span>
          <h1>Condominios</h1>
          <p>Escolhe primeiro uma area. Depois mostramos so o que precisas para trabalhar com calma.</p>
        </div>
        {activeArea.value ? (
          <button
            class="primary-action"
            type="button"
            onClick$={() => {
              activeArea.value = '';
              detailOpen.value = false;
            }}
          >
            Voltar aos 8 cartoes
          </button>
        ) : null}
      </header>

      {localError.value ? <div class="app-error glass-panel">{localError.value}</div> : null}
      {localNotice.value ? <div class="app-success glass-panel">{localNotice.value}</div> : null}

      {!activeArea.value ? (
        <SimpleHubCards
          sections={condoSections}
          activeId={activeArea.value}
          onSelect$={(id) => {
            activeArea.value = id as CondoAreaId;
            detailOpen.value = false;
          }}
        />
      ) : (
        <section class="simple-content-panel condo-module-panel glass-panel">
          {activeArea.value === 'general' ? (
            <section class="simple-section-content">
              <header class="simple-content-header">
                <div>
                  <small>Lista principal</small>
                  <h2>Condominios Geral</h2>
                  <p>Condominios {'>'} Condominio {'>'} Fracoes {'>'} Utilizadores, com extrato ligado a cada fracao.</p>
                </div>
                <div class="simple-header-actions">
                  <button
                    class="primary-action"
                    type="button"
                    onClick$={() => {
                      search.value = selected?.name ?? '';
                    }}
                  >
                    Extrato de Conta
                  </button>
                  <button
                    class="primary-action"
                    type="button"
                    onClick$={() => {
                      creationOpen.value = !creationOpen.value;
                      importOpen.value = false;
                    }}
                  >
                    Adicionar condominio
                  </button>
                  <details class="simple-more-menu">
                    <summary>Mais</summary>
                    <button
                      type="button"
                      onClick$={() => {
                        importOpen.value = !importOpen.value;
                        creationOpen.value = false;
                      }}
                    >
                      Importar CSV
                    </button>
                    <button type="button" onClick$={saveDraft$} disabled={!selected || localSaving.value}>
                      Guardar rascunho
                    </button>
                  </details>
                </div>
              </header>

              {creationOpen.value ? (
                <form
                  class="simple-form-panel"
                  preventdefault:submit
                  onSubmit$={async (event) => submitQuickCreate$(event.target as HTMLFormElement)}
                >
                  <strong>Criar condominio rapido</strong>
                  <div class="condo-form-grid compact">
                    <Field name="name" label="Nome" />
                    <Field name="internalCode" label="Codigo interno" />
                    <Field name="location" label="Localidade" />
                    <Field name="fractions" label="Fracoes" kind="number" />
                    <Field name="buildings" label="Blocos" kind="number" value="1" />
                    <Field name="manager" label="Gestor" />
                    <Field name="condominiumType" label="Tipo" value="residencial" />
                    <Field name="status" label="Estado" value="em onboarding" />
                  </div>
                  <button class="primary-action" type="submit" disabled={props.isSaving || localSaving.value}>
                    Criar
                  </button>
                </form>
              ) : null}

              {importOpen.value ? (
                <form
                  class="simple-form-panel"
                  preventdefault:submit
                  onSubmit$={async (event) => previewImport$(event.target as HTMLFormElement)}
                >
                  <strong>Importar CSV</strong>
                  <textarea
                    name="csv"
                    placeholder="nome,codigo_interno,tipo,estado,localidade,total_fracoes"
                  />
                  <div class="condo-inline-actions">
                    <button type="submit" disabled={localSaving.value}>Validar CSV</button>
                    <button type="button" onClick$={commitImport$} disabled={!importPreview.value || localSaving.value}>
                      Importar validos
                    </button>
                  </div>
                  {importPreview.value ? (
                    <small>{importPreview.value!.validRows} validas / {importPreview.value!.invalidRows} com erros</small>
                  ) : null}
                </form>
              ) : null}

              <div class="simple-search-row">
                <input
                  value={search.value}
                  placeholder="Pesquisar por nome, codigo, rua ou gestor..."
                  onInput$={(event) => (search.value = (event.target as HTMLInputElement).value)}
                />
                <select value={statusFilter.value} onChange$={(event) => (statusFilter.value = (event.target as HTMLSelectElement).value)}>
                  <option value="todos">Todos os estados</option>
                  <option value="ativo">Ativo</option>
                  <option value="em onboarding">Onboarding</option>
                  <option value="suspenso">Suspenso</option>
                  <option value="arquivo">Arquivo</option>
                </select>
              </div>

              <section class="simple-detail-panel compact">
                <strong>Extrato de Conta dos utilizadores</strong>
                <span>Seleciona um condominio e confirma sempre a cadeia Condominio {'>'} Fracao {'>'} Utilizador.</span>
                <div class="simple-record-list">
                  {accountExtractRows.map((row) => (
                    <article class="simple-record-card" key={row.id}>
                      <div>
                        <strong>{row.name}</strong>
                        <span>{row.condominium} - fracao {row.fraction}</span>
                      </div>
                      <p>{row.detail}</p>
                      <small>{row.status}</small>
                    </article>
                  ))}
                </div>
              </section>

              <div class="simple-record-list">
                {filtered.length ? filtered.map((item) => (
                  <article class={item.id === selected?.id && detailOpen.value ? 'simple-record-card active' : 'simple-record-card'} key={item.id}>
                    <div>
                      <strong>{item.name}</strong>
                      <span>{item.internalCode || 'sem codigo'} - {item.address?.locality || item.location || 'localidade por completar'}</span>
                    </div>
                    <p>{item.structure?.totalFractions || item.fractions} fracoes - {item.structure?.blocksCount || item.buildings} blocos - {item.structure?.elevatorsCount || 0} elevadores</p>
                    <small>{localCompleteness(item).percentage}% completo</small>
                    <div class="simple-card-actions">
                      <button
                        class="primary-action"
                        type="button"
                        onClick$={() => {
                          selectedId.value = item.id;
                          activeTab.value = 'overview';
                          detailOpen.value = true;
                        }}
                      >
                        Abrir
                      </button>
                      <details class="simple-more-menu">
                        <summary>Mais</summary>
                        <button
                          type="button"
                          onClick$={() => {
                            selectedId.value = item.id;
                            activeTab.value = 'identification';
                            detailOpen.value = true;
                          }}
                        >
                          Editar ficha
                        </button>
                        <button
                          type="button"
                          onClick$={() => {
                            selectedId.value = item.id;
                            activeArea.value = 'documentation';
                            detailOpen.value = true;
                          }}
                        >
                          Documentacao
                        </button>
                        <button
                          type="button"
                          onClick$={() => {
                            selectedId.value = item.id;
                            activeArea.value = 'avarias';
                            detailOpen.value = true;
                          }}
                        >
                          Avarias
                        </button>
                      </details>
                    </div>
                  </article>
                )) : (
                  <article class="simple-empty-state">
                    <strong>Sem condominios para estes filtros.</strong>
                    <span>Limpa a pesquisa ou adiciona um novo condominio.</span>
                  </article>
                )}
              </div>

              {selected && detailOpen.value ? (
                <section class="simple-detail-panel">
                  <header class="simple-detail-header">
                    <div class="condo-building-image">
                      {selected.primaryImageUrl ? <img src={selected.primaryImageUrl} alt={selected.name} /> : <span>Sem imagem</span>}
                    </div>
                    <div>
                      <span class={`status-pill ${selected.operationalStatus?.alertLevel || 'verde'}`}>
                        {selected.operationalStatus?.generalStatus || selected.status}
                      </span>
                      <h2>{selected.name}</h2>
                      <p>{shortAddress(selected)}</p>
                      <small>{selected.manager || 'Gestor por definir'} - {completeness.percentage}% completo</small>
                    </div>
                    <details class="simple-more-menu">
                      <summary>Mais</summary>
                      <a href={selected.address?.googleMapsUrl || '#'} target="_blank" rel="noreferrer">Ver mapa</a>
                      <button type="button" onClick$={() => (activeTab.value = 'zones')}>Adicionar zona</button>
                      <button type="button" onClick$={() => (activeTab.value = 'equipment')}>Adicionar equipamento</button>
                      <button type="button" onClick$={archiveSelected$} disabled={localSaving.value}>Arquivar</button>
                    </details>
                  </header>

                  <section class="condo-summary-grid simple-summary-grid">
                    <Kpi label="Fracoes" value={selected.structure?.totalFractions || selected.fractions} detail="Total" />
                    <Kpi label="Blocos" value={selected.blocksDetailed?.length || selected.structure?.blocksCount || selected.buildings} detail="Registados" />
                    <Kpi label="Zonas" value={selected.zones?.length || 0} detail="Locais" />
                    <Kpi label="Equip." value={selected.equipment?.length || 0} detail="Tecnicos" />
                  </section>

                  <label class="simple-section-picker">
                    <span>Escolher detalhe</span>
                    <select value={activeTab.value} onChange$={(event) => (activeTab.value = (event.target as HTMLSelectElement).value as TabId)}>
                      {tabs.map((tab) => (
                        <option key={tab} value={tab}>{tabLabels[tab]}</option>
                      ))}
                    </select>
                  </label>

                  {activeTab.value === 'overview' ? (
                    <Overview selected={selected} completeness={completeness} />
                  ) : null}
                  {activeTab.value === 'identification' ? (
                    <SectionEditor
                      title="Identificacao"
                      fields={identificationFields}
                      values={selected}
                      isSaving={localSaving.value}
                      onSubmit$={async (form) => submitSection$(form, 'identification', identificationFields)}
                    />
                  ) : null}
                  {activeTab.value === 'address' ? (
                    <SectionEditor
                      title="Morada e localizacao"
                      fields={addressFields}
                      values={selected.address}
                      isSaving={localSaving.value}
                      onSubmit$={async (form) => submitSection$(form, 'address', addressFields)}
                    />
                  ) : null}
                  {activeTab.value === 'structure' ? (
                    <SectionEditor
                      title="Estrutura fisica"
                      fields={structureFields}
                      values={selected.structure}
                      isSaving={localSaving.value}
                      onSubmit$={async (form) => submitSection$(form, 'structure', structureFields)}
                    />
                  ) : null}
                  {activeTab.value === 'status' ? (
                    <SectionEditor
                      title="Estado operacional"
                      fields={statusFields}
                      values={selected.operationalStatus}
                      isSaving={localSaving.value}
                      onSubmit$={async (form) => submitSection$(form, 'operational-status', statusFields)}
                    />
                  ) : null}
                  {activeTab.value === 'history' ? <History events={selected.history ?? []} /> : null}
                  {activeTab.value === 'future' ? <FuturePanel selected={selected} /> : null}
                  {subresourceTab(activeTab.value) ? (
                    <SubresourcePanel
                      title={tabLabels[activeTab.value]}
                      resource={subresourceTab(activeTab.value)!}
                      fields={fieldsForSubresource(activeTab.value)}
                      rows={rowsForSubresource(selected, activeTab.value)}
                      isSaving={localSaving.value}
                      onSubmit$={async (form, resource, fields) => submitSubresource$(form, resource, fields)}
                    />
                  ) : null}
                </section>
              ) : null}
            </section>
          ) : null}

          {activeArea.value === 'reports' ? (
            <section class="simple-section-content">
              <header class="simple-content-header">
                <div>
                  <small>Relatorios</small>
                  <h2>Relatorios de condominios</h2>
                  <p>Area de consulta. A criacao e exportacao continuam no modulo Relatorios.</p>
                </div>
                <button class="primary-action" type="button">Contencioso</button>
              </header>
              <div class="simple-record-list">
                {props.resources.reports.length ? props.resources.reports.map((report) => (
                  <article class="simple-record-card" key={report.id}>
                    <div>
                      <strong>{report.title}</strong>
                      <span>{report.period}</span>
                    </div>
                    <p>Relatorio disponivel para consulta no modulo Relatorios.</p>
                    <small>{report.status}</small>
                    <div class="simple-card-actions">
                      <button class="primary-action" type="button">Abrir</button>
                      <details class="simple-more-menu">
                        <summary>Mais</summary>
                        <a href="/relatorios">Ir para Relatorios</a>
                      </details>
                    </div>
                  </article>
                )) : (
                  <article class="simple-empty-state">
                    <strong>Ainda nao existem relatorios.</strong>
                    <span>Quando forem gerados, aparecem aqui enquadrados por condominio.</span>
                  </article>
                )}
              </div>
            </section>
          ) : null}

          {activeArea.value === 'documentation' ? (
            <section class="simple-section-content">
              <header class="simple-content-header">
                <div>
                  <small>Documentacao</small>
                  <h2>Documentos e plantas</h2>
                  <p>Mostramos os documentos ligados ao condominio escolhido, sem misturar com outros fluxos.</p>
                </div>
                <div class="simple-header-actions">
                  {['Extrato de Conta', 'Atalho 2', 'Atalho 3', 'Atalho 4'].map((action) => (
                    <button class="secondary-action" type="button" key={action}>
                      {action}
                    </button>
                  ))}
                {selected ? (
                  <button class="primary-action" type="button" onClick$={() => (activeTab.value = 'documents')}>
                    Adicionar documento
                  </button>
                ) : null}
                </div>
              </header>
              {selected ? (
                <section class="simple-detail-panel compact">
                  <strong>{selected.name}</strong>
                  <span>{shortAddress(selected)}</span>
                  <label class="simple-section-picker">
                    <span>Adicionar informacao documental</span>
                    <select value={activeTab.value} onChange$={(event) => (activeTab.value = (event.target as HTMLSelectElement).value as TabId)}>
                      <option value="documents">Documentos</option>
                      <option value="media">Imagens e plantas</option>
                    </select>
                  </label>
                  {activeTab.value === 'media' ? (
                    <SubresourcePanel
                      title="Imagens e plantas"
                      resource="media"
                      fields={subresourceFields.media}
                      rows={selected.media ?? []}
                      isSaving={localSaving.value}
                      onSubmit$={async (form, resource, fields) => submitSubresource$(form, resource, fields)}
                    />
                  ) : (
                    <SubresourcePanel
                      title="Documentos"
                      resource="documents"
                      fields={subresourceFields.documents}
                      rows={selected.managedDocuments ?? []}
                      isSaving={localSaving.value}
                      onSubmit$={async (form, resource, fields) => submitSubresource$(form, resource, fields)}
                    />
                  )}
                </section>
              ) : null}
              <div class="simple-record-list">
                {relatedDocuments.length ? relatedDocuments.map((document) => (
                  <article class="simple-record-card" key={`${document.id}-${document.title}`}>
                    <div>
                      <strong>{document.title}</strong>
                      <span>{document.meta}</span>
                    </div>
                    <p>{document.detail}</p>
                    <small>{document.status}</small>
                    <div class="simple-card-actions">
                      <button class="primary-action" type="button">Abrir</button>
                      <details class="simple-more-menu">
                        <summary>Mais</summary>
                        <span>Editar no detalhe do condominio</span>
                      </details>
                    </div>
                  </article>
                )) : (
                  <article class="simple-empty-state">
                    <strong>Sem documentos neste contexto.</strong>
                    <span>Escolhe um condominio e adiciona documentos ou plantas quando fizer sentido.</span>
                  </article>
                )}
              </div>
            </section>
          ) : null}

          {activeArea.value === 'avarias' ? (
            <section class="simple-section-content">
              <header class="simple-content-header">
                <div>
                  <small>Avarias relacionadas</small>
                  <h2>Avarias de condominios</h2>
                  <p>Resumo simples. O trabalho tecnico completo continua no modulo Tickets/Avarias.</p>
                </div>
                <a class="primary-action" href="/tickets">Abrir Tickets</a>
              </header>
              <div class="simple-record-list">
                {(detailOpen.value ? relatedTickets : props.resources.tickets).length ? (detailOpen.value ? relatedTickets : props.resources.tickets).map((ticket) => (
                  <article class="simple-record-card" key={ticket.id}>
                    <div>
                      <strong>{ticket.title}</strong>
                      <span>{ticket.condominium}</span>
                    </div>
                    <p>{ticket.status} - {ticket.updatedAt}</p>
                    <small>{ticket.priority}</small>
                    <div class="simple-card-actions">
                      <button class="primary-action" type="button">Abrir</button>
                      <details class="simple-more-menu">
                        <summary>Mais</summary>
                        <a href="/tickets">Gerir no modulo Tickets</a>
                      </details>
                    </div>
                  </article>
                )) : (
                  <article class="simple-empty-state">
                    <strong>Sem avarias neste contexto.</strong>
                    <span>Quando existirem ocorrencias relacionadas, aparecem aqui.</span>
                  </article>
                )}
              </div>
            </section>
          ) : null}
          {activeArea.value === 'inspections' ? (
            <section class="simple-section-content">
              <header class="simple-content-header">
                <div>
                  <small>Vistorias</small>
                  <h2>Vistorias de condominios</h2>
                  <p>Verificacoes operacionais ligadas ao condominio, fracoes e zonas comuns.</p>
                </div>
              </header>
              <div class="simple-record-list">
                {props.resources.maintenance.length ? props.resources.maintenance.map((item) => (
                  <article class="simple-record-card" key={item.id}>
                    <div>
                      <strong>{item.title}</strong>
                      <span>{item.supplier}</span>
                    </div>
                    <p>Vistoria ou manutencao prevista para {item.date}</p>
                    <small>{item.status}</small>
                  </article>
                )) : (
                  <article class="simple-empty-state">
                    <strong>Sem vistorias registadas.</strong>
                    <span>Quando forem planeadas, aparecem aqui por condominio.</span>
                  </article>
                )}
              </div>
            </section>
          ) : null}

          {activeArea.value === 'timeline' ? (
            <section class="simple-section-content">
              <header class="simple-content-header">
                <div>
                  <small>Time Line</small>
                  <h2>Timeline do condominio</h2>
                  <p>Eventos recentes ligados ao condominio selecionado e ao seu historico operacional.</p>
                </div>
              </header>
              {selected ? (
                <section class="simple-detail-panel compact">
                  <strong>{selected.name}</strong>
                  <span>{shortAddress(selected)}</span>
                  <History events={selected.history ?? []} />
                </section>
              ) : (
                <article class="simple-empty-state">
                  <strong>Sem condominio selecionado.</strong>
                  <span>Escolhe um condominio em Condominios Geral para ver a timeline.</span>
                </article>
              )}
            </section>
          ) : null}

          {activeArea.value === 'support' ? (
            <section class="simple-section-content">
              <header class="simple-content-header">
                <div>
                  <small>Apoio Cliente/Administradores</small>
                  <h2>Apoio a utilizadores e administradores</h2>
                  <p>Utilizadores sempre associados a uma fracao, e cada fracao ligada a um condominio.</p>
                </div>
              </header>
              <section class="simple-detail-panel compact">
                <strong>Arquitetura operacional</strong>
                <span>Condominios {'>'} Condominio {'>'} Fracoes {'>'} Utilizadores</span>
              </section>
              <div class="simple-record-list">
                {props.resources.residents.length ? props.resources.residents.map((user) => (
                  <article class="simple-record-card" key={user.id}>
                    <div>
                      <strong>{user.name}</strong>
                      <span>{user.email} - {user.phone}</span>
                    </div>
                    <p>{user.condominium} - fracao {user.fraction}</p>
                    <small>{user.status}</small>
                  </article>
                )) : (
                  <article class="simple-empty-state">
                    <strong>Sem utilizadores registados.</strong>
                    <span>Cria utilizadores sempre a partir de uma fracao.</span>
                  </article>
                )}
              </div>
            </section>
          ) : null}

          {activeArea.value === 'tickets' ? (
            <section class="simple-section-content">
              <header class="simple-content-header">
                <div>
                  <small>Tickets</small>
                  <h2>Tickets de condominios</h2>
                  <p>Pedidos e seguimento operacional associados aos condominios.</p>
                </div>
                <a class="primary-action" href="/tickets">Abrir modulo Tickets</a>
              </header>
              <div class="simple-record-list">
                {props.resources.tickets.length ? props.resources.tickets.map((ticket) => (
                  <article class="simple-record-card" key={ticket.id}>
                    <div>
                      <strong>{ticket.title}</strong>
                      <span>{ticket.condominium}</span>
                    </div>
                    <p>{ticket.detail || ticket.status} - {ticket.updatedAt}</p>
                    <small>{ticket.priority}</small>
                    <div class="simple-card-actions">
                      <a class="primary-action" href="/tickets">Abrir</a>
                    </div>
                  </article>
                )) : (
                  <article class="simple-empty-state">
                    <strong>Sem tickets registados.</strong>
                    <span>Novos pedidos aparecem aqui com prioridade e condominio.</span>
                  </article>
                )}
              </div>
            </section>
          ) : null}
        </section>
      )}
    </section>
  );

});

const identificationFields: FieldConfig[] = [
  { name: 'name', label: 'Nome' },
  { name: 'internalCode', label: 'Codigo interno' },
  { name: 'externalReference', label: 'Referencia externa' },
  { name: 'condominiumType', label: 'Tipo' },
  { name: 'subtype', label: 'Subtipo' },
  { name: 'status', label: 'Estado' },
  { name: 'managementStartDate', label: 'Inicio gestao' },
  { name: 'managementEndDate', label: 'Fim gestao' },
  { name: 'manager', label: 'Gestor' },
  { name: 'team', label: 'Equipa' },
  { name: 'managementCompany', label: 'Empresa gestora' },
  { name: 'shortDescription', label: 'Descricao curta', kind: 'textarea' },
  { name: 'administrativeNotes', label: 'Notas administrativas', kind: 'textarea' },
  { name: 'tags', label: 'Tags internas' }
];

const addressFields: FieldConfig[] = [
  { name: 'street', label: 'Rua' },
  { name: 'number', label: 'Numero' },
  { name: 'lot', label: 'Lote' },
  { name: 'addressBlock', label: 'Bloco morada' },
  { name: 'postalCode', label: 'Codigo postal' },
  { name: 'locality', label: 'Localidade' },
  { name: 'parish', label: 'Freguesia' },
  { name: 'municipality', label: 'Concelho' },
  { name: 'district', label: 'Distrito' },
  { name: 'country', label: 'Pais' },
  { name: 'latitude', label: 'Latitude', kind: 'number' },
  { name: 'longitude', label: 'Longitude', kind: 'number' },
  { name: 'googleMapsUrl', label: 'Google Maps' },
  { name: 'accessNotes', label: 'Notas de acesso', kind: 'textarea' },
  { name: 'technicalEntryPoint', label: 'Entrada tecnicos' },
  { name: 'garageEntryPoint', label: 'Entrada garagem' },
  { name: 'accessRestrictions', label: 'Restricoes', kind: 'textarea' }
];

const structureFields: FieldConfig[] = [
  { name: 'totalFractions', label: 'Total fracoes', kind: 'number' },
  { name: 'residentialFractions', label: 'Habitacionais', kind: 'number' },
  { name: 'commercialFractions', label: 'Comerciais', kind: 'number' },
  { name: 'garagesCount', label: 'Garagens', kind: 'number' },
  { name: 'storageUnitsCount', label: 'Arrecadacoes', kind: 'number' },
  { name: 'blocksCount', label: 'Blocos', kind: 'number' },
  { name: 'entrancesCount', label: 'Entradas', kind: 'number' },
  { name: 'floorsAboveGround', label: 'Pisos acima solo', kind: 'number' },
  { name: 'basementsCount', label: 'Caves', kind: 'number' },
  { name: 'elevatorsCount', label: 'Elevadores', kind: 'number' },
  { name: 'stairsCount', label: 'Escadas', kind: 'number' },
  { name: 'parkingSpacesCount', label: 'Estacionamentos', kind: 'number' },
  { name: 'hasGarden', label: 'Jardim', kind: 'checkbox' },
  { name: 'hasPool', label: 'Piscina', kind: 'checkbox' },
  { name: 'hasCctv', label: 'CCTV', kind: 'checkbox' },
  { name: 'constructionYear', label: 'Ano construcao', kind: 'number' },
  { name: 'lastRenovationYear', label: 'Ultima reabilitacao', kind: 'number' },
  { name: 'structuralNotes', label: 'Observacoes estruturais', kind: 'textarea' }
];

const statusFields: FieldConfig[] = [
  { name: 'generalStatus', label: 'Estado geral' },
  { name: 'alertLevel', label: 'Nivel alerta' },
  { name: 'summary', label: 'Resumo operacional', kind: 'textarea' },
  { name: 'reason', label: 'Motivo', kind: 'textarea' }
];

const subresourceFields: Record<SubresourceName, FieldConfig[]> = {
  blocks: [
    { name: 'name', label: 'Nome' },
    { name: 'code', label: 'Codigo' },
    { name: 'floorsCount', label: 'Pisos', kind: 'number' },
    { name: 'fractionsCount', label: 'Fracoes', kind: 'number' },
    { name: 'elevatorsCount', label: 'Elevadores', kind: 'number' },
    { name: 'operationalStatus', label: 'Estado operacional' },
    { name: 'accessNotes', label: 'Notas de acesso', kind: 'textarea' }
  ],
  floors: [
    { name: 'name', label: 'Nome' },
    { name: 'number', label: 'Numero' },
    { name: 'blockId', label: 'Bloco ID' },
    { name: 'floorType', label: 'Tipo' },
    { name: 'fractionsCount', label: 'Fracoes', kind: 'number' },
    { name: 'operationalStatus', label: 'Estado' }
  ],
  zones: [
    { name: 'name', label: 'Nome' },
    { name: 'zoneType', label: 'Tipo' },
    { name: 'blockId', label: 'Bloco ID' },
    { name: 'floorId', label: 'Piso ID' },
    { name: 'operationalStatus', label: 'Estado' },
    { name: 'alertLevel', label: 'Alerta' },
    { name: 'internalLocation', label: 'Localizacao interna' },
    { name: 'accessNotes', label: 'Notas acesso', kind: 'textarea' }
  ],
  equipment: [
    { name: 'name', label: 'Nome' },
    { name: 'equipmentType', label: 'Tipo' },
    { name: 'zoneId', label: 'Zona ID' },
    { name: 'brand', label: 'Marca' },
    { name: 'model', label: 'Modelo' },
    { name: 'maintenanceCompany', label: 'Manutencao' },
    { name: 'status', label: 'Estado' },
    { name: 'criticality', label: 'Criticidade' }
  ],
  contacts: [
    { name: 'name', label: 'Nome' },
    { name: 'contactType', label: 'Tipo' },
    { name: 'company', label: 'Empresa' },
    { name: 'role', label: 'Funcao' },
    { name: 'phone', label: 'Telefone' },
    { name: 'email', label: 'Email' },
    { name: 'isEmergency', label: 'Emergencia', kind: 'checkbox' },
    { name: 'favorite', label: 'Favorito', kind: 'checkbox' }
  ],
  documents: [
    { name: 'title', label: 'Titulo' },
    { name: 'documentType', label: 'Tipo' },
    { name: 'fileName', label: 'Ficheiro' },
    { name: 'fileUrl', label: 'URL/download' },
    { name: 'expiryDate', label: 'Validade' },
    { name: 'status', label: 'Estado' },
    { name: 'notes', label: 'Notas', kind: 'textarea' }
  ],
  media: [
    { name: 'title', label: 'Titulo' },
    { name: 'mediaType', label: 'Tipo' },
    { name: 'fileName', label: 'Ficheiro' },
    { name: 'fileUrl', label: 'URL' },
    { name: 'zoneId', label: 'Zona ID' },
    { name: 'isPrimary', label: 'Imagem principal', kind: 'checkbox' },
    { name: 'description', label: 'Descricao', kind: 'textarea' }
  ],
  notes: [
    { name: 'title', label: 'Titulo' },
    { name: 'noteType', label: 'Tipo' },
    { name: 'content', label: 'Conteudo', kind: 'textarea' },
    { name: 'visibility', label: 'Visibilidade' },
    { name: 'priority', label: 'Prioridade' },
    { name: 'pinned', label: 'Fixar', kind: 'checkbox' }
  ]
};

function subresourceTab(tab: TabId): SubresourceName | null {
  return ['blocks', 'floors', 'zones', 'equipment', 'contacts', 'documents', 'media', 'notes'].includes(tab)
    ? (tab as SubresourceName)
    : null;
}

function fieldsForSubresource(tab: TabId): FieldConfig[] {
  return subresourceFields[subresourceTab(tab) ?? 'blocks'];
}

function rowsForSubresource(selected: Condominium, tab: TabId): Array<Record<string, unknown>> {
  switch (tab) {
    case 'blocks':
      return selected.blocksDetailed ?? [];
    case 'floors':
      return selected.floorsDetailed ?? [];
    case 'zones':
      return selected.zones ?? [];
    case 'equipment':
      return selected.equipment ?? [];
    case 'contacts':
      return selected.contacts ?? [];
    case 'documents':
      return selected.managedDocuments ?? [];
    case 'media':
      return selected.media ?? [];
    case 'notes':
      return selected.internalNotesRegistry ?? [];
    default:
      return [];
  }
}

function payloadFromForm(form: HTMLFormElement, fields: FieldConfig[]): Record<string, unknown> {
  const formData = new FormData(form);
  return fields.reduce<Record<string, unknown>>((payload, field) => {
    if (field.kind === 'checkbox') {
      payload[field.name] = formData.get(field.name) === 'true';
      return payload;
    }
    if (field.kind === 'number') {
      const value = String(formData.get(field.name) ?? '').trim();
      payload[field.name] = value ? Number(value) : undefined;
      return payload;
    }
    if (field.name === 'tags') {
      payload[field.name] = String(formData.get(field.name) ?? '')
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);
      return payload;
    }
    payload[field.name] = String(formData.get(field.name) ?? '').trim();
    return payload;
  }, {});
}

function text(formData: FormData, name: string): string {
  return String(formData.get(name) ?? '').trim();
}

function numberValue(formData: FormData, name: string): number {
  const value = Number(formData.get(name) || 0);
  return Number.isFinite(value) ? value : 0;
}

function shortAddress(item: Condominium): string {
  const address = item.address;
  return [address?.street, address?.number, address?.postalCode, address?.locality]
    .filter(Boolean)
    .join(', ') || item.location || 'Morada por completar';
}

function localCompleteness(item?: Condominium): CompletenessReport {
  if (!item) {
    return emptyCompleteness;
  }
  const checks = [
    Boolean(item.internalCode),
    Boolean(item.manager),
    Boolean(item.address?.street && item.address?.locality),
    Boolean(item.structure?.totalFractions || item.fractions),
    Boolean(item.blocksDetailed?.length),
    Boolean(item.zones?.length),
    Boolean(item.equipment?.length),
    Boolean(item.contacts?.some((contact) => contact.isEmergency)),
    Boolean(item.managedDocuments?.length),
    Boolean(item.primaryImageUrl || item.media?.some((media) => media.isPrimary))
  ];
  const missing = [
    !checks[0] ? 'falta codigo interno' : '',
    !checks[1] ? 'falta gestor responsavel' : '',
    !checks[2] ? 'falta morada completa' : '',
    !checks[3] ? 'falta total de fracoes' : '',
    !checks[4] ? 'nao existem blocos registados' : '',
    !checks[5] ? 'nao existem zonas registadas' : '',
    !checks[6] ? 'nao existem equipamentos registados' : '',
    !checks[7] ? 'nao existe contacto de emergencia' : '',
    !checks[8] ? 'faltam documentos' : '',
    !checks[9] ? 'falta imagem principal ou planta' : ''
  ].filter(Boolean);
  return {
    percentage: Math.round((checks.filter(Boolean).length / checks.length) * 100),
    complete: missing.length === 0,
    missingItems: missing,
    categories: []
  };
}

function tabToStep(tab: TabId): number {
  const index = tabs.indexOf(tab);
  return index < 0 ? 1 : index + 1;
}
