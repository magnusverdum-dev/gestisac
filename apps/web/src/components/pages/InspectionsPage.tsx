import { component$, useSignal, type PropFunction } from '@builder.io/qwik';
import { EditIcon, FileTextIcon, MoreHorizontalIcon, PlusIcon, SearchIcon, Trash2Icon } from 'lucide-qwik';
import type {
  AppContext,
  GenerateDocumentPayload,
  InspectionItem,
  ResourceEndpoint,
  ResourceState
} from '../../lib/api';
import { condominiumPath, entityPath } from '../../lib/entity-navigation';
import { EntityAction } from '../common/EntityAction';

type InspectionsPageProps = {
  appContext: AppContext;
  resources: ResourceState;
  isSaving: boolean;
  navigate$: PropFunction<(path: string) => void>;
  onCreate$: PropFunction<(resource: ResourceEndpoint, payload: Record<string, unknown>) => void>;
  onUpdate$: PropFunction<(resource: ResourceEndpoint, id: string, payload: Record<string, unknown>) => void>;
  onDelete$: PropFunction<(resource: ResourceEndpoint, id: string) => void>;
  onGenerateDocument$: PropFunction<(payload: GenerateDocumentPayload) => void>;
};

const STATUS_OPTIONS = ['Todos', 'Planeada', 'Submetida', 'Confirmada', 'Rejeitada'];
const RESULT_OPTIONS = ['Pendente', 'Conforme', 'Nao conforme', 'A rever HQ'];

export const InspectionsPage = component$((props: InspectionsPageProps) => {
  const search = useSignal('');
  const statusFilter = useSignal('Todos');
  const condominiumFilter = useSignal('Geral');
  const selectedId = useSignal(props.resources.inspections[0]?.id ?? '');
  const isCreating = useSignal(false);
  const editingId = useSignal('');
  const hqNote = useSignal('');

  const isWorkerContext = props.appContext === 'worker';
  const isHqContext = props.appContext === 'hq';
  const condominiumOptions = ['Geral', ...props.resources.condominiums.map((item) => item.name)];
  const normalizedSearch = search.value.trim().toLowerCase();

  const inspections = props.resources.inspections
    .filter((item) => condominiumFilter.value === 'Geral' || item.condominium === condominiumFilter.value)
    .filter((item) => statusFilter.value === 'Todos' || item.status === statusFilter.value)
    .filter((item) => {
      if (!normalizedSearch) {
        return true;
      }

      return `${item.title} ${item.condominium} ${item.location} ${item.status} ${item.result}`
        .toLowerCase()
        .includes(normalizedSearch);
    })
    .sort((left, right) => (left.requiredDate || '').localeCompare(right.requiredDate || ''));

  const selected = inspections.find((item) => item.id === selectedId.value) ?? inspections[0];
  const editingItem = props.resources.inspections.find((item) => item.id === editingId.value);
  const pendingCount = props.resources.inspections.filter((item) => item.status === 'Submetida').length;
  const confirmedCount = props.resources.inspections.filter((item) => item.status === 'Confirmada').length;
  const rejectedCount = props.resources.inspections.filter((item) => item.status === 'Rejeitada').length;

  return (
    <section class="page-view operational-page maintenance-page">
      <header class="page-header compact-page-header calendar-header">
        <div>
          <span class="page-eyebrow">GESTISAC - Vistorias</span>
          <h1>Vistorias</h1>
          <p>
            {isWorkerContext
              ? 'Registo tecnico de vistorias e submissao para validacao HQ.'
              : 'Fila de validacao HQ com confirmacao, rejeicao e emissao de relatorio.'}
          </p>
        </div>
        <button
          type="button"
          class="primary-action action-with-icon"
          onClick$={() => {
            isCreating.value = true;
            editingId.value = '';
          }}
        >
          <PlusIcon size={16} />
          Nova vistoria
        </button>
      </header>

      <div class="summary-grid simple-summary-grid">
        <button class="summary-card blue" type="button" onClick$={() => props.navigate$('/vistorias')}>
          <span>Planeadas</span><strong>{props.resources.inspections.filter((item) => item.status === 'Planeada').length}</strong><small>Por executar</small>
        </button>
        <button class="summary-card gold" type="button" onClick$={() => (statusFilter.value = 'Submetida')}>
          <span>Submetidas</span><strong>{pendingCount}</strong><small>Aguardam HQ</small>
        </button>
        <button class="summary-card green" type="button" onClick$={() => (statusFilter.value = 'Confirmada')}>
          <span>Confirmadas</span><strong>{confirmedCount}</strong><small>Validadas</small>
        </button>
        <button class="summary-card red" type="button" onClick$={() => (statusFilter.value = 'Rejeitada')}>
          <span>Rejeitadas</span><strong>{rejectedCount}</strong><small>A rever</small>
        </button>
      </div>

      <section class="glass-panel ops-workspace">
        <div class="ops-panel-header calendar-toolbar">
          <div>
            <span class="page-eyebrow">Fluxo operacional</span>
            <h2>Painel de vistorias</h2>
          </div>
          <div class="ops-toolbar calendar-filters">
            <label class="ops-search">
              <SearchIcon size={16} />
              <input
                value={search.value}
                placeholder="Pesquisar vistoria, local ou estado"
                onInput$={(event) => (search.value = (event.target as HTMLInputElement).value)}
              />
            </label>
            <select value={condominiumFilter.value} onChange$={(event) => (condominiumFilter.value = (event.target as HTMLSelectElement).value)}>
              {condominiumOptions.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
            <select value={statusFilter.value} onChange$={(event) => (statusFilter.value = (event.target as HTMLSelectElement).value)}>
              {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </div>
        </div>

        <div class="ops-detail-layout">
          <div class="ops-list-column maintenance-list">
            {inspections.length ? inspections.map((item) => (
              <article class={`ops-ticket-card maintenance-card ${selected?.id === item.id ? 'active' : ''}`} key={item.id}>
                <button type="button" class="ops-ticket-main" onClick$={() => { selectedId.value = item.id; }}>
                  <span class={`priority-rail ${inspectionTone(item.status)}`} />
                  <div>
                    <strong>{item.title}</strong>
                    <span>{item.condominium || 'Geral'} - {item.location || 'Local por definir'}</span>
                    <p>{item.requiredDate || 'Sem data'} - {item.result || 'Sem resultado'}</p>
                  </div>
                  <div class="ticket-card-meta">
                    <small class={`status-chip ${inspectionTone(item.status)}`}>{item.status}</small>
                  </div>
                </button>
                <details class="simple-more-menu">
                  <summary><MoreHorizontalIcon size={16} /></summary>
                  <button type="button" onClick$={() => { editingId.value = item.id; isCreating.value = false; }}>
                    <EditIcon size={14} /> Editar
                  </button>
                  {isWorkerContext && item.status === 'Planeada' ? (
                    <button
                      type="button"
                      onClick$={async () => {
                        await props.onUpdate$('inspections', item.id, inspectionPayload(item, { status: 'Submetida', submittedAt: new Date().toISOString() }));
                      }}
                    >
                      Submeter HQ
                    </button>
                  ) : null}
                  {isHqContext && item.status === 'Submetida' ? (
                    <>
                      <button
                        type="button"
                        onClick$={async () => {
                          await props.onUpdate$('inspections', item.id, inspectionPayload(item, {
                            status: 'Confirmada',
                            hqNotes: hqNote.value,
                            confirmedAt: new Date().toISOString()
                          }));
                          hqNote.value = '';
                        }}
                      >
                        Confirmar
                      </button>
                      <button
                        type="button"
                        onClick$={async () => {
                          await props.onUpdate$('inspections', item.id, inspectionPayload(item, {
                            status: 'Rejeitada',
                            hqNotes: hqNote.value || 'Rever checklist e submeter novamente.',
                            confirmedAt: new Date().toISOString()
                          }));
                          hqNote.value = '';
                        }}
                      >
                        Rejeitar
                      </button>
                    </>
                  ) : null}
                  <button
                    type="button"
                    class="danger-action"
                    onClick$={async () => {
                      if (confirm(`Apagar ${item.title}?`)) {
                        await props.onDelete$('inspections', item.id);
                        selectedId.value = '';
                      }
                    }}
                  >
                    <Trash2Icon size={14} /> Apagar
                  </button>
                </details>
              </article>
            )) : (
              <div class="simple-empty-state"><strong>Sem vistorias</strong><span>Cria a primeira vistoria para iniciar o fluxo.</span></div>
            )}
          </div>

          <aside class="ops-detail-panel">
            {selected ? (
              <div class="simple-detail-panel">
                <div class="simple-detail-header">
                  <div>
                    <span class="page-eyebrow">Vistoria</span>
                    <h2>{selected.title}</h2>
                    <p>{selected.condominium || 'Geral'} - {selected.status}</p>
                  </div>
                  <button type="button" class="secondary-action" onClick$={() => { editingId.value = selected.id; isCreating.value = false; }}>
                    Editar
                  </button>
                </div>
                <div class="detail-kv-grid">
                  <article><span>Data prevista</span><strong>{selected.requiredDate || 'Por definir'}</strong><small>{selected.location || 'Local por definir'}</small></article>
                  <article><span>Resultado</span><strong>{selected.result || 'Sem resultado'}</strong><small>{selected.submittedAt || 'Sem submissao'}</small></article>
                  <article><span>Validação HQ</span><strong>{selected.confirmedBy || 'Pendente'}</strong><small>{selected.confirmedAt || 'Sem confirmacao'}</small></article>
                  <article><span>Checklist</span><strong>{selected.checklist.length} itens</strong><small>{selected.checklist.join(', ') || 'Sem itens'}</small></article>
                </div>
                <EntityAction class="entity-inline-link" path={condominiumPath(props.resources, selected.condominium)} navigate$={props.navigate$}>
                  Abrir condominio: {selected.condominium || 'Geral'}
                </EntityAction>
                <EntityAction
                  class="entity-inline-link"
                  path={selected.calendarEventId ? entityPath('calendarEvent', selected.calendarEventId) : ''}
                  navigate$={props.navigate$}
                  disabled={!selected.calendarEventId}
                >
                  Abrir evento de calendario ligado
                </EntityAction>
                <p>{selected.workerNotes || 'Sem notas do trabalhador.'}</p>
                <small>{selected.hqNotes || 'Sem notas HQ.'}</small>

                {isHqContext && selected.status === 'Submetida' ? (
                  <label class="wide" style={{ marginTop: '0.8rem' }}>
                    Nota HQ
                    <textarea
                      value={hqNote.value}
                      placeholder="Observacao para confirmar ou rejeitar"
                      onInput$={(event) => (hqNote.value = (event.target as HTMLTextAreaElement).value)}
                    />
                  </label>
                ) : null}

                <div class="simple-header-actions">
                  {isWorkerContext && selected.status === 'Planeada' ? (
                    <button
                      type="button"
                      class="primary-action"
                      disabled={props.isSaving}
                      onClick$={async () => {
                        await props.onUpdate$('inspections', selected.id, inspectionPayload(selected, {
                          status: 'Submetida',
                          submittedAt: new Date().toISOString()
                        }));
                      }}
                    >
                      {props.isSaving ? 'A guardar...' : 'Submeter para HQ'}
                    </button>
                  ) : null}
                  {isHqContext && selected.status === 'Submetida' ? (
                    <>
                      <button
                        type="button"
                        class="primary-action"
                        disabled={props.isSaving}
                        onClick$={async () => {
                          await props.onUpdate$('inspections', selected.id, inspectionPayload(selected, {
                            status: 'Confirmada',
                            hqNotes: hqNote.value,
                            confirmedAt: new Date().toISOString()
                          }));
                          hqNote.value = '';
                        }}
                      >
                        {props.isSaving ? 'A guardar...' : 'Confirmar vistoria'}
                      </button>
                      <button
                        type="button"
                        class="secondary-action"
                        disabled={props.isSaving}
                        onClick$={async () => {
                          await props.onUpdate$('inspections', selected.id, inspectionPayload(selected, {
                            status: 'Rejeitada',
                            hqNotes: hqNote.value || 'Rever checklist e submeter novamente.',
                            confirmedAt: new Date().toISOString()
                          }));
                          hqNote.value = '';
                        }}
                      >
                        Rejeitar
                      </button>
                    </>
                  ) : null}
                  <button
                    type="button"
                    class="secondary-action action-with-icon"
                    disabled={props.isSaving}
                    onClick$={async () => {
                      await props.onGenerateDocument$({
                        template: 'inspection-report',
                        condominium: selected.condominium,
                        inspectionId: selected.id,
                        notes: selected.hqNotes || selected.workerNotes || ''
                      });
                    }}
                  >
                    <FileTextIcon size={16} />
                    Gerar relatorio
                  </button>
                </div>
              </div>
            ) : (
              <div class="simple-empty-state"><strong>Seleciona uma vistoria</strong><span>O detalhe aparece aqui.</span></div>
            )}
          </aside>
        </div>
      </section>

      {isCreating.value || editingItem ? (
        <InspectionForm
          item={editingItem}
          condominiumOptions={condominiumOptions}
          isSaving={props.isSaving}
          onClose$={() => { isCreating.value = false; editingId.value = ''; }}
          onSubmit$={async (payload) => {
            if (editingItem) {
              await props.onUpdate$('inspections', editingItem.id, payload);
            } else {
              await props.onCreate$('inspections', payload);
            }
            isCreating.value = false;
            editingId.value = '';
          }}
        />
      ) : null}
    </section>
  );
});

const InspectionForm = component$((props: {
  item?: InspectionItem;
  condominiumOptions: string[];
  isSaving: boolean;
  onClose$: PropFunction<() => void>;
  onSubmit$: PropFunction<(payload: Record<string, unknown>) => void>;
}) => (
  <section class="glass-panel simple-form-panel calendar-form-panel">
    <div class="simple-content-header">
      <div>
        <span class="page-eyebrow">{props.item ? 'Editar vistoria' : 'Nova vistoria'}</span>
        <h2>{props.item?.title ?? 'Registar vistoria'}</h2>
      </div>
      <button type="button" class="secondary-action" onClick$={props.onClose$}>Fechar</button>
    </div>
    <form preventdefault:submit onSubmit$={async (event) => props.onSubmit$(inspectionPayloadFromForm(event.target as HTMLFormElement, props.item))}>
      <div class="ops-form-grid">
        <label>Titulo<input name="title" value={props.item?.title ?? ''} placeholder="Vistoria ao elevador Bloco B" required /></label>
        <label>Condominio<select name="condominium" value={props.item?.condominium || props.condominiumOptions[1] || 'Geral'}>
          {props.condominiumOptions.map((name) => <option key={name} value={name}>{name}</option>)}
        </select></label>
        <label>Local<input name="location" value={props.item?.location ?? ''} placeholder="Casa das maquinas" /></label>
        <label>Data prevista<input type="date" name="requiredDate" value={props.item?.requiredDate ?? ''} /></label>
        <label>Estado<select name="status" value={props.item?.status || 'Planeada'}>
          {STATUS_OPTIONS.filter((status) => status !== 'Todos').map((status) => <option key={status} value={status}>{status}</option>)}
        </select></label>
        <label>Resultado<select name="result" value={props.item?.result || 'Pendente'}>
          {RESULT_OPTIONS.map((result) => <option key={result} value={result}>{result}</option>)}
        </select></label>
        <label class="wide">Checklist<textarea name="checklist" value={(props.item?.checklist ?? []).join('\n')} placeholder="Um item por linha" /></label>
        <label class="wide">Notas trabalhador<textarea name="workerNotes" value={props.item?.workerNotes ?? ''} placeholder="Resumo tecnico da vistoria" /></label>
        <label class="wide">Notas HQ<textarea name="hqNotes" value={props.item?.hqNotes ?? ''} placeholder="Observacoes para validacao" /></label>
      </div>
      <div class="simple-header-actions">
        <button type="submit" class="primary-action" disabled={props.isSaving}>{props.isSaving ? 'A guardar...' : 'Guardar vistoria'}</button>
      </div>
    </form>
  </section>
));

function inspectionPayloadFromForm(form: HTMLFormElement, current?: InspectionItem): Record<string, unknown> {
  const data = new FormData(form);
  return {
    title: stringField(data, 'title'),
    condominium: stringField(data, 'condominium') || 'Geral',
    location: stringField(data, 'location'),
    requiredDate: stringField(data, 'requiredDate') || current?.requiredDate || '',
    status: stringField(data, 'status') || current?.status || 'Planeada',
    result: stringField(data, 'result') || current?.result || 'Pendente',
    checklist: splitChecklist(stringField(data, 'checklist')),
    workerNotes: stringField(data, 'workerNotes'),
    hqNotes: stringField(data, 'hqNotes'),
    submittedAt: current?.submittedAt || '',
    confirmedAt: current?.confirmedAt || '',
    confirmedBy: current?.confirmedBy || '',
    calendarEventId: current?.calendarEventId || ''
  };
}

function inspectionPayload(item: InspectionItem, overrides: Partial<InspectionItem> = {}): Record<string, unknown> {
  return {
    title: overrides.title ?? item.title,
    condominium: overrides.condominium ?? item.condominium,
    location: overrides.location ?? item.location,
    requiredDate: overrides.requiredDate ?? item.requiredDate,
    status: overrides.status ?? item.status,
    result: overrides.result ?? item.result,
    checklist: overrides.checklist ?? item.checklist,
    workerNotes: overrides.workerNotes ?? item.workerNotes,
    hqNotes: overrides.hqNotes ?? item.hqNotes,
    submittedAt: overrides.submittedAt ?? item.submittedAt,
    confirmedAt: overrides.confirmedAt ?? item.confirmedAt,
    confirmedBy: overrides.confirmedBy ?? item.confirmedBy,
    calendarEventId: overrides.calendarEventId ?? item.calendarEventId
  };
}

function splitChecklist(value: string): string[] {
  return value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function stringField(data: FormData, key: string): string {
  return String(data.get(key) ?? '').trim();
}

function inspectionTone(status: string): string {
  const normalized = status.toLowerCase();
  if (normalized.includes('confirm')) return 'green';
  if (normalized.includes('submet')) return 'gold';
  if (normalized.includes('rejeit')) return 'red';
  return 'blue';
}
