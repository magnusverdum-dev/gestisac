import { $, component$, Slot, useSignal, type PropFunction } from '@builder.io/qwik';
import {
  archiveCondominium,
  commitCondominiumImport,
  condominiumSubresourceApi,
  createResource,
  getCondominiumDetail,
  previewCondominiumImport,
  uploadCondominiumDocument,
  uploadCondominiumMedia,
  updateCondominiumAddress,
  updateCondominiumIdentification,
  updateCondominiumOperationalStatus,
  updateCondominiumStructure,
  type Condominium,
  type CondominiumCompleteness,
  type CondominiumDetailResponse,
  type CondominiumImportPreview,
  type DashboardResponse,
  type ResourceState
} from '../../lib/api';

type Props = {
  token: string;
  dashboard: DashboardResponse;
  resources: ResourceState;
  isSaving: boolean;
  onRefresh$: PropFunction<() => void>;
  onSelectCondominium$: PropFunction<(name: string) => void>;
};

type Tab =
  | 'overview'
  | 'identification'
  | 'address'
  | 'structure'
  | 'blocks'
  | 'floors'
  | 'zones'
  | 'equipment'
  | 'contacts'
  | 'documents'
  | 'media'
  | 'history'
  | 'status'
  | 'notes'
  | 'future';

const tabs: Array<{ id: Tab; label: string }> = [
  { id: 'overview', label: 'Visao geral' },
  { id: 'identification', label: 'Identificacao' },
  { id: 'address', label: 'Morada' },
  { id: 'structure', label: 'Estrutura' },
  { id: 'blocks', label: 'Blocos' },
  { id: 'floors', label: 'Pisos' },
  { id: 'zones', label: 'Zonas' },
  { id: 'equipment', label: 'Equipamentos' },
  { id: 'contacts', label: 'Contactos' },
  { id: 'documents', label: 'Documentos' },
  { id: 'media', label: 'Imagens' },
  { id: 'history', label: 'Historico' },
  { id: 'status', label: 'Estado' },
  { id: 'notes', label: 'Notas' },
  { id: 'future', label: 'Mapa/QR/3D' }
];

const toText = (value: FormDataEntryValue | null) => String(value ?? '').trim();
const toNumber = (value: FormDataEntryValue | null) => Number(toText(value) || 0);
const toBool = (value: FormDataEntryValue | null) => toText(value) === 'on';

const formPayload = (form: HTMLFormElement, numbers: string[] = [], booleans: string[] = []) => {
  const data = new FormData(form);
  const payload: Record<string, string | number | boolean | string[]> = {};
  data.forEach((value, key) => {
    if (numbers.includes(key)) {
      payload[key] = toNumber(value);
    } else if (booleans.includes(key)) {
      payload[key] = toBool(value);
    } else if (key === 'tags') {
      payload[key] = toText(value).split(',').map((item) => item.trim()).filter(Boolean);
    } else {
      payload[key] = toText(value);
    }
  });
  booleans.forEach((key) => {
    if (!data.has(key)) {
      payload[key] = false;
    }
  });
  return payload;
};

const emptyCompleteness: CondominiumCompleteness = {
  percentage: 0,
  completedCategories: 0,
  totalCategories: 10,
  missingItems: ['Abrir condominio para calcular checklist'],
  categories: []
};

const localCompleteness = (item: Condominium) => {
  const checks = [
    Boolean(item.name && (item.internalCode || item.manager)),
    Boolean(item.address?.street && item.address?.locality),
    Boolean((item.structure?.totalFractions ?? item.fractions) > 0),
    Boolean(item.blocksDetailed?.length),
    Boolean(item.zones?.length),
    Boolean(item.equipment?.length),
    Boolean(item.contacts?.some((contact) => contact.isEmergency)),
    Boolean(item.managedDocuments?.length),
    Boolean(item.media?.length || item.primaryImageUrl),
    Boolean(item.internalNotesRegistry?.length)
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
};

const matches = (haystack: string, needle: string) =>
  haystack.toLowerCase().includes(needle.trim().toLowerCase());

export const CondominiumsPage = component$((props: Props) => {
  const query = useSignal('');
  const statusFilter = useSignal('Todos');
  const operationalFilter = useSignal('Todos');
  const incompleteOnly = useSignal(false);
  const viewMode = useSignal<'cards' | 'table'>('cards');
  const selectedId = useSignal(props.resources.condominiums[0]?.id ?? '');
  const detail = useSignal<CondominiumDetailResponse | null>(null);
  const activeTab = useSignal<Tab>('overview');
  const localSaving = useSignal(false);
  const localNotice = useSignal('');
  const localError = useSignal('');
  const createOpen = useSignal(false);
  const importOpen = useSignal(false);
  const importPreview = useSignal<CondominiumImportPreview | null>(null);

  const selected =
    detail.value?.condominium ??
    props.resources.condominiums.find((item) => item.id === selectedId.value) ??
    props.resources.condominiums[0];
  const completeness = detail.value?.completeness ?? (selected ? {
    ...emptyCompleteness,
    percentage: localCompleteness(selected)
  } : emptyCompleteness);

  const activeCondominiums = props.resources.condominiums.filter((item) => !item.archived).length;
  const totalFractions = props.resources.condominiums.reduce((sum, item) => sum + item.fractions, 0);
  const alertCondominiums = props.resources.condominiums.filter((item) =>
    ['critico', 'com alertas', 'manutencao'].some((status) =>
      item.operationalStatus?.generalStatus?.toLowerCase().includes(status)
    ) || item.notice.toLowerCase().includes('aviso')
  ).length;
  const incompleteCondominiums = props.resources.condominiums.filter((item) => localCompleteness(item) < 100).length;
  const maintenanceCondominiums = props.resources.condominiums.filter((item) =>
    item.operationalStatus?.generalStatus?.toLowerCase().includes('manutencao') ||
    item.status.toLowerCase().includes('manutencao')
  ).length;

  const filtered = props.resources.condominiums.filter((item) => {
    const text = [
      item.name,
      item.internalCode,
      item.location,
      item.address?.street,
      item.address?.postalCode,
      item.manager,
      item.notice,
      item.administrativeNotes
    ].join(' ');
    const statusMatch = statusFilter.value === 'Todos' || item.status === statusFilter.value;
    const operationalMatch =
      operationalFilter.value === 'Todos' ||
      item.operationalStatus?.generalStatus === operationalFilter.value;
    const incompleteMatch = !incompleteOnly.value || localCompleteness(item) < 100;
    return (!query.value.trim() || matches(text, query.value)) && statusMatch && operationalMatch && incompleteMatch;
  });

  const loadDetail$ = $(async (id: string) => {
    if (!props.token) {
      return;
    }
    localError.value = '';
    selectedId.value = id;
    try {
      detail.value = await getCondominiumDetail(props.token, id);
      activeTab.value = 'overview';
    } catch (err) {
      localError.value = err instanceof Error ? err.message : 'Nao foi possivel abrir o condominio';
    }
  });

  const saveSection$ = $(async (section: 'identification' | 'address' | 'structure' | 'status', form: HTMLFormElement) => {
    if (!selected?.id) {
      return;
    }
    localSaving.value = true;
    localError.value = '';
    localNotice.value = '';
    try {
      if (section === 'identification') {
        await updateCondominiumIdentification(props.token, selected.id, formPayload(form));
      } else if (section === 'address') {
        await updateCondominiumAddress(props.token, selected.id, formPayload(form, ['latitude', 'longitude']));
      } else if (section === 'structure') {
        await updateCondominiumStructure(
          props.token,
          selected.id,
          formPayload(form, [
            'totalFractions',
            'residentialFractions',
            'commercialFractions',
            'garagesCount',
            'storageUnitsCount',
            'shopsCount',
            'blocksCount',
            'entrancesCount',
            'floorsAboveGround',
            'basementsCount',
            'technicalFloorsCount',
            'elevatorsCount',
            'stairsCount',
            'parkingSpacesCount',
            'constructionYear',
            'lastRenovationYear'
          ], [
            'hasGarden',
            'hasPool',
            'hasCondominiumRoom',
            'hasTrashHouse',
            'hasAccessibleRoof',
            'hasTechnicalRoof',
            'hasSolarPanels',
            'hasCctv',
            'hasPorterDesk',
            'hasDoorman',
            'hasSecurity'
          ])
        );
      } else {
        await updateCondominiumOperationalStatus(props.token, selected.id, formPayload(form));
      }
      detail.value = await getCondominiumDetail(props.token, selected.id);
      await props.onRefresh$();
      localNotice.value = 'Ficha atualizada.';
    } catch (err) {
      localError.value = err instanceof Error ? err.message : 'Nao foi possivel guardar';
    } finally {
      localSaving.value = false;
    }
  });

  const createQuick$ = $(async (form: HTMLFormElement) => {
    localSaving.value = true;
    localError.value = '';
    localNotice.value = '';
    try {
      const payload = formPayload(form, ['buildings', 'fractions', 'residents']);
      await createResource(props.token, 'condominiums', payload as Record<string, string | number>);
      await props.onRefresh$();
      form.reset();
      createOpen.value = false;
      localNotice.value = 'Condominio criado em onboarding.';
    } catch (err) {
      localError.value = err instanceof Error ? err.message : 'Nao foi possivel criar condominio';
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
      await props.onRefresh$();
      detail.value = await getCondominiumDetail(props.token, selected.id);
      localNotice.value = 'Condominio arquivado.';
    } catch (err) {
      localError.value = err instanceof Error ? err.message : 'Nao foi possivel arquivar';
    } finally {
      localSaving.value = false;
    }
  });

  const createSubresource$ = $(async (resource: string, form: HTMLFormElement) => {
    if (!selected?.id) {
      return;
    }
    localSaving.value = true;
    localError.value = '';
    localNotice.value = '';
    try {
      const numbersByResource: Record<string, string[]> = {
        blocks: ['floorsCount', 'basementsCount', 'fractionsCount', 'elevatorsCount', 'stairsCount', 'garagesCount'],
        floors: ['fractionsCount'],
        equipment: [],
        contacts: [],
        documents: [],
        media: [],
        notes: []
      };
      const booleansByResource: Record<string, string[]> = {
        contacts: ['isEmergency', 'favorite'],
        media: ['isPrimary'],
        notes: ['pinned']
      };
      const payload = formPayload(form, numbersByResource[resource] ?? [], booleansByResource[resource] ?? []);
      if (resource === 'blocks') {
        await condominiumSubresourceApi.createBlock(props.token, selected.id, payload);
      } else if (resource === 'floors') {
        await condominiumSubresourceApi.createFloor(props.token, selected.id, payload);
      } else if (resource === 'zones') {
        await condominiumSubresourceApi.createZone(props.token, selected.id, payload);
      } else if (resource === 'equipment') {
        await condominiumSubresourceApi.createEquipment(props.token, selected.id, payload);
      } else if (resource === 'contacts') {
        await condominiumSubresourceApi.createContact(props.token, selected.id, payload);
      } else if (resource === 'documents') {
        await condominiumSubresourceApi.createDocument(props.token, selected.id, payload);
      } else if (resource === 'media') {
        await condominiumSubresourceApi.createMedia(props.token, selected.id, payload);
      } else if (resource === 'notes') {
        await condominiumSubresourceApi.createNote(props.token, selected.id, payload);
      }
      detail.value = await getCondominiumDetail(props.token, selected.id);
      await props.onRefresh$();
      form.reset();
      localNotice.value = 'Informacao adicionada.';
    } catch (err) {
      localError.value = err instanceof Error ? err.message : 'Nao foi possivel adicionar informacao';
    } finally {
      localSaving.value = false;
    }
  });

  const uploadCondoDocument$ = $(async (form: HTMLFormElement) => {
    if (!selected?.id) {
      return;
    }
    localSaving.value = true;
    localError.value = '';
    localNotice.value = '';
    try {
      await uploadCondominiumDocument(props.token, selected.id, new FormData(form));
      detail.value = await getCondominiumDetail(props.token, selected.id);
      await props.onRefresh$();
      form.reset();
      localNotice.value = 'Documento carregado na ficha.';
    } catch (err) {
      localError.value = err instanceof Error ? err.message : 'Nao foi possivel carregar documento';
    } finally {
      localSaving.value = false;
    }
  });

  const uploadCondoMedia$ = $(async (form: HTMLFormElement) => {
    if (!selected?.id) {
      return;
    }
    localSaving.value = true;
    localError.value = '';
    localNotice.value = '';
    try {
      const data = new FormData(form);
      if (!data.has('isPrimary')) {
        data.set('isPrimary', 'false');
      }
      await uploadCondominiumMedia(props.token, selected.id, data);
      detail.value = await getCondominiumDetail(props.token, selected.id);
      await props.onRefresh$();
      form.reset();
      localNotice.value = 'Imagem/planta carregada na ficha.';
    } catch (err) {
      localError.value = err instanceof Error ? err.message : 'Nao foi possivel carregar imagem';
    } finally {
      localSaving.value = false;
    }
  });

  const previewImport$ = $(async (form: HTMLFormElement) => {
    localSaving.value = true;
    localError.value = '';
    localNotice.value = '';
    try {
      const data = new FormData(form);
      importPreview.value = await previewCondominiumImport(
        props.token,
        toText(data.get('csv')),
        toText(data.get('delimiter')) || ';'
      );
      localNotice.value = 'Preview de importacao gerado.';
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
    localNotice.value = '';
    try {
      const validRows = importPreview.value.rows.filter((row) => !row.errors.length).map((row) => row.values);
      const result = await commitCondominiumImport(props.token, validRows, true);
      await props.onRefresh$();
      localNotice.value = `${result.created} condominios importados; ${result.skipped} ignorados.`;
      importPreview.value = null;
    } catch (err) {
      localError.value = err instanceof Error ? err.message : 'Nao foi possivel importar';
    } finally {
      localSaving.value = false;
    }
  });

  return (
    <section class="condominiums-workspace">
      <header class="condo-toolbar">
        <div>
          <span class="page-eyebrow">GESTISAC - Condominios</span>
          <h1>Condominios</h1>
          <p>Entidade central para dados administrativos, fisicos, operacionais e historicos.</p>
        </div>
        <div class="condo-toolbar-actions">
          <button type="button" onClick$={() => (importOpen.value = !importOpen.value)}>
            Importar CSV
          </button>
          <button class="primary-action" type="button" onClick$={() => (createOpen.value = !createOpen.value)}>
            Adicionar condominio
          </button>
        </div>
      </header>

      {localError.value ? <div class="app-error glass-panel">{localError.value}</div> : null}
      {localNotice.value ? <div class="app-success glass-panel">{localNotice.value}</div> : null}

      <div class="condo-kpis">
        <Metric label="Ativos" value={String(activeCondominiums)} detail={`${totalFractions} fracoes`} />
        <Metric label="Alertas" value={String(alertCondominiums)} detail="Estados a acompanhar" />
        <Metric label="Manutencao" value={String(maintenanceCondominiums)} detail="Predios com intervencoes" />
        <Metric label="Incompletos" value={String(incompleteCondominiums)} detail="Onboarding por fechar" />
      </div>

      {createOpen.value ? (
        <form
          class="condo-create-panel"
          preventdefault:submit
          onSubmit$={async (event) => createQuick$(event.target as HTMLFormElement)}
        >
          <header>
            <strong>Criar condominio rapido</strong>
            <span>A ficha abre em onboarding para completar depois.</span>
          </header>
          <div class="condo-form-grid">
            <Field name="name" label="Nome" required />
            <Field name="location" label="Localidade" required />
            <Field name="internalCode" label="Codigo interno" />
            <Field name="manager" label="Gestor" value={props.dashboard.user.name} />
            <Field name="condominiumType" label="Tipo" value="residencial" />
            <Field name="status" label="Estado" value="em onboarding" />
            <Field name="fractions" label="Total fracoes" type="number" value="0" />
            <Field name="buildings" label="Blocos" type="number" value="1" />
            <Field name="residents" label="Moradores" type="number" value="0" />
            <Field name="notice" label="Nota inicial" value="Ficha em preenchimento" />
          </div>
          <div class="condo-form-actions">
            <button type="button" onClick$={() => (createOpen.value = false)}>Cancelar</button>
            <button class="primary-action" type="submit" disabled={localSaving.value || props.isSaving}>
              Guardar
            </button>
          </div>
        </form>
      ) : null}

      {importOpen.value ? (
        <form
          class="condo-create-panel"
          preventdefault:submit
          onSubmit$={async (event) => previewImport$(event.target as HTMLFormElement)}
        >
          <header>
            <strong>Importacao CSV</strong>
            <span>Campos esperados: nome, codigoInterno, tipo, estado, rua, localidade, totalFracoes.</span>
          </header>
          <label class="condo-textarea-field">
            <span>CSV</span>
            <textarea
              name="csv"
              rows={7}
              placeholder="nome;codigoInterno;tipo;estado;rua;numero;codigoPostal;localidade;totalFracoes;blocos;elevadores;gestor"
            />
          </label>
          <div class="condo-form-grid narrow">
            <Field name="delimiter" label="Separador" value=";" />
          </div>
          <div class="condo-form-actions">
            <button type="submit" disabled={localSaving.value}>Validar</button>
            <button
              class="primary-action"
              type="button"
              disabled={!importPreview.value || localSaving.value}
              onClick$={commitImport$}
            >
              Importar validos
            </button>
          </div>
          {importPreview.value ? (
            <div class="condo-import-preview">
              <strong>{importPreview.value.validRows}/{importPreview.value.totalRows} linhas validas</strong>
              {importPreview.value.errors.slice(0, 4).map((error) => <span key={error}>{error}</span>)}
            </div>
          ) : null}
        </form>
      ) : null}

      <section class="condo-layout">
        <aside class="condo-list-panel">
          <div class="condo-filter-bar">
            <input
              value={query.value}
              placeholder="Pesquisar por nome, codigo, rua, gestor..."
              onInput$={(event) => (query.value = (event.target as HTMLInputElement).value)}
            />
            <select value={statusFilter.value} onChange$={(event) => (statusFilter.value = (event.target as HTMLSelectElement).value)}>
              <option>Todos</option>
              {Array.from(new Set(props.resources.condominiums.map((item) => item.status))).map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
            <select
              value={operationalFilter.value}
              onChange$={(event) => (operationalFilter.value = (event.target as HTMLSelectElement).value)}
            >
              <option>Todos</option>
              {Array.from(new Set(props.resources.condominiums.map((item) => item.operationalStatus?.generalStatus ?? 'normal'))).map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </div>
          <div class="condo-list-options">
            <label>
              <input
                type="checkbox"
                checked={incompleteOnly.value}
                onChange$={(event) => (incompleteOnly.value = (event.target as HTMLInputElement).checked)}
              />
              Dados incompletos
            </label>
            <div class="segmented-control">
              <button class={viewMode.value === 'cards' ? 'active' : ''} type="button" onClick$={() => (viewMode.value = 'cards')}>
                Cards
              </button>
              <button class={viewMode.value === 'table' ? 'active' : ''} type="button" onClick$={() => (viewMode.value = 'table')}>
                Tabela
              </button>
            </div>
          </div>
          <div class={viewMode.value === 'cards' ? 'condo-card-list' : 'condo-table-list'}>
            {filtered.length ? filtered.map((item) => (
              <button
                class={`condo-list-item ${item.id === selected?.id ? 'active' : ''}`}
                key={item.id}
                type="button"
                onClick$={() => loadDetail$(item.id)}
              >
                <strong>{item.name}</strong>
                <span>{item.internalCode || 'Sem codigo'} - {item.address?.locality || item.location}</span>
                <small>{item.fractions} fracoes · {item.structure?.elevatorsCount ?? 0} elevadores · {localCompleteness(item)}%</small>
              </button>
            )) : (
              <article class="condo-empty-state">
                <strong>Nenhum condominio encontrado</strong>
                <span>Ajusta filtros ou cria o primeiro condominio.</span>
              </article>
            )}
          </div>
        </aside>

        {selected ? (
          <article class="condo-detail-panel">
            <header class="condo-detail-header">
              <div class="condo-building-visual">
                {selected.primaryImageUrl ? (
                  <img src={selected.primaryImageUrl} alt={selected.name} />
                ) : (
                  <span>{selected.name.slice(0, 2).toUpperCase()}</span>
                )}
              </div>
              <div>
                <span class="page-eyebrow">{selected.internalCode || 'Sem codigo'}</span>
                <h2>{selected.name}</h2>
                <p>{selected.address?.street || selected.location} · {selected.manager || 'Sem gestor'}</p>
                <div class="condo-badges">
                  <span>{selected.operationalStatus?.generalStatus ?? selected.status}</span>
                  <span>{selected.operationalStatus?.alertLevel ?? 'verde'}</span>
                  <span>{completeness.percentage}% completo</span>
                </div>
              </div>
              <div class="condo-detail-actions">
                <button type="button" disabled={selected.name === props.dashboard.activeCondominium} onClick$={() => props.onSelectCondominium$(selected.name)}>
                  {selected.name === props.dashboard.activeCondominium ? 'Ativo' : 'Tornar ativo'}
                </button>
                <button type="button" onClick$={archiveSelected$} disabled={localSaving.value}>
                  Arquivar
                </button>
              </div>
            </header>

            <div class="condo-summary-grid">
              <Metric label="Fracoes" value={String(selected.structure?.totalFractions || selected.fractions)} detail="Resumo fisico" />
              <Metric label="Blocos" value={String(selected.structure?.blocksCount || selected.buildings)} detail={`${selected.structure?.floorsAboveGround ?? 0} pisos`} />
              <Metric label="Zonas" value={String(selected.zones?.length ?? 0)} detail="Preparadas para QR" />
              <Metric label="Equip." value={String(selected.equipment?.length ?? 0)} detail="Tecnicos e criticos" />
            </div>

            <nav class="condo-tabs">
              {tabs.map((tab) => (
                <button
                  class={activeTab.value === tab.id ? 'active' : ''}
                  key={tab.id}
                  type="button"
                  onClick$={() => (activeTab.value = tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </nav>

            {activeTab.value === 'overview' ? (
              <section class="condo-tab-panel">
                <div class="condo-completeness">
                  <div>
                    <strong>Ficha {completeness.percentage}% completa</strong>
                    <span>{completeness.completedCategories}/{completeness.totalCategories} categorias fechadas</span>
                  </div>
                  <progress value={completeness.percentage} max="100" />
                </div>
                <div class="condo-missing-grid">
                  {completeness.missingItems.length ? completeness.missingItems.map((item) => (
                    <span key={item}>{item}</span>
                  )) : <span>Ficha completa</span>}
                </div>
                <div class="condo-timeline">
                  {(selected.history ?? []).slice(0, 5).map((event) => (
                    <article key={event.id}>
                      <strong>{event.description}</strong>
                      <span>{event.userName} · {event.timestamp}</span>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}

            {activeTab.value === 'identification' ? (
              <SectionForm title="Identificacao" onSubmit$={(form) => saveSection$('identification', form)}>
                <Field name="name" label="Nome" value={selected.name} />
                <Field name="internalCode" label="Codigo interno" value={selected.internalCode} />
                <Field name="externalReference" label="Referencia externa" value={selected.externalReference} />
                <Field name="condominiumType" label="Tipo" value={selected.condominiumType || 'residencial'} />
                <Field name="subtype" label="Subtipo" value={selected.subtype} />
                <Field name="status" label="Estado" value={selected.status} />
                <Field name="managementStartDate" label="Inicio gestao" value={selected.managementStartDate} />
                <Field name="manager" label="Gestor responsavel" value={selected.manager} />
                <Field name="team" label="Equipa" value={selected.team} />
                <Field name="managementCompany" label="Empresa gestora" value={selected.managementCompany} />
                <Field name="tags" label="Tags" value={selected.tags?.join(', ')} />
                <Field name="administrativeNotes" label="Notas administrativas" value={selected.administrativeNotes} />
              </SectionForm>
            ) : null}

            {activeTab.value === 'address' ? (
              <SectionForm title="Morada e localizacao" onSubmit$={(form) => saveSection$('address', form)}>
                <Field name="street" label="Rua" value={selected.address?.street} />
                <Field name="number" label="Numero" value={selected.address?.number} />
                <Field name="postalCode" label="Codigo postal" value={selected.address?.postalCode} />
                <Field name="locality" label="Localidade" value={selected.address?.locality || selected.location} />
                <Field name="parish" label="Freguesia" value={selected.address?.parish} />
                <Field name="municipality" label="Concelho" value={selected.address?.municipality} />
                <Field name="district" label="Distrito" value={selected.address?.district} />
                <Field name="country" label="Pais" value={selected.address?.country || 'Portugal'} />
                <Field name="latitude" label="Latitude" type="number" value={String(selected.address?.latitude ?? '')} />
                <Field name="longitude" label="Longitude" type="number" value={String(selected.address?.longitude ?? '')} />
                <Field name="googleMapsUrl" label="Google Maps" value={selected.address?.googleMapsUrl} />
                <Field name="accessNotes" label="Notas de acesso" value={selected.address?.accessNotes} />
                <Field name="technicalEntryPoint" label="Entrada tecnica" value={selected.address?.technicalEntryPoint} />
                <Field name="garageEntryPoint" label="Entrada garagem" value={selected.address?.garageEntryPoint} />
              </SectionForm>
            ) : null}

            {activeTab.value === 'structure' ? (
              <SectionForm title="Estrutura fisica" onSubmit$={(form) => saveSection$('structure', form)}>
                <Field name="totalFractions" label="Total fracoes" type="number" value={String(selected.structure?.totalFractions || selected.fractions)} />
                <Field name="residentialFractions" label="Habitacionais" type="number" value={String(selected.structure?.residentialFractions ?? 0)} />
                <Field name="commercialFractions" label="Comerciais" type="number" value={String(selected.structure?.commercialFractions ?? 0)} />
                <Field name="blocksCount" label="Blocos" type="number" value={String(selected.structure?.blocksCount || selected.buildings)} />
                <Field name="entrancesCount" label="Entradas" type="number" value={String(selected.structure?.entrancesCount ?? 0)} />
                <Field name="floorsAboveGround" label="Pisos acima solo" type="number" value={String(selected.structure?.floorsAboveGround ?? 0)} />
                <Field name="basementsCount" label="Caves" type="number" value={String(selected.structure?.basementsCount ?? 0)} />
                <Field name="elevatorsCount" label="Elevadores" type="number" value={String(selected.structure?.elevatorsCount ?? 0)} />
                <Field name="parkingSpacesCount" label="Estacionamentos" type="number" value={String(selected.structure?.parkingSpacesCount ?? 0)} />
                <Field name="constructionYear" label="Ano construcao" type="number" value={String(selected.structure?.constructionYear ?? '')} />
                <Field name="commonAreaEstimate" label="Area comum" value={selected.structure?.commonAreaEstimate} />
                <Toggle name="hasGarden" label="Jardim" checked={selected.structure?.hasGarden} />
                <Toggle name="hasPool" label="Piscina" checked={selected.structure?.hasPool} />
                <Toggle name="hasCctv" label="CCTV" checked={selected.structure?.hasCctv} />
                <Toggle name="hasSecurity" label="Seguranca" checked={selected.structure?.hasSecurity} />
                <Field name="structuralNotes" label="Observacoes estruturais" value={selected.structure?.structuralNotes} />
              </SectionForm>
            ) : null}

            {activeTab.value === 'status' ? (
              <SectionForm title="Estado operacional" onSubmit$={(form) => saveSection$('status', form)}>
                <Field name="generalStatus" label="Estado geral" value={selected.operationalStatus?.generalStatus || 'normal'} />
                <Field name="alertLevel" label="Nivel alerta" value={selected.operationalStatus?.alertLevel || 'verde'} />
                <Field name="summary" label="Resumo" value={selected.operationalStatus?.summary || selected.notice} />
                <Field name="reason" label="Motivo" value={selected.operationalStatus?.reason} />
              </SectionForm>
            ) : null}

            {activeTab.value === 'blocks' ? (
              <SubresourcePanel
                title="Blocos / entradas"
                items={selected.blocksDetailed ?? []}
                labels={['name', 'operationalStatus', 'fractionsCount']}
                onCreate$={(form) => createSubresource$('blocks', form)}
                fields={[
                  ['name', 'Nome'],
                  ['code', 'Codigo'],
                  ['floorsCount', 'Pisos'],
                  ['basementsCount', 'Caves'],
                  ['fractionsCount', 'Fracoes'],
                  ['elevatorsCount', 'Elevadores'],
                  ['operationalStatus', 'Estado'],
                  ['accessNotes', 'Notas acesso']
                ]}
              />
            ) : null}

            {activeTab.value === 'floors' ? (
              <SubresourcePanel
                title="Pisos"
                items={selected.floorsDetailed ?? []}
                labels={['name', 'floorType', 'operationalStatus']}
                onCreate$={(form) => createSubresource$('floors', form)}
                fields={[
                  ['name', 'Nome'],
                  ['number', 'Numero'],
                  ['floorType', 'Tipo'],
                  ['blockId', 'Bloco ID'],
                  ['fractionsCount', 'Fracoes'],
                  ['operationalStatus', 'Estado']
                ]}
              />
            ) : null}

            {activeTab.value === 'zones' ? (
              <SubresourcePanel
                title="Zonas com QR"
                items={selected.zones ?? []}
                labels={['name', 'zoneType', 'operationalStatus', 'publicQrUrl']}
                onCreate$={(form) => createSubresource$('zones', form)}
                fields={[
                  ['name', 'Nome'],
                  ['zoneType', 'Tipo'],
                  ['blockId', 'Bloco ID'],
                  ['floorId', 'Piso ID'],
                  ['internalLocation', 'Localizacao interna'],
                  ['operationalStatus', 'Estado'],
                  ['alertLevel', 'Alerta'],
                  ['technicalNotes', 'Notas tecnicas']
                ]}
              />
            ) : null}

            {activeTab.value === 'equipment' ? (
              <SubresourcePanel
                title="Equipamentos tecnicos"
                items={selected.equipment ?? []}
                labels={['name', 'equipmentType', 'status', 'criticality']}
                onCreate$={(form) => createSubresource$('equipment', form)}
                fields={[
                  ['name', 'Nome'],
                  ['equipmentType', 'Tipo'],
                  ['zoneId', 'Zona ID'],
                  ['brand', 'Marca'],
                  ['model', 'Modelo'],
                  ['serialNumber', 'Serie'],
                  ['maintenanceCompany', 'Manutencao'],
                  ['status', 'Estado'],
                  ['criticality', 'Criticidade'],
                  ['nextMaintenanceDate', 'Proxima manutencao']
                ]}
              />
            ) : null}

            {activeTab.value === 'contacts' ? (
              <SubresourcePanel
                title="Contactos importantes"
                items={selected.contacts ?? []}
                labels={['name', 'contactType', 'phone', 'email']}
                onCreate$={(form) => createSubresource$('contacts', form)}
                fields={[
                  ['name', 'Nome'],
                  ['contactType', 'Tipo'],
                  ['company', 'Empresa'],
                  ['role', 'Funcao'],
                  ['phone', 'Telefone'],
                  ['email', 'Email'],
                  ['schedule', 'Horario'],
                  ['service', 'Servico'],
                  ['priority', 'Prioridade']
                ]}
                toggles={[
                  ['isEmergency', 'Emergencia'],
                  ['favorite', 'Favorito']
                ]}
              />
            ) : null}

            {activeTab.value === 'documents' ? (
              <>
                <FileUploadPanel
                  title="Upload de documento"
                  fileLabel="Ficheiro"
                  onSubmit$={uploadCondoDocument$}
                  fields={[
                    ['title', 'Titulo'],
                    ['documentType', 'Tipo'],
                    ['expiryDate', 'Validade'],
                    ['status', 'Estado'],
                    ['notes', 'Notas']
                  ]}
                />
                <SubresourcePanel
                  title="Documentos do condominio"
                  items={selected.managedDocuments ?? []}
                  labels={['title', 'documentType', 'status', 'expiryDate']}
                  onCreate$={(form) => createSubresource$('documents', form)}
                  fields={[
                    ['title', 'Titulo'],
                    ['documentType', 'Tipo'],
                    ['fileName', 'Ficheiro'],
                    ['fileUrl', 'URL'],
                    ['documentDate', 'Data documento'],
                    ['expiryDate', 'Validade'],
                    ['status', 'Estado'],
                    ['notes', 'Notas']
                  ]}
                />
              </>
            ) : null}

            {activeTab.value === 'media' ? (
              <>
                <FileUploadPanel
                  title="Upload de imagem/planta"
                  fileLabel="Imagem ou PDF"
                  onSubmit$={uploadCondoMedia$}
                  fields={[
                    ['title', 'Titulo'],
                    ['mediaType', 'Tipo'],
                    ['description', 'Descricao']
                  ]}
                  toggles={[['isPrimary', 'Imagem principal']]}
                />
                <SubresourcePanel
                  title="Imagens e plantas"
                  items={selected.media ?? []}
                  labels={['title', 'mediaType', 'fileUrl']}
                  onCreate$={(form) => createSubresource$('media', form)}
                  fields={[
                    ['title', 'Titulo'],
                    ['mediaType', 'Tipo'],
                    ['fileName', 'Ficheiro'],
                    ['fileUrl', 'URL'],
                    ['blockId', 'Bloco ID'],
                    ['floorId', 'Piso ID'],
                    ['zoneId', 'Zona ID'],
                    ['description', 'Descricao']
                  ]}
                  toggles={[['isPrimary', 'Imagem principal']]}
                />
              </>
            ) : null}

            {activeTab.value === 'notes' ? (
              <SubresourcePanel
                title="Notas internas"
                items={selected.internalNotesRegistry ?? []}
                labels={['title', 'noteType', 'priority', 'content']}
                onCreate$={(form) => createSubresource$('notes', form)}
                fields={[
                  ['title', 'Titulo'],
                  ['noteType', 'Tipo'],
                  ['content', 'Conteudo'],
                  ['visibility', 'Visibilidade'],
                  ['priority', 'Prioridade']
                ]}
                toggles={[['pinned', 'Fixar no topo']]}
              />
            ) : null}

            {activeTab.value === 'history' ? (
              <section class="condo-tab-panel">
                <div class="condo-timeline">
                  {(selected.history ?? []).length ? (selected.history ?? []).map((event) => (
                    <article key={event.id}>
                      <strong>{event.description}</strong>
                      <span>{event.eventType} · {event.userName} · {event.timestamp}</span>
                    </article>
                  )) : <span>Sem historico ainda.</span>}
                </div>
              </section>
            ) : null}

            {activeTab.value === 'future' ? (
              <section class="condo-tab-panel">
                <div class="condo-future-grid">
                  <article>
                    <strong>Mapa</strong>
                    <span>{selected.address?.googleMapsUrl || 'Coordenadas e link preparados na morada.'}</span>
                  </article>
                  <article>
                    <strong>QR por zona</strong>
                    <span>{selected.zones?.length ?? 0} zonas prontas para reporte rapido.</span>
                  </article>
                  <article>
                    <strong>Planta 2D</strong>
                    <span>{selected.media?.filter((item) => item.mediaType === 'planta').length ?? 0} plantas associadas.</span>
                  </article>
                  <article>
                    <strong>Digital twin</strong>
                    <span>Campos de zona, piso, equipamento e media preparados.</span>
                  </article>
                </div>
              </section>
            ) : null}
          </article>
        ) : (
          <article class="condo-detail-panel empty">
            <strong>Ainda nao existem condominios</strong>
            <span>Cria o primeiro condominio para abrir a ficha operacional.</span>
          </article>
        )}
      </section>
    </section>
  );
});

export const Metric = component$((props: { label: string; value: string; detail: string }) => (
  <article class="condo-metric">
    <span>{props.label}</span>
    <strong>{props.value}</strong>
    <small>{props.detail}</small>
  </article>
));

export const Field = component$((props: {
  name: string;
  label: string;
  value?: string;
  type?: string;
  required?: boolean;
}) => (
  <label>
    <span>{props.label}</span>
    <input
      name={props.name}
      type={props.type ?? 'text'}
      value={props.value ?? ''}
      required={props.required}
    />
  </label>
));

export const Toggle = component$((props: { name: string; label: string; checked?: boolean }) => (
  <label class="condo-toggle">
    <input name={props.name} type="checkbox" checked={Boolean(props.checked)} />
    <span>{props.label}</span>
  </label>
));

export const SectionForm = component$((props: {
  title: string;
  onSubmit$: PropFunction<(form: HTMLFormElement) => void>;
}) => (
  <form
    class="condo-tab-panel"
    preventdefault:submit
    onSubmit$={(event) => props.onSubmit$(event.target as HTMLFormElement)}
  >
    <header class="condo-section-header">
      <strong>{props.title}</strong>
      <button class="primary-action" type="submit">Guardar</button>
    </header>
    <div class="condo-form-grid">
      <Slot />
    </div>
  </form>
));

export const SubresourcePanel = component$((props: {
  title: string;
  items: Array<Record<string, unknown>>;
  labels: string[];
  fields: Array<[string, string]>;
  toggles?: Array<[string, string]>;
  onCreate$: PropFunction<(form: HTMLFormElement) => void>;
}) => (
  <section class="condo-tab-panel">
    <header class="condo-section-header">
      <strong>{props.title}</strong>
      <span>{props.items.length} registos</span>
    </header>
    <form
      class="condo-inline-create"
      preventdefault:submit
      onSubmit$={(event) => props.onCreate$(event.target as HTMLFormElement)}
    >
      <div class="condo-form-grid">
        {props.fields.map(([name, label]) => (
          <Field key={name} name={name} label={label} type={name.toLowerCase().includes('count') ? 'number' : 'text'} />
        ))}
        {props.toggles?.map(([name, label]) => <Toggle key={name} name={name} label={label} />)}
      </div>
      <button class="primary-action" type="submit">Adicionar</button>
    </form>
    <div class="condo-subresource-list">
      {props.items.length ? props.items.map((item, index) => (
        <article key={String(item.id ?? index)}>
          <strong>{String(item[props.labels[0]] ?? `Registo ${index + 1}`)}</strong>
          <span>
            {props.labels.slice(1).map((label) => String(item[label] ?? '')).filter(Boolean).join(' · ')}
          </span>
        </article>
      )) : (
        <article class="condo-empty-state">
          <strong>Sem registos</strong>
          <span>Adiciona informacao para completar esta area.</span>
        </article>
      )}
    </div>
  </section>
));

export const FileUploadPanel = component$((props: {
  title: string;
  fileLabel: string;
  fields: Array<[string, string]>;
  toggles?: Array<[string, string]>;
  onSubmit$: PropFunction<(form: HTMLFormElement) => void>;
}) => (
  <form
    class="condo-tab-panel condo-file-upload"
    enctype="multipart/form-data"
    preventdefault:submit
    onSubmit$={(event) => props.onSubmit$(event.target as HTMLFormElement)}
  >
    <header class="condo-section-header">
      <strong>{props.title}</strong>
      <button class="primary-action" type="submit">Carregar</button>
    </header>
    <div class="condo-form-grid">
      {props.fields.map(([name, label]) => (
        <Field key={name} name={name} label={label} />
      ))}
      {props.toggles?.map(([name, label]) => <Toggle key={name} name={name} label={label} />)}
      <label>
        <span>{props.fileLabel}</span>
        <input name="file" type="file" required />
      </label>
    </div>
  </form>
));
