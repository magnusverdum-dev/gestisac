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

type CondominiumsPageProps = {
  token: string;
  resources: ResourceState;
  isSaving: boolean;
  onRefresh$: PropFunction<() => void>;
};

type FieldKind = 'text' | 'number' | 'textarea' | 'checkbox';

type FieldConfig = {
  name: string;
  label: string;
  kind?: FieldKind;
  placeholder?: string;
};

type SubresourceName =
  | 'blocks'
  | 'floors'
  | 'zones'
  | 'equipment'
  | 'contacts'
  | 'documents'
  | 'media'
  | 'notes';

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
  const viewMode = useSignal<'cards' | 'table'>('cards');
  const search = useSignal('');
  const statusFilter = useSignal('todos');
  const typeFilter = useSignal('todos');
  const localSaving = useSignal(false);
  const localError = useSignal('');
  const localNotice = useSignal('');
  const detail = useSignal<CondominiumDetailResponse | null>(null);
  const importPreview = useSignal<ImportPreview | null>(null);

  const selected =
    detail.value?.condominium ??
    props.resources.condominiums.find((item) => item.id === selectedId.value) ??
    props.resources.condominiums[0];
  const completeness = detail.value?.completeness ?? localCompleteness(selected);
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
    const matchesType =
      typeFilter.value === 'todos' || item.condominiumType?.toLowerCase() === typeFilter.value;

    return matchesSearch && matchesStatus && matchesType && !item.archived;
  });
  const activeCount = props.resources.condominiums.filter((item) => !item.archived).length;
  const fractionCount = props.resources.condominiums.reduce(
    (total, item) => total + (item.structure?.totalFractions || item.fractions || 0),
    0
  );
  const alertsCount = props.resources.condominiums.filter((item) =>
    ['critico', 'vermelho', 'com alertas', 'em manutencao'].some((flag) =>
      `${item.operationalStatus?.generalStatus ?? ''} ${item.operationalStatus?.alertLevel ?? ''}`.toLowerCase().includes(flag)
    )
  ).length;
  const incompleteCount = props.resources.condominiums.filter((item) => localCompleteness(item).percentage < 100).length;

  const loadDetail$ = $(async (id: string) => {
    if (!id) {
      detail.value = null;
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

  return (
    <section class="condominiums-workspace">
      <header class="condo-hero glass-panel">
        <div>
          <span class="page-eyebrow">GESTISAC - Condominios</span>
          <h1>Condominios</h1>
          <p>Entidades vivas com morada, estrutura fisica, contactos, documentos, historico e completude.</p>
        </div>
        <div class="condo-hero-actions">
          <button type="button" onClick$={saveDraft$} disabled={!selected || localSaving.value}>
            Guardar rascunho
          </button>
          <button class="primary-action" type="button" onClick$={() => (activeTab.value = 'overview')}>
            Abrir condominio
          </button>
        </div>
      </header>

      {localError.value ? <div class="app-error glass-panel">{localError.value}</div> : null}
      {localNotice.value ? <div class="app-success glass-panel">{localNotice.value}</div> : null}

      <section class="condo-kpis">
        <Kpi label="Ativos" value={activeCount} detail="Condominios operacionais" />
        <Kpi label="Fracoes" value={fractionCount} detail="Total conhecido" />
        <Kpi label="Alertas" value={alertsCount} detail="Estados em atencao" />
        <Kpi label="Incompletos" value={incompleteCount} detail="Onboarding pendente" />
      </section>

      <section class="condo-create-import glass-panel">
        <form
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
        <form
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
            <small>{importPreview.value.validRows} validas / {importPreview.value.invalidRows} com erros</small>
          ) : null}
        </form>
      </section>

      <div class="condo-layout">
        <aside class="condo-list-panel glass-panel">
          <div class="condo-filter-bar">
            <input
              value={search.value}
              placeholder="Pesquisar por nome, codigo, rua, gestor..."
              onInput$={(event) => (search.value = (event.target as HTMLInputElement).value)}
            />
            <select value={statusFilter.value} onChange$={(event) => (statusFilter.value = (event.target as HTMLSelectElement).value)}>
              <option value="todos">Todos os estados</option>
              <option value="ativo">Ativo</option>
              <option value="em onboarding">Onboarding</option>
              <option value="suspenso">Suspenso</option>
              <option value="arquivo">Arquivo</option>
            </select>
            <select value={typeFilter.value} onChange$={(event) => (typeFilter.value = (event.target as HTMLSelectElement).value)}>
              <option value="todos">Todos os tipos</option>
              <option value="residencial">Residencial</option>
              <option value="comercial">Comercial</option>
              <option value="misto">Misto</option>
              <option value="garagens">Garagens</option>
            </select>
          </div>
          <div class="condo-view-toggle">
            <button class={viewMode.value === 'cards' ? 'active' : ''} type="button" onClick$={() => (viewMode.value = 'cards')}>Cards</button>
            <button class={viewMode.value === 'table' ? 'active' : ''} type="button" onClick$={() => (viewMode.value = 'table')}>Tabela</button>
          </div>
          <div class={viewMode.value === 'cards' ? 'condo-card-list' : 'condo-table-list'}>
            {filtered.length ? filtered.map((item) => (
              <button
                class={item.id === selected?.id ? 'condo-list-card active' : 'condo-list-card'}
                key={item.id}
                type="button"
                onClick$={() => {
                  selectedId.value = item.id;
                  activeTab.value = 'overview';
                }}
              >
                <strong>{item.name}</strong>
                <span>{item.internalCode || 'sem codigo'} - {item.address?.locality || item.location}</span>
                <small>{item.structure?.totalFractions || item.fractions} fracoes - {item.structure?.blocksCount || item.buildings} blocos - {item.structure?.elevatorsCount || 0} elevadores</small>
                <small>{item.manager || 'Gestor por definir'} - {item.operationalStatus?.summary || item.notice}</small>
                <span class="condo-list-flags">
                  <b>{hasCompleteAddress(item) ? 'Morada completa' : 'Falta morada'}</b>
                  <b>{hasCompleteStructure(item) ? 'Estrutura completa' : 'Falta estrutura'}</b>
                  <b>{item.managedDocuments?.length ? 'Docs carregados' : 'Faltam docs'}</b>
                </span>
                <em>{localCompleteness(item).percentage}% completo</em>
                <span class="condo-open-label">Abrir condominio</span>
              </button>
            )) : (
              <article class="condo-empty-state">
                <strong>Ainda nao ha condominios para estes filtros</strong>
                <span>Cria o primeiro condominio ou limpa a pesquisa.</span>
              </article>
            )}
          </div>
        </aside>

        {selected ? (
          <section class="condo-detail-panel glass-panel">
            <header class="condo-detail-header">
              <div class="condo-building-image">
                {selected.primaryImageUrl ? <img src={selected.primaryImageUrl} alt={selected.name} /> : <span>Sem imagem</span>}
              </div>
              <div>
                <span class={`status-pill ${selected.operationalStatus?.alertLevel || 'verde'}`}>
                  {selected.operationalStatus?.generalStatus || selected.status}
                </span>
                <h2>{selected.name}</h2>
                <p>{shortAddress(selected)}</p>
                <small>{selected.internalCode} - {selected.manager || 'Gestor por definir'} - {completeness.percentage}% completo</small>
              </div>
              <div class="condo-detail-actions">
                <a href={selected.address?.googleMapsUrl || '#'} target="_blank" rel="noreferrer">Ver mapa</a>
                <button type="button" onClick$={() => (activeTab.value = 'documents')}>Carregar documento</button>
                <button type="button" onClick$={() => (activeTab.value = 'zones')}>Adicionar zona</button>
                <button type="button" onClick$={() => (activeTab.value = 'equipment')}>Adicionar equipamento</button>
                <button type="button" onClick$={archiveSelected$} disabled={localSaving.value}>Arquivar</button>
              </div>
            </header>

            <section class="condo-summary-grid">
              <Kpi label="Fracoes" value={selected.structure?.totalFractions || selected.fractions} detail="Total" />
              <Kpi label="Blocos" value={selected.blocksDetailed?.length || selected.structure?.blocksCount || selected.buildings} detail="Registados" />
              <Kpi label="Zonas" value={selected.zones?.length || 0} detail="Locais operacionais" />
              <Kpi label="Equip." value={selected.equipment?.length || 0} detail="Tecnicos" />
              <Kpi label="Docs" value={selected.managedDocuments?.length || 0} detail="Associados" />
            </section>

            <nav class="condo-tabs">
              {tabs.map((tab) => (
                <button class={activeTab.value === tab ? 'active' : ''} key={tab} type="button" onClick$={() => (activeTab.value = tab)}>
                  {tabLabels[tab]}
                </button>
              ))}
            </nav>

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
        ) : (
          <section class="condo-detail-panel empty glass-panel">
            <strong>Adicionar primeiro condominio</strong>
            <span>Quando existir um condominio, a ficha completa aparece aqui.</span>
          </section>
        )}
      </div>
    </section>
  );
});

type SectionEditorProps = {
  title: string;
  fields: FieldConfig[];
  values?: Record<string, unknown>;
  isSaving: boolean;
  onSubmit$: PropFunction<(form: HTMLFormElement) => void>;
};

const SectionEditor = component$((props: SectionEditorProps) => (
  <form
    class="condo-editor"
    preventdefault:submit
    onSubmit$={async (event) => props.onSubmit$(event.target as HTMLFormElement)}
  >
    <header>
      <strong>{props.title}</strong>
      <span>Alteracoes criam historico automatico.</span>
    </header>
    <div class="condo-form-grid">
      {props.fields.map((field) => (
        <Field
          key={field.name}
          name={field.name}
          label={field.label}
          kind={field.kind}
          placeholder={field.placeholder}
          value={valueFor(props.values, field.name)}
        />
      ))}
    </div>
    <button class="primary-action" type="submit" disabled={props.isSaving}>
      Guardar seccao
    </button>
  </form>
));

type SubresourcePanelProps = {
  title: string;
  resource: SubresourceName;
  fields: FieldConfig[];
  rows: Array<Record<string, unknown>>;
  isSaving: boolean;
  onSubmit$: PropFunction<(form: HTMLFormElement, resource: SubresourceName, fields: FieldConfig[]) => void>;
};

const SubresourcePanel = component$((props: SubresourcePanelProps) => (
  <section class="condo-subresource">
    <form
      class="condo-editor"
      preventdefault:submit
      onSubmit$={async (event) => props.onSubmit$(event.target as HTMLFormElement, props.resource, props.fields)}
    >
      <header>
        <strong>Adicionar {props.title.toLowerCase()}</strong>
        <span>Fica associado a este condominio e entra no historico.</span>
      </header>
      <div class="condo-form-grid">
        {props.fields.map((field) => (
          <Field key={field.name} name={field.name} label={field.label} kind={field.kind} placeholder={field.placeholder} />
        ))}
      </div>
      <button class="primary-action" type="submit" disabled={props.isSaving}>Adicionar</button>
    </form>
    <div class="condo-resource-list">
      {props.rows.length ? props.rows.map((row) => (
        <article key={String(row.id)}>
          <strong>{String(row.name ?? row.title ?? row.contactType ?? 'Registo')}</strong>
          <span>{Object.entries(row).filter(([key, value]) => key !== 'id' && value).slice(0, 5).map(([, value]) => String(value)).join(' - ')}</span>
        </article>
      )) : (
        <article class="condo-empty-state">
          <strong>Ainda nao existem registos</strong>
          <span>Usa o formulario acima para completar esta parte da ficha.</span>
        </article>
      )}
    </div>
  </section>
));

const Field = component$((props: FieldConfig & { value?: string }) => (
  <label class={props.kind === 'textarea' ? 'wide' : ''}>
    <span>{props.label}</span>
    {props.kind === 'textarea' ? (
      <textarea name={props.name} placeholder={props.placeholder} value={props.value} />
    ) : props.kind === 'checkbox' ? (
      <input name={props.name} type="checkbox" value="true" checked={props.value === 'true'} />
    ) : (
      <input name={props.name} type={props.kind === 'number' ? 'number' : 'text'} placeholder={props.placeholder} value={props.value} />
    )}
  </label>
));

const Kpi = component$((props: { label: string; value: string | number; detail: string }) => (
  <article class="condo-kpi glass-panel">
    <span>{props.label}</span>
    <strong>{props.value}</strong>
    <small>{props.detail}</small>
  </article>
));

const Overview = component$((props: { selected: Condominium; completeness: CompletenessReport }) => (
  <section class="condo-overview-grid">
    <article>
      <strong>Ficha do condominio</strong>
      <span>{props.completeness.percentage}% completo</span>
      <progress value={props.completeness.percentage} max="100" />
      {props.completeness.missingItems.slice(0, 8).map((item) => <small key={item}>{item}</small>)}
    </article>
    <article>
      <strong>Resumo operacional</strong>
      <span>{props.selected.operationalStatus?.summary || props.selected.notice}</span>
      <small>Ultima atualizacao: {props.selected.operationalStatus?.updatedAt || props.selected.updatedAt || 'por definir'}</small>
    </article>
    <article>
      <strong>Localizacao</strong>
      <span>{shortAddress(props.selected)}</span>
      <small>{props.selected.address?.accessNotes || 'Sem notas de acesso'}</small>
    </article>
  </section>
));

const History = component$((props: { events: Array<Record<string, unknown>> }) => (
  <section class="condo-timeline">
    {props.events.length ? props.events.map((event) => (
      <article key={String(event.id)}>
        <strong>{String(event.description || event.eventType)}</strong>
        <span>{String(event.userName || 'Sistema')} - {String(event.timestamp || '')}</span>
        <small>{String(event.entity || event.source || '')}</small>
      </article>
    )) : (
      <article class="condo-empty-state">
        <strong>Historico ainda vazio</strong>
        <span>As proximas alteracoes aparecem aqui automaticamente.</span>
      </article>
    )}
  </section>
));

const FuturePanel = component$((props: { selected: Condominium }) => (
  <section class="condo-future-panel">
    <article>
      <strong>Mapa</strong>
      <span>{props.selected.address?.latitude ?? 'lat por definir'}, {props.selected.address?.longitude ?? 'lng por definir'}</span>
      <a href={props.selected.address?.googleMapsUrl || '#'} target="_blank" rel="noreferrer">Abrir mapa</a>
    </article>
    <article>
      <strong>QR por zona</strong>
      <span>{props.selected.zones?.filter((zone) => zone.publicQrUrl).length ?? 0} zonas preparadas</span>
    </article>
    <article>
      <strong>Planta 2D / 3D futuro</strong>
      <span>Campos e associacoes preparados; visualizador avancado fica para fase futura.</span>
    </article>
  </section>
));

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

function valueFor(values: Record<string, unknown> | undefined, name: string): string {
  const value = values?.[name];
  if (Array.isArray(value)) {
    return value.join(', ');
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  return value === undefined || value === null ? '' : String(value);
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

function hasCompleteAddress(item: Condominium): boolean {
  return Boolean(item.address?.street && item.address?.postalCode && item.address?.locality);
}

function hasCompleteStructure(item: Condominium): boolean {
  return Boolean((item.structure?.totalFractions || item.fractions) && (item.structure?.blocksCount || item.buildings));
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
