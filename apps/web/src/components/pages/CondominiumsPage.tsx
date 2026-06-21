import { $, component$, useSignal, useTask$, type PropFunction } from '@builder.io/qwik';
import {
  archiveCondominium,
  commitCondominiumImport,
  createCondominiumPlanMarker,
  createCondominiumSubresource,
  createResource,
  downloadCondominiumDocument,
  downloadCondominiumMedia,
  getCondominiumDetail,
  previewCondominiumImportFile,
  previewCondominiumImportMapped,
  previewCondominiumImport,
  saveCondominiumDraft,
  uploadCondominiumDocument,
  uploadCondominiumMedia,
  updateCondominiumSection,
  type CondominiumAlert,
  type CompletenessReport,
  type Condominium,
  type CondominiumDetailResponse,
  type ImportFilePreview,
  type ImportPreview,
  type ResourceState
} from '../../lib/api';
import { entityPath, personPath } from '../../lib/entity-navigation';
import { EntityAction } from '../common/EntityAction';
import { SimpleHubCards, type SimpleHubSection } from './SimpleHub';
import {
  AlertsPanel,
  AssetUploadPanel,
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
  focusArea: CondoAreaId | '';
  isSaving: boolean;
  onRefresh$: PropFunction<() => void>;
  navigate$: PropFunction<(path: string) => void>;
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
  'alerts',
  'history',
  'status',
  'notes',
  'future'
] as const;

type TabId = (typeof tabs)[number];

export type CondoAreaId =
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
  alerts: 'Alertas',
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

const CondominiumDetailSkeleton = component$(() => (
  <section class="simple-detail-panel condo-detail-skeleton" aria-label="A carregar detalhe do condominio">
    <header class="simple-detail-header">
      <span class="condo-skeleton-block image" />
      <div>
        <span class="condo-skeleton-line short" />
        <span class="condo-skeleton-line title" />
        <span class="condo-skeleton-line medium" />
      </div>
    </header>
    <section class="condo-summary-grid simple-summary-grid">
      {[0, 1, 2, 3].map((item) => (
        <div class="kpi-card condo-skeleton-card" key={item}>
          <span class="condo-skeleton-line short" />
          <span class="condo-skeleton-line title" />
          <span class="condo-skeleton-line medium" />
        </div>
      ))}
    </section>
    <div class="condo-skeleton-panel">
      <span class="condo-skeleton-line title" />
      <span class="condo-skeleton-line wide" />
      <span class="condo-skeleton-line wide" />
      <span class="condo-skeleton-line medium" />
    </div>
  </section>
));

export const CondominiumsPage = component$((props: CondominiumsPageProps) => {
  const selectedId = useSignal(props.resources.condominiums[0]?.id ?? '');
  const contextId = useSignal('all');
  const activeTab = useSignal<TabId>('overview');
  const activeArea = useSignal<CondoAreaId | ''>('');
  const detailOpen = useSignal(false);
  const creationOpen = useSignal(false);
  const importOpen = useSignal(false);
  const wizardOpen = useSignal(false);
  const wizardStep = useSignal(1);
  const editOpen = useSignal(false);
  const search = useSignal('');
  const statusFilter = useSignal('todos');
  const historySearch = useSignal('');
  const historySource = useSignal('');
  const historyPeriod = useSignal<'all' | '7d' | '30d' | '90d'>('all');
  const contactFilter = useSignal('');
  const contactTypeFilter = useSignal('');
  const emergencyOnly = useSignal(false);
  const documentFilter = useSignal('');
  const documentTypeFilter = useSignal('');
  const documentStatusFilter = useSignal('');
  const blockOrder = useSignal('name');
  const localSaving = useSignal(false);
  const detailLoading = useSignal(false);
  const localError = useSignal('');
  const localNotice = useSignal('');
  const detail = useSignal<CondominiumDetailResponse | null>(null);
  const importPreview = useSignal<ImportPreview | null>(null);
  const importFilePreview = useSignal<ImportFilePreview | null>(null);
  const importMapping = useSignal<Record<string, string>>({});

  const selectedFromDetail = detail.value?.condominium.id === selectedId.value ? detail.value.condominium : undefined;
  const selected =
    selectedFromDetail ??
    props.resources.condominiums.find((item) => item.id === selectedId.value) ??
    props.resources.condominiums[0];
  const contextCondominium =
    contextId.value === 'all'
      ? undefined
      : props.resources.condominiums.find((item) => item.id === contextId.value);
  const contextName = contextCondominium?.name ?? '';
  const isGlobalContext = contextId.value === 'all';
  const completeness = selectedFromDetail ? detail.value!.completeness : localCompleteness(selected);
  const alerts: CondominiumAlert[] = selectedFromDetail ? detail.value!.alerts : localAlerts(selected);
  const showDetailSkeleton = detailLoading.value && detail.value?.condominium.id !== selectedId.value;
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
    return (
      matchesSearch &&
      matchesStatus &&
      !item.archived
    );
  });
  const activeCount = props.resources.condominiums.filter((item) => !item.archived).length;
  const relatedTickets = props.resources.tickets.filter((ticket) =>
    contextName ? ticket.condominium === contextName : true
  );
  const relatedMaintenance = props.resources.maintenance.filter((item) =>
    contextName ? item.condominium === contextName : true
  );
  const relatedResidents = props.resources.residents.filter((resident) =>
    contextName ? resident.condominium === contextName : true
  );
  const relatedCalendarEvents = props.resources.calendarEvents.filter((event) =>
    contextName ? event.condominium === contextName : true
  );
  const historyEvents = filterHistoryPeriod(selected?.history ?? [], historyPeriod.value);

  useTask$(({ track }) => {
    const requestedArea = track(() => props.focusArea);
    activeArea.value = requestedArea;
    detailOpen.value = false;
  });

  const loadDetail$ = $(async (id: string) => {
    if (!id) {
      detail.value = null;
      detailLoading.value = false;
      return;
    }
    if (detail.value?.condominium.id === id) {
      return;
    }
    localError.value = '';
    detailLoading.value = true;
    try {
      detail.value = await getCondominiumDetail(props.token, id);
    } catch (err) {
      localError.value = err instanceof Error ? err.message : 'Nao foi possivel abrir o condominio';
    } finally {
      detailLoading.value = false;
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
    const selectedTemplates = formData
      .getAll('presetEquipment')
      .map((entry) => String(entry).trim())
      .filter(Boolean);
    const customEquipment = String(formData.get('otherEquipment') ?? '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    const equipmentToCreate = [...selectedTemplates, ...customEquipment];
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
        for (const equipmentName of equipmentToCreate) {
          await createCondominiumSubresource(props.token, id, 'equipment', {
            name: equipmentName,
            equipmentType: equipmentName,
            status: 'operacional',
            criticality: 'media'
          });
        }
      }
      localNotice.value = equipmentToCreate.length
        ? `Condominio criado com ${equipmentToCreate.length} equipamentos genericos.`
        : 'Condominio criado em onboarding.';
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

  const previewImportFile$ = $(async (form: HTMLFormElement) => {
    const payload = new FormData(form);
    localSaving.value = true;
    localError.value = '';
    try {
      importFilePreview.value = await previewCondominiumImportFile(props.token, payload);
      importPreview.value = importFilePreview.value.preview;
      importMapping.value = importFilePreview.value.suggestedMapping;
      localNotice.value = 'Preview do ficheiro preparado.';
    } catch (err) {
      localError.value = err instanceof Error ? err.message : 'Nao foi possivel validar ficheiro';
    } finally {
      localSaving.value = false;
    }
  });

  const previewMappedImport$ = $(async () => {
    if (!importFilePreview.value) {
      return;
    }
    localSaving.value = true;
    localError.value = '';
    try {
      importPreview.value = await previewCondominiumImportMapped(
        props.token,
        importFilePreview.value.rows,
        importMapping.value
      );
      localNotice.value = 'Mapeamento validado.';
    } catch (err) {
      localError.value = err instanceof Error ? err.message : 'Nao foi possivel validar mapeamento';
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
      importFilePreview.value = null;
    } catch (err) {
      localError.value = err instanceof Error ? err.message : 'Nao foi possivel importar';
    } finally {
      localSaving.value = false;
    }
  });

  const relatedDocuments = [
    ...props.resources.documents
      .filter((document) => !contextName || document.condominium === contextName)
      .map((document) => ({
      id: document.id,
      title: document.title,
      meta: `${document.type} - ${document.condominium}`,
      status: document.status,
      detail: document.fileName || 'Sem ficheiro associado',
      path: entityPath('document', document.id)
    })),
    ...(!isGlobalContext && selected?.managedDocuments ? selected.managedDocuments : []).map((document) => ({
      id: document.id,
      title: document.title,
      meta: `${document.documentType} - ficha do condominio`,
      status: document.status,
      detail: document.fileName || document.description || 'Documento de condominio',
      path: selected ? entityPath('condominium', selected.id) : ''
    })),
    ...(!isGlobalContext && selected?.media ? selected.media : []).map((media) => ({
      id: media.id,
      title: media.title,
      meta: `${media.mediaType} - imagem/planta`,
      status: media.isPrimary ? 'Imagem principal' : 'Arquivo visual',
      detail: media.fileName || media.description || 'Media associado',
      path: selected ? entityPath('condominium', selected.id) : ''
    }))
  ];
  const condoSections: SimpleHubSection[] = [
    {
      id: 'general',
      title: 'Condominios Geral',
      description: 'Condominios, fracoes e utilizadores ligados por ficha operacional.',
      icon: 'C',
      tone: 'blue',
      count: isGlobalContext ? activeCount : 1,
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
      count: relatedTickets.length
    },
    {
      id: 'inspections',
      title: 'Vistorias',
      description: 'Acompanhamento de verificacoes, pendentes e pontos de estado.',
      icon: 'V',
      tone: 'purple',
      count: relatedMaintenance.length
    },
    {
      id: 'timeline',
      title: 'Time Line',
      description: 'Historico de alteracoes, eventos e momentos do condominio.',
      icon: 'T',
      tone: 'blue',
      count: isGlobalContext ? relatedCalendarEvents.length : selected?.history?.length ?? relatedCalendarEvents.length
    },
    {
      id: 'support',
      title: 'Apoio Cliente/Administradores',
      description: 'Contacto rapido entre utilizadores, administradores e equipa.',
      icon: 'S',
      tone: 'green',
      count: relatedResidents.length
    },
    {
      id: 'tickets',
      title: 'Tickets',
      description: 'Pedidos abertos, seguimento operacional e prioridades.',
      icon: 'K',
      tone: 'gold',
      count: relatedTickets.length
    }
  ];
  const accountExtractRows = relatedResidents.map((user) => {
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
      })}`,
      path: personPath(props.resources, user.name, user.email)
    };
  });

  const uploadAsset$ = $(async (form: HTMLFormElement, kind: 'documents' | 'media') => {
    if (!selected?.id) {
      return;
    }
    const payload = new FormData(form);
    localSaving.value = true;
    localError.value = '';
    localNotice.value = '';
    try {
      if (kind === 'documents') {
        await uploadCondominiumDocument(props.token, selected.id, payload);
      } else {
        await uploadCondominiumMedia(props.token, selected.id, payload);
      }
      form.reset();
      localNotice.value = kind === 'documents' ? 'Documento carregado.' : 'Media carregado.';
      await refreshDetail$();
    } catch (err) {
      localError.value = err instanceof Error ? err.message : 'Nao foi possivel carregar ficheiro';
    } finally {
      localSaving.value = false;
    }
  });

  const downloadAsset$ = $(async (kind: 'documents' | 'media', resourceId: string) => {
    if (!selected?.id) {
      return;
    }
    try {
      const downloaded = kind === 'documents'
        ? await downloadCondominiumDocument(props.token, selected.id, resourceId)
        : await downloadCondominiumMedia(props.token, selected.id, resourceId);
      triggerDownload(downloaded.blob, downloaded.filename);
    } catch (err) {
      localError.value = err instanceof Error ? err.message : 'Download falhou';
    }
  });

  const addPlanMarker$ = $(async (form: HTMLFormElement) => {
    if (!selected?.id) {
      return;
    }
    const data = new FormData(form);
    localSaving.value = true;
    localError.value = '';
    try {
      await createCondominiumPlanMarker(props.token, selected.id, {
        label: text(data, 'label'),
        markerType: 'manual',
        xPercent: numberValue(data, 'xPercent'),
        yPercent: numberValue(data, 'yPercent'),
        notes: text(data, 'notes')
      });
      form.reset();
      localNotice.value = 'Marcador adicionado a planta.';
      await refreshDetail$();
    } catch (err) {
      localError.value = err instanceof Error ? err.message : 'Nao foi possivel adicionar marcador';
    } finally {
      localSaving.value = false;
    }
  });

  const openWizard$ = $(async () => {
    if (selected?.id) {
      detailOpen.value = true;
      activeArea.value = 'general';
      wizardStep.value = selected.onboardingDraft?.currentStep || 1;
      activeTab.value = wizardTab(wizardStep.value);
      await loadDetail$(selected.id);
    }
    wizardOpen.value = true;
  });

  const moveWizard$ = $(async (direction: 1 | -1) => {
    const next = Math.min(12, Math.max(1, wizardStep.value + direction));
    wizardStep.value = next;
    activeTab.value = wizardTab(next);
    if (selected?.id) {
      await saveCondominiumDraft(props.token, selected.id, {
        currentStep: next,
        completedSteps: completedWizardSteps(next),
        isQuickMode: false
      });
    }
  });
  return (
    <section class="condominiums-workspace simple-workspace">
      <header class="condo-hero simple-hero glass-panel">
        <div>
          <span class="page-eyebrow">GESTISAC - Condominios</span>
          <h1>Condominios</h1>
          <p>
            Escolhe primeiro uma area. O contexto atual e {isGlobalContext ? 'Geral, com todos os condominios' : contextName}.
          </p>
        </div>
        <div class="condo-hero-controls">
          <label class="condo-context-picker">
            <span>Contexto</span>
            <select
              value={contextId.value}
              onChange$={(event) => {
                const value = (event.target as HTMLSelectElement).value;
                contextId.value = value;
                if (value !== 'all') {
                  selectedId.value = value;
                }
              }}
            >
              <option value="all">Geral - todos os condominios</option>
              {props.resources.condominiums.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </label>
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
          {!activeArea.value && !editOpen.value ? (
            <button
              class="secondary-action"
              type="button"
              onClick$={openWizard$}
            >
              Wizard 12 passos
            </button>
          ) : null}
          {!activeArea.value && !editOpen.value ? (
            <button
              class="primary-action"
              type="button"
              onClick$={() => {
                if (contextId.value !== 'all') {
                  activeArea.value = 'general';
                  detailOpen.value = true;
                  activeTab.value = 'identification';
                } else {
                  editOpen.value = true;
                }
              }}
            >
              Editar
            </button>
          ) : null}
          {editOpen.value && contextId.value === 'all' ? (
            <button
              class="secondary-action"
              type="button"
              onClick$={() => editOpen.value = false}
            >
              Cancelar
            </button>
          ) : null}
        </div>
      </header>

      {localError.value ? <div class="app-error glass-panel">{localError.value}</div> : null}
      {localNotice.value ? <div class="app-success glass-panel">{localNotice.value}</div> : null}

      {wizardOpen.value ? (
        <section class="condo-modal-backdrop" role="dialog" aria-modal="true" aria-label="Wizard de condominio">
          <div class="condo-wizard-modal glass-panel">
            <header class="condo-wizard-header">
              <div>
                <small>Passo {wizardStep.value} de 12</small>
                <h2>{wizardSteps[wizardStep.value - 1]?.title}</h2>
                <p>{wizardSteps[wizardStep.value - 1]?.detail}</p>
              </div>
              <button class="secondary-action" type="button" onClick$={() => (wizardOpen.value = false)}>Fechar</button>
            </header>
            <nav class="condo-wizard-rail" aria-label="Passos do wizard">
              {wizardSteps.map((step) => (
                <button
                  key={step.step}
                  class={wizardStep.value === step.step ? 'active' : ''}
                  type="button"
                  onClick$={() => {
                    wizardStep.value = step.step;
                    activeTab.value = wizardTab(step.step);
                    detailOpen.value = true;
                    activeArea.value = 'general';
                  }}
                >
                  {step.step}
                </button>
              ))}
            </nav>
            {selected ? (
              <div class="condo-wizard-body">
                {wizardStep.value === 1 ? (
                  <SectionEditor title="Identificacao" fields={identificationFields} values={selected} isSaving={localSaving.value} onSubmit$={async (form) => submitSection$(form, 'identification', identificationFields)} />
                ) : null}
                {wizardStep.value === 2 ? (
                  <SectionEditor title="Morada" fields={addressFields} values={selected.address} isSaving={localSaving.value} onSubmit$={async (form) => submitSection$(form, 'address', addressFields)} />
                ) : null}
                {wizardStep.value === 3 ? (
                  <SectionEditor title="Estrutura" fields={structureFields} values={selected.structure} isSaving={localSaving.value} onSubmit$={async (form) => submitSection$(form, 'structure', structureFields)} />
                ) : null}
                {wizardStep.value >= 4 && wizardStep.value <= 9 ? (
                  <SubresourcePanel
                    title={wizardSteps[wizardStep.value - 1]!.title}
                    resource={wizardResource(wizardStep.value)}
                    fields={fieldsForSubresource(wizardTab(wizardStep.value))}
                    rows={rowsForSubresource(selected, wizardTab(wizardStep.value))}
                    orderMode={blockOrder.value}
                    isSaving={localSaving.value}
                    onOrderChange$={(value) => (blockOrder.value = value)}
                    onSubmit$={async (form, resource, fields) => submitSubresource$(form, resource, fields)}
                  />
                ) : null}
                {wizardStep.value === 10 ? (
                  <div class="condo-wizard-stack">
                    <AssetUploadPanel kind="documents" isSaving={localSaving.value} onUpload$={uploadAsset$} />
                    <AssetUploadPanel kind="media" isSaving={localSaving.value} onUpload$={uploadAsset$} />
                  </div>
                ) : null}
                {wizardStep.value === 11 ? (
                  <div class="condo-wizard-stack">
                    <SectionEditor title="Estado operacional" fields={statusFields} values={selected.operationalStatus} isSaving={localSaving.value} onSubmit$={async (form) => submitSection$(form, 'operational-status', statusFields)} />
                    <SubresourcePanel title="Notas internas" resource="notes" fields={subresourceFields.notes} rows={selected.internalNotesRegistry ?? []} isSaving={localSaving.value} onSubmit$={async (form, resource, fields) => submitSubresource$(form, resource, fields)} />
                  </div>
                ) : null}
                {wizardStep.value === 12 ? (
                  <div class="condo-wizard-stack">
                    <Overview selected={selected} completeness={completeness} />
                    <AlertsPanel alerts={alerts} />
                  </div>
                ) : null}
              </div>
            ) : (
              <article class="simple-empty-state">
                <strong>Cria primeiro um condominio</strong>
                <span>O wizard continua assim que existir uma ficha para completar.</span>
              </article>
            )}
            <footer class="condo-wizard-footer">
              <button type="button" onClick$={() => moveWizard$(-1)} disabled={wizardStep.value === 1}>Anterior</button>
              <button type="button" onClick$={() => moveWizard$(1)} disabled={wizardStep.value === 12}>Seguinte</button>
              <button class="primary-action" type="button" onClick$={saveDraft$} disabled={!selected || localSaving.value}>Guardar rascunho</button>
            </footer>
          </div>
        </section>
      ) : null}

      {editOpen.value && contextId.value === 'all' ? (
        <section class="simple-record-list">
          <strong>Escolhe um condominio para editar</strong>
          {filtered.length ? filtered.map((item) => (
            <article class="simple-record-card" key={item.id}>
              <div>
                <strong>{item.name}</strong>
                <span>{item.internalCode || 'sem codigo'} - {item.address?.locality || item.location || 'localidade por completar'}</span>
              </div>
              <p>{item.structure?.totalFractions || item.fractions} fracoes - {item.structure?.blocksCount || item.buildings} blocos</p>
              <small>{localCompleteness(item).percentage}% completo</small>
              <div class="simple-card-actions">
                <button
                  class="primary-action"
                  type="button"
                  onClick$={() => {
                    selectedId.value = item.id;
                    contextId.value = item.id;
                    editOpen.value = false;
                    activeTab.value = 'identification';
                    detailOpen.value = true;
                  }}
                >
                  Editar
                </button>
                <button
                  class="secondary-action"
                  type="button"
                  onClick$={async () => {
                    if (confirm('Tem a certeza que deseja arquivar este condominio?')) {
                      selectedId.value = item.id;
                      await archiveSelected$();
                    }
                  }}
                >
                  Arquivar
                </button>
              </div>
            </article>
          )) : (
            <article class="simple-empty-state">
              <strong>Sem condominios disponiveis.</strong>
              <span>Cria um novo condominio primeiro.</span>
            </article>
          )}
        </section>
      ) : !activeArea.value && !editOpen.value ? (
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
                    class="primary-action condo-cta-secondary"
                    type="button"
                    onClick$={() => {
                      search.value = contextName;
                    }}
                  >
                    Extrato de Conta
                  </button>
                  <button
                    class="primary-action condo-cta-main"
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
                  onSubmit$={async (event) => submitQuickCreate$(event.currentTarget as HTMLFormElement)}
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
                  <fieldset class="condo-equipment-presets">
                    <legend>Equipamentos base (predefinidos)</legend>
                    <label><input type="checkbox" name="presetEquipment" value="Elevador" /> Elevador</label>
                    <label><input type="checkbox" name="presetEquipment" value="Portao garagem" /> Portao garagem</label>
                    <label><input type="checkbox" name="presetEquipment" value="Bomba de agua" /> Bomba de agua</label>
                    <label><input type="checkbox" name="presetEquipment" value="CCTV" /> CCTV</label>
                    <label><input type="checkbox" name="presetEquipment" value="Intercomunicador" /> Intercomunicador</label>
                    <label><input type="checkbox" name="presetEquipment" value="Detecao incendio" /> Deteccao incendio</label>
                    <label><input type="checkbox" name="presetEquipment" value="Iluminacao emergencia" /> Iluminacao emergencia</label>
                    <label><input type="checkbox" name="presetEquipment" value="Gerador" /> Gerador</label>
                  </fieldset>
                  <label class="condo-other-equipment">
                    <span>Outros (separados por virgula)</span>
                    <input name="otherEquipment" placeholder="Ex: Painel solar, Sistema de rega" />
                  </label>
                  <button class="primary-action" type="submit" disabled={props.isSaving || localSaving.value}>
                    Criar
                  </button>
                </form>
              ) : null}

              {importOpen.value ? (
                <form
                  class="simple-form-panel"
                  preventdefault:submit
                  onSubmit$={async (event) => previewImport$(event.currentTarget as HTMLFormElement)}
                >
                  <strong>Importar CSV</strong>
                  <label>
                    <span>Ficheiro CSV ou Excel</span>
                    <input name="file" type="file" accept=".csv,.txt,.xlsx" />
                  </label>
                  <div class="condo-inline-actions">
                    <button type="button" onClick$={async (event) => previewImportFile$((event.target as HTMLElement).closest('form') as HTMLFormElement)} disabled={localSaving.value}>
                      Validar ficheiro
                    </button>
                  </div>
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
                  {importFilePreview.value ? (
                    <div class="condo-import-mapping">
                      <strong>Mapeamento de colunas</strong>
                      {importTargets.map((target) => (
                        <label key={target.key}>
                          <span>{target.label}</span>
                          <select
                            value={importMapping.value[target.key] || ''}
                            onChange$={(event) => {
                              importMapping.value = {
                                ...importMapping.value,
                                [target.key]: (event.target as HTMLSelectElement).value
                              };
                            }}
                          >
                            <option value="">Sem coluna</option>
                            {importFilePreview.value!.headers.map((header) => (
                              <option key={header} value={header}>{header}</option>
                            ))}
                          </select>
                        </label>
                      ))}
                      <button type="button" onClick$={previewMappedImport$} disabled={localSaving.value}>Validar mapeamento</button>
                    </div>
                  ) : null}
                </form>
              ) : null}

              <div class="simple-search-row condo-filter-grid">
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
              <small class="condo-helper-note">
                Para gerir equipamentos: abre o condominio e entra na aba <strong>Equipamentos</strong>.
              </small>

              <section class="simple-detail-panel compact">
                <strong>Extrato de Conta dos utilizadores</strong>
                <span>Seleciona um condominio e confirma sempre a cadeia Condominio {'>'} Fracao {'>'} Utilizador.</span>
                <div class="simple-record-list">
                  {accountExtractRows.map((row) => (
                    <EntityAction class="simple-record-card" key={row.id} path={row.path} navigate$={props.navigate$}>
                      <div>
                        <strong>{row.name}</strong>
                        <span>{row.condominium} - fracao {row.fraction}</span>
                      </div>
                      <p>{row.detail}</p>
                      <small>{row.status}</small>
                    </EntityAction>
                  ))}
                </div>
              </section>

              <div class="condo-command-center">
                <div class="condo-record-grid">
                  <div class="condo-record-head">
                    <span>Condominio</span>
                    <span>Localidade</span>
                    <span>Estrutura</span>
                    <span>Estado</span>
                  </div>
                  {filtered.length ? filtered.map((item) => (
                    <button
                      type="button"
                      class={item.id === selected?.id && detailOpen.value ? 'condo-record-row active' : 'condo-record-row'}
                      key={item.id}
                      onClick$={() => {
                        selectedId.value = item.id;
                        contextId.value = item.id;
                        detailOpen.value = true;
                        activeTab.value = 'overview';
                      }}
                    >
                      <span class="condo-record-primary">
                        <strong>{item.name}</strong>
                        <small>{item.internalCode || 'sem codigo'}</small>
                      </span>
                      <span>{item.address?.locality || item.location || 'localidade por completar'}</span>
                      <span>
                        {(item.structure?.totalFractions || item.fractions)} fracoes - {(item.structure?.blocksCount || item.buildings)} blocos
                      </span>
                      <span class="condo-record-status">
                        <strong>{localCompleteness(item).percentage}%</strong>
                        <small>{item.operationalStatus?.generalStatus || item.status}</small>
                      </span>
                    </button>
                  )) : (
                    <article class="simple-empty-state">
                      <strong>Sem condominios para estes filtros.</strong>
                      <span>Limpa a pesquisa ou adiciona um novo condominio.</span>
                    </article>
                  )}
                </div>

                {selected && detailOpen.value && showDetailSkeleton ? <CondominiumDetailSkeleton /> : null}

                {selected && detailOpen.value && !showDetailSkeleton ? (
                  <section class="simple-detail-panel condo-command-panel">
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

                  <div class="simple-header-actions">
                    <button
                      class="primary-action"
                      type="button"
                      onClick$={() => props.navigate$(entityPath('condominium', selected.id))}
                    >
                      Abrir
                    </button>
                    <button
                      class="secondary-action"
                      type="button"
                      onClick$={() => (activeTab.value = 'equipment')}
                    >
                      Equipamentos
                    </button>
                    <button
                      class="secondary-action"
                      type="button"
                      onClick$={() => (activeTab.value = 'documents')}
                    >
                      Documentacao
                    </button>
                    <button
                      class="secondary-action"
                      type="button"
                      onClick$={() => {
                        activeArea.value = 'avarias';
                        detailOpen.value = true;
                      }}
                    >
                      Avarias
                    </button>
                  </div>

                  <section class="condo-context-grid">
                    <article class="condo-context-card">
                      <span>Pedidos</span>
                      <strong>{relatedTickets.length}</strong>
                      <small>Ocorrencias ligadas</small>
                    </article>
                    <article class="condo-context-card">
                      <span>Manutencao</span>
                      <strong>{relatedMaintenance.length}</strong>
                      <small>Intervencoes em aberto</small>
                    </article>
                    <article class="condo-context-card">
                      <span>Agenda</span>
                      <strong>{relatedCalendarEvents.length}</strong>
                      <small>Eventos associados</small>
                    </article>
                    <article class="condo-context-card">
                      <span>Utilizadores</span>
                      <strong>{relatedResidents.length}</strong>
                      <small>Residentes ligados</small>
                    </article>
                  </section>

                  <div class="condo-context-links">
                    <button class="secondary-action" type="button" onClick$={() => (activeArea.value = 'documentation')}>
                      Documentacao
                    </button>
                    <button class="secondary-action" type="button" onClick$={() => (activeArea.value = 'avarias')}>
                      Pedidos
                    </button>
                    <button class="secondary-action" type="button" onClick$={() => (activeArea.value = 'timeline')}>
                      Timeline
                    </button>
                    <button class="secondary-action" type="button" onClick$={() => (activeArea.value = 'support')}>
                      Suporte
                    </button>
                  </div>

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
                  {activeTab.value === 'alerts' ? <AlertsPanel alerts={alerts} /> : null}
                  {activeTab.value === 'history' ? (
                    <section class="condo-filtered-panel">
                      <div class="simple-search-row condo-filter-grid">
                        <input value={historySearch.value} placeholder="Filtrar historico..." onInput$={(event) => (historySearch.value = (event.target as HTMLInputElement).value)} />
                        <input value={historySource.value} placeholder="Fonte ou entidade..." onInput$={(event) => (historySource.value = (event.target as HTMLInputElement).value)} />
                        <select value={historyPeriod.value} onChange$={(event) => (historyPeriod.value = (event.target as HTMLSelectElement).value as 'all' | '7d' | '30d' | '90d')}>
                          <option value="all">Todo o historico</option>
                          <option value="7d">Ultimos 7 dias</option>
                          <option value="30d">Ultimos 30 dias</option>
                          <option value="90d">Ultimos 90 dias</option>
                        </select>
                      </div>
                      <History events={historyEvents} query={historySearch.value} source={historySource.value} />
                    </section>
                  ) : null}
                  {activeTab.value === 'future' ? <FuturePanel selected={selected} markers={selected.planMarkers ?? []} onAddMarker$={addPlanMarker$} /> : null}
                  {activeTab.value === 'documents' ? <AssetUploadPanel kind="documents" isSaving={localSaving.value} onUpload$={uploadAsset$} /> : null}
                  {activeTab.value === 'media' ? <AssetUploadPanel kind="media" isSaving={localSaving.value} onUpload$={uploadAsset$} /> : null}
                  {activeTab.value === 'documents' ? (
                    <div class="simple-search-row condo-filter-grid">
                      <input value={documentFilter.value} placeholder="Filtrar documentos por titulo, tipo ou estado..." onInput$={(event) => (documentFilter.value = (event.target as HTMLInputElement).value)} />
                      <input value={documentTypeFilter.value} placeholder="Tipo (seguro, ata, regulamento...)" onInput$={(event) => (documentTypeFilter.value = (event.target as HTMLInputElement).value)} />
                      <input value={documentStatusFilter.value} placeholder="Estado (ativo, expirado, em revisao...)" onInput$={(event) => (documentStatusFilter.value = (event.target as HTMLInputElement).value)} />
                    </div>
                  ) : null}
                  {activeTab.value === 'contacts' ? (
                    <div class="simple-search-row condo-filter-grid">
                      <input value={contactFilter.value} placeholder="Filtrar contactos por nome, empresa ou servico..." onInput$={(event) => (contactFilter.value = (event.target as HTMLInputElement).value)} />
                      <input value={contactTypeFilter.value} placeholder="Tipo (gestor, emergencia, tecnico...)" onInput$={(event) => (contactTypeFilter.value = (event.target as HTMLInputElement).value)} />
                      <label class="condo-inline-field">
                        <span>So emergencia</span>
                        <input type="checkbox" checked={emergencyOnly.value} onChange$={(event) => (emergencyOnly.value = (event.target as HTMLInputElement).checked)} />
                      </label>
                    </div>
                  ) : null}
                  {subresourceTab(activeTab.value) ? (
                    <SubresourcePanel
                      title={tabLabels[activeTab.value]}
                      resource={subresourceTab(activeTab.value)!}
                      fields={fieldsForSubresource(activeTab.value)}
                      rows={rowsForSubresource(selected, activeTab.value, {
                        documentFilter: documentFilter.value,
                        documentTypeFilter: documentTypeFilter.value,
                        documentStatusFilter: documentStatusFilter.value,
                        contactFilter: contactFilter.value,
                        contactTypeFilter: contactTypeFilter.value,
                        emergencyOnly: emergencyOnly.value,
                        blockOrder: blockOrder.value
                      })}
                      orderMode={blockOrder.value}
                      isSaving={localSaving.value}
                      onOrderChange$={(value) => (blockOrder.value = value)}
                      onDownload$={downloadAsset$}
                      onSubmit$={async (form, resource, fields) => submitSubresource$(form, resource, fields)}
                    />
                  ) : null}
                  </section>
                ) : (
                  <section class="simple-detail-panel condo-command-panel empty">
                    <strong>Seleciona um condominio</strong>
                    <span>O painel contextual mostra completude, relacoes e acoes do item escolhido.</span>
                  </section>
                )}
              </div>
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
                      <button class="primary-action" type="button" onClick$={() => props.navigate$(entityPath('report', report.id))}>Abrir</button>
                      <details class="simple-more-menu">
                        <summary>Mais</summary>
                        <button type="button" onClick$={() => props.navigate$('/relatorios')}>Ir para Relatorios</button>
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
                    <>
                    <AssetUploadPanel kind="media" isSaving={localSaving.value} onUpload$={uploadAsset$} />
                    <SubresourcePanel
                      title="Imagens e plantas"
                      resource="media"
                      fields={subresourceFields.media}
                      rows={selected.media ?? []}
                      isSaving={localSaving.value}
                      onDownload$={downloadAsset$}
                      onSubmit$={async (form, resource, fields) => submitSubresource$(form, resource, fields)}
                    />
                    </>
                  ) : (
                    <>
                    <AssetUploadPanel kind="documents" isSaving={localSaving.value} onUpload$={uploadAsset$} />
                    <SubresourcePanel
                      title="Documentos"
                      resource="documents"
                      fields={subresourceFields.documents}
                      rows={selected.managedDocuments ?? []}
                      isSaving={localSaving.value}
                      onDownload$={downloadAsset$}
                      onSubmit$={async (form, resource, fields) => submitSubresource$(form, resource, fields)}
                    />
                    </>
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
                      <button class="primary-action" type="button" onClick$={() => props.navigate$(document.path)}>Abrir</button>
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
                <button class="primary-action" type="button" onClick$={() => props.navigate$('/tickets')}>Abrir Tickets</button>
              </header>
              <div class="simple-record-list">
                {relatedTickets.length ? relatedTickets.map((ticket) => (
                  <article class="simple-record-card" key={ticket.id}>
                    <div>
                      <strong>{ticket.title}</strong>
                      <span>{ticket.condominium}</span>
                    </div>
                    <p>{ticket.status} - {ticket.updatedAt}</p>
                    <small>{ticket.priority}</small>
                    <div class="simple-card-actions">
                      <button class="primary-action" type="button" onClick$={() => props.navigate$(entityPath('ticket', ticket.id))}>Abrir</button>
                      <details class="simple-more-menu">
                        <summary>Mais</summary>
                        <button type="button" onClick$={() => props.navigate$('/tickets')}>Gerir no modulo Tickets</button>
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
                {relatedMaintenance.length ? relatedMaintenance.map((item) => (
                  <EntityAction class="simple-record-card" key={item.id} path={entityPath('maintenance', item.id)} navigate$={props.navigate$}>
                    <div>
                      <strong>{item.title}</strong>
                      <span>{item.supplier}</span>
                    </div>
                    <p>Vistoria ou manutencao prevista para {item.date}</p>
                    <small>{item.status}</small>
                  </EntityAction>
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
              {isGlobalContext ? (
                <div class="simple-record-list">
                  {relatedCalendarEvents.length ? relatedCalendarEvents.map((event) => (
                    <article class="simple-record-card" key={event.id}>
                      <div>
                        <strong>{event.title}</strong>
                        <span>{event.condominium} - {event.eventType}</span>
                      </div>
                      <p>{event.startAt} - {event.status}</p>
                      <small>{event.linkedEntityType || 'Evento'}</small>
                      <div class="simple-card-actions">
                        <button class="primary-action" type="button" onClick$={() => props.navigate$(entityPath('calendarEvent', event.id))}>Abrir</button>
                      </div>
                    </article>
                  )) : (
                    <article class="simple-empty-state">
                      <strong>Sem eventos globais.</strong>
                      <span>O calendario vai preencher esta timeline operacional.</span>
                    </article>
                  )}
                </div>
              ) : selected ? (
                <section class="simple-detail-panel compact">
                  <strong>{selected.name}</strong>
                  <span>{shortAddress(selected)}</span>
                  <History events={selected.history ?? []} />
                  <div class="condo-timeline">
                    {relatedCalendarEvents.map((event) => (
                      <EntityAction class="condo-timeline-row" key={event.id} path={entityPath('calendarEvent', event.id)} navigate$={props.navigate$}>
                        <strong>{event.title}</strong>
                        <span>{event.eventType} - {event.status}</span>
                        <small>{event.startAt}</small>
                      </EntityAction>
                    ))}
                  </div>
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
                {relatedResidents.length ? relatedResidents.map((user) => (
                  <EntityAction class="simple-record-card" key={user.id} path={personPath(props.resources, user.name, user.email)} navigate$={props.navigate$}>
                    <div>
                      <strong>{user.name}</strong>
                      <span>{user.email} - {user.phone}</span>
                    </div>
                    <p>{user.condominium} - fracao {user.fraction}</p>
                    <small>{user.status}</small>
                  </EntityAction>
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
                <button class="primary-action" type="button" onClick$={() => props.navigate$('/tickets')}>Abrir modulo Tickets</button>
              </header>
              <div class="simple-record-list">
                {relatedTickets.length ? relatedTickets.map((ticket) => (
                  <article class="simple-record-card" key={ticket.id}>
                    <div>
                      <strong>{ticket.title}</strong>
                      <span>{ticket.condominium}</span>
                    </div>
                    <p>{ticket.detail || ticket.status} - {ticket.updatedAt}</p>
                    <small>{ticket.priority}</small>
                    <div class="simple-card-actions">
                      <button class="primary-action" type="button" onClick$={() => props.navigate$(entityPath('ticket', ticket.id))}>Abrir</button>
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

const wizardSteps = [
  { step: 1, title: 'Identificacao', detail: 'Dados administrativos e equipa responsavel.' },
  { step: 2, title: 'Morada', detail: 'Localizacao, coordenadas e acessos.' },
  { step: 3, title: 'Estrutura', detail: 'Fracoes, blocos, pisos e atributos fisicos.' },
  { step: 4, title: 'Blocos', detail: 'Entradas, blocos e notas operacionais.' },
  { step: 5, title: 'Pisos', detail: 'Pisos ligados aos blocos.' },
  { step: 6, title: 'Zonas', detail: 'Zonas comuns com QR e estado.' },
  { step: 7, title: 'Equipamentos', detail: 'Equipamentos tecnicos e criticidade.' },
  { step: 8, title: 'Contactos', detail: 'Contactos uteis e emergencia.' },
  { step: 9, title: 'Notas', detail: 'Notas internas com visibilidade.' },
  { step: 10, title: 'Documentos e media', detail: 'Upload real de documentos, imagens e plantas.' },
  { step: 11, title: 'Estado', detail: 'Estado operacional e notas finais.' },
  { step: 12, title: 'Revisao', detail: 'Completude, alertas e revisao antes de fechar.' }
];

const importTargets = [
  { key: 'name', label: 'Nome' },
  { key: 'internalCode', label: 'Codigo interno' },
  { key: 'condominiumType', label: 'Tipo' },
  { key: 'status', label: 'Estado' },
  { key: 'street', label: 'Rua' },
  { key: 'number', label: 'Numero' },
  { key: 'postalCode', label: 'Codigo postal' },
  { key: 'locality', label: 'Localidade' },
  { key: 'totalFractions', label: 'Total fracoes' },
  { key: 'blocksCount', label: 'Blocos' },
  { key: 'elevatorsCount', label: 'Elevadores' },
  { key: 'manager', label: 'Gestor' },
  { key: 'notes', label: 'Notas' }
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
  'plan-markers': [
    { name: 'label', label: 'Etiqueta' },
    { name: 'markerType', label: 'Tipo' },
    { name: 'xPercent', label: 'X %', kind: 'number' },
    { name: 'yPercent', label: 'Y %', kind: 'number' },
    { name: 'zoneId', label: 'Zona ID' },
    { name: 'equipmentId', label: 'Equipamento ID' },
    { name: 'notes', label: 'Notas', kind: 'textarea' }
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

function rowsForSubresource(
  selected: Condominium,
  tab: TabId,
  filters: {
    documentFilter?: string;
    documentTypeFilter?: string;
    documentStatusFilter?: string;
    contactFilter?: string;
    contactTypeFilter?: string;
    emergencyOnly?: boolean;
    blockOrder?: string;
  } = {}
): Array<Record<string, unknown>> {
  let rows: Array<Record<string, unknown>>;
  switch (tab) {
    case 'blocks':
      rows = selected.blocksDetailed ?? [];
      break;
    case 'floors':
      rows = selected.floorsDetailed ?? [];
      break;
    case 'zones':
      rows = selected.zones ?? [];
      break;
    case 'equipment':
      rows = selected.equipment ?? [];
      break;
    case 'contacts':
      rows = selected.contacts ?? [];
      break;
    case 'documents':
      rows = selected.managedDocuments ?? [];
      break;
    case 'media':
      rows = selected.media ?? [];
      break;
    case 'notes':
      rows = selected.internalNotesRegistry ?? [];
      break;
    default:
      rows = [];
  }

  if (tab === 'contacts' && filters.contactFilter) {
    rows = rows.filter((row) => Object.values(row).some(v => String(v).toLowerCase().includes(filters.contactFilter!.toLowerCase())));
  }
  if (tab === 'contacts' && filters.contactTypeFilter) {
    rows = rows.filter((row) => String(row.contactType ?? '').toLowerCase().includes(filters.contactTypeFilter!.toLowerCase()));
  }
  if (tab === 'contacts' && filters.emergencyOnly) {
    rows = rows.filter((row) => Boolean(row.isEmergency));
  }
  if (tab === 'documents' && filters.documentFilter) {
    rows = rows.filter((row) => Object.values(row).some(v => String(v).toLowerCase().includes(filters.documentFilter!.toLowerCase())));
  }
  if (tab === 'documents' && filters.documentTypeFilter) {
    rows = rows.filter((row) => String(row.documentType ?? '').toLowerCase().includes(filters.documentTypeFilter!.toLowerCase()));
  }
  if (tab === 'documents' && filters.documentStatusFilter) {
    rows = rows.filter((row) => String(row.status ?? '').toLowerCase().includes(filters.documentStatusFilter!.toLowerCase()));
  }
  if (tab === 'blocks') {
    const key = filters.blockOrder === 'code' ? 'code' : filters.blockOrder === 'status' ? 'operationalStatus' : 'name';
    rows = [...rows].sort((a, b) => String(a[key] ?? '').localeCompare(String(b[key] ?? ''), 'pt'));
  }
  return rows;
}

function filterHistoryPeriod(
  events: Array<Record<string, unknown>>,
  period: 'all' | '7d' | '30d' | '90d'
): Array<Record<string, unknown>> {
  if (period === 'all') {
    return events;
  }
  const dayWindow = period === '7d' ? 7 : period === '30d' ? 30 : 90;
  const now = Date.now();
  const maxAge = dayWindow * 24 * 60 * 60 * 1000;
  return events.filter((event) => {
    const raw = String(event.timestamp ?? event.createdAt ?? '').trim();
    if (!raw) {
      return false;
    }
    const parsed = Date.parse(raw);
    if (!Number.isFinite(parsed)) {
      return false;
    }
    return now - parsed <= maxAge;
  });
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

function wizardTab(step: number): TabId {
  const map: Record<number, TabId> = {
    1: 'identification',
    2: 'address',
    3: 'structure',
    4: 'blocks',
    5: 'floors',
    6: 'zones',
    7: 'equipment',
    8: 'contacts',
    9: 'notes',
    10: 'documents',
    11: 'status',
    12: 'overview'
  };
  return map[step] ?? 'overview';
}

function wizardResource(step: number): SubresourceName {
  const tab = wizardTab(step);
  return subresourceTab(tab) ?? 'blocks';
}

function completedWizardSteps(current: number): number[] {
  return Array.from({ length: current }, (_, index) => index + 1);
}

function localAlerts(item?: Condominium): CondominiumAlert[] {
  if (!item) {
    return [];
  }
  const alerts: CondominiumAlert[] = [];
  const completeness = localCompleteness(item);
  if (!completeness.complete) {
    alerts.push({
      id: `${item.id}-completude`,
      severity: 'warning',
      category: 'completude',
      title: 'Ficha incompleta',
      detail: completeness.missingItems.slice(0, 3).join(', '),
      entityId: item.id
    });
  }
  for (const document of item.managedDocuments ?? []) {
    if (document.expiryDate && document.expiryDate < new Date().toISOString().slice(0, 10)) {
      alerts.push({
        id: `${document.id}-expired`,
        severity: 'critical',
        category: 'documentos',
        title: 'Documento expirado',
        detail: document.title,
        entityId: document.id,
        dueDate: document.expiryDate
      });
    }
  }
  return alerts;
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
