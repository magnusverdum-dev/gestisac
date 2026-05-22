import { component$, useSignal, useTask$, type PropFunction } from '@builder.io/qwik';
import { EditIcon, MoreHorizontalIcon, PlusIcon, SearchIcon, Trash2Icon } from 'lucide-qwik';
import type { MaintenanceItem, ResourceEndpoint, ResourceState } from '../../lib/api';
import {
  condominiumPath,
  entityPath,
  isMaintenanceClosed,
  maintenanceStatusPath,
  slugify,
  supplierPath
} from '../../lib/entity-navigation';
import { EntityAction } from '../common/EntityAction';

type MaintenancePageProps = {
  resources: ResourceState;
  isSaving: boolean;
  createIntentVersion: number;
  initialStatus?: string;
  navigate$: PropFunction<(path: string) => void>;
  onCreate$: PropFunction<(resource: ResourceEndpoint, payload: Record<string, unknown>) => void>;
  onUpdate$: PropFunction<(resource: ResourceEndpoint, id: string, payload: Record<string, unknown>) => void>;
  onDelete$: PropFunction<(resource: ResourceEndpoint, id: string) => void>;
};

const TYPES = ['Todos', 'Preventiva', 'Corretiva', 'Vistoria', 'Legal', 'Limpeza', 'Seguranca'];
const FORM_TYPES = TYPES.filter((item) => item !== 'Todos');
const STATUSES = ['Todos', 'Planeada', 'Agendada', 'Em curso', 'A aguardar fornecedor', 'Concluida', 'Cancelada'];
const FORM_STATUSES = STATUSES.filter((item) => item !== 'Todos');
const PRIORITIES = ['Baixa', 'Normal', 'Alta', 'Urgente'];

export const MaintenancePage = component$((props: MaintenancePageProps) => {
  const search = useSignal('');
  const typeFilter = useSignal('Todos');
  const statusFilter = useSignal('Todos');
  const condominiumFilter = useSignal('Geral');
  const selectedId = useSignal(props.resources.maintenance[0]?.id ?? '');
  const isCreating = useSignal(false);
  const editingId = useSignal('');

  useTask$(({ track }) => {
    track(() => props.createIntentVersion);
    if (props.createIntentVersion > 0) {
      isCreating.value = true;
      editingId.value = '';
    }
  });
  useTask$(({ track }) => {
    const routedStatus = track(() => props.initialStatus);
    if (routedStatus) {
      statusFilter.value = routedStatus;
      selectedId.value = '';
    }
  });

  const condominiumOptions = ['Geral', ...props.resources.condominiums.map((item) => item.name)];
  const normalizedSearch = search.value.trim().toLowerCase();
  const items = props.resources.maintenance
    .filter((item) => condominiumFilter.value === 'Geral' || item.condominium === condominiumFilter.value)
    .filter((item) => typeFilter.value === 'Todos' || item.type === typeFilter.value)
    .filter((item) =>
      statusFilter.value === 'Todos' ||
      (slugify(statusFilter.value) === 'abertas' ? !isMaintenanceClosed(item.status) : item.status === statusFilter.value || slugify(item.status) === slugify(statusFilter.value))
    )
    .filter((item) => {
      if (!normalizedSearch) {
        return true;
      }

      return `${item.title} ${item.supplier} ${item.condominium ?? ''} ${item.notes ?? ''} ${item.status}`
        .toLowerCase()
        .includes(normalizedSearch);
    })
    .sort((left, right) => (left.scheduledStart || left.date).localeCompare(right.scheduledStart || right.date));
  const selected = items.find((item) => item.id === selectedId.value) ?? items[0];
  const editingItem = props.resources.maintenance.find((item) => item.id === editingId.value);
  const linkedTicket = selected
    ? props.resources.tickets.find((ticket) => ticket.id === selected.ticketId || ticket.linkedMaintenanceId === selected.id)
    : undefined;
  const linkedEvent = selected
    ? props.resources.calendarEvents.find((event) => event.id === selected.calendarEventId || event.linkedEntityId === selected.id)
    : undefined;
  const openItems = props.resources.maintenance.filter((item) => !isMaintenanceClosed(item.status));
  const bySupplier = new Set(props.resources.maintenance.map((item) => item.supplier).filter(Boolean)).size;

  return (
    <section class="page-view operational-page maintenance-page">
      <header class="page-header compact-page-header calendar-header">
        <div>
          <span class="page-eyebrow">GESTISAC - Manutencao</span>
          <h1>Manutencao</h1>
          <p>Planos, fornecedores, equipamentos, tickets e eventos operacionais ligados num unico fluxo.</p>
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
          Agendar intervencao
        </button>
      </header>

      <div class="summary-grid simple-summary-grid">
        <button class="summary-card gold" type="button" onClick$={() => props.navigate$(maintenanceStatusPath('Abertas'))}>
          <span>Abertas</span><strong>{openItems.length}</strong><small>Planeadas ou em curso</small>
        </button>
        <button class="summary-card blue" type="button" onClick$={() => props.navigate$('/fornecedores')}>
          <span>Fornecedores</span><strong>{bySupplier}</strong><small>Com intervencoes</small>
        </button>
        <button class="summary-card green" type="button" onClick$={() => props.navigate$(maintenanceStatusPath('Concluida'))}>
          <span>Concluidas</span><strong>{props.resources.maintenance.filter((item) => isMaintenanceClosed(item.status)).length}</strong><small>Historico</small>
        </button>
        <button class="summary-card purple" type="button" onClick$={() => props.navigate$('/manutencao')}>
          <span>Filtradas</span><strong>{items.length}</strong><small>Vista atual</small>
        </button>
      </div>

      <section class="glass-panel ops-workspace">
        <div class="ops-panel-header calendar-toolbar">
          <div>
            <span class="page-eyebrow">Operacao tecnica</span>
            <h2>Plano de manutencao</h2>
          </div>
          <div class="ops-toolbar calendar-filters">
            <label class="ops-search">
              <SearchIcon size={16} />
              <input
                value={search.value}
                placeholder="Pesquisar por manutencao, fornecedor ou condominio"
                onInput$={(event) => (search.value = (event.target as HTMLInputElement).value)}
              />
            </label>
            <select value={condominiumFilter.value} onChange$={(event) => (condominiumFilter.value = (event.target as HTMLSelectElement).value)}>
              {condominiumOptions.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
            <select value={typeFilter.value} onChange$={(event) => (typeFilter.value = (event.target as HTMLSelectElement).value)}>
              {TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
            <select value={statusFilter.value} onChange$={(event) => (statusFilter.value = (event.target as HTMLSelectElement).value)}>
              {STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </div>
        </div>

        <div class="ops-detail-layout">
          <div class="ops-list-column maintenance-list">
            {items.length ? items.map((item) => (
              <article class={`ops-ticket-card maintenance-card ${selected?.id === item.id ? 'active' : ''}`} key={item.id}>
                <button type="button" class="ops-ticket-main" onClick$={() => props.navigate$(entityPath('maintenance', item.id))}>
                  <span class={`priority-rail ${maintenanceTone(item.status, item.priority)}`} />
                  <div>
                    <strong>{item.title}</strong>
                    <span>{item.condominium || 'Geral'} - {item.supplier || 'Fornecedor por definir'}</span>
                    <p>{item.notes || `${item.type || 'Preventiva'} - ${item.date}`}</p>
                  </div>
                  <div class="ticket-card-meta">
                    <small class={`status-chip ${statusTone(item.status)}`}>{item.status}</small>
                    <small>{item.type || 'Preventiva'}</small>
                  </div>
                </button>
                <details class="simple-more-menu">
                  <summary><MoreHorizontalIcon size={16} /></summary>
                  <button type="button" onClick$={() => { editingId.value = item.id; isCreating.value = false; }}>
                    <EditIcon size={14} /> Editar
                  </button>
                  {!isMaintenanceClosed(item.status) ? (
                    <button
                      type="button"
                      onClick$={async () => props.onUpdate$('maintenance', item.id, { ...item, status: 'Concluida', completedAt: new Date().toISOString() })}
                    >
                      Concluir
                    </button>
                  ) : null}
                  <button
                    type="button"
                    class="danger-action"
                    onClick$={async () => {
                      if (confirm(`Apagar ${item.title}?`)) {
                        await props.onDelete$('maintenance', item.id);
                        selectedId.value = '';
                      }
                    }}
                  >
                    <Trash2Icon size={14} /> Apagar
                  </button>
                </details>
              </article>
            )) : (
              <div class="simple-empty-state"><strong>Sem manutencoes</strong><span>Ajusta filtros ou cria uma intervencao.</span></div>
            )}
          </div>

          <aside class="ops-detail-panel">
            {selected ? (
              <div class="simple-detail-panel">
                <div class="simple-detail-header">
                  <div>
                    <span class="page-eyebrow">{selected.type || 'Manutencao'}</span>
                    <h2>{selected.title}</h2>
                    <p>{selected.condominium || 'Geral'} - {selected.status}</p>
                  </div>
                  <button type="button" class="secondary-action" onClick$={() => { editingId.value = selected.id; isCreating.value = false; }}>
                    Editar
                  </button>
                </div>
                <div class="detail-kv-grid">
                  <EntityAction class="detail-link-card" path={selected.supplier ? supplierPath(props.resources, selected.supplier) : ''} navigate$={props.navigate$} disabled={!selected.supplier}>
                    <span>Fornecedor</span><strong>{selected.supplier || 'Por definir'}</strong><small>{selected.costEstimate ? `${selected.costEstimate} EUR` : 'Sem estimativa'}</small>
                  </EntityAction>
                  <article><span>Agenda</span><strong>{formatDate(selected.scheduledStart || selected.date)}</strong><small>{selected.scheduledEnd || 'Fim por definir'}</small></article>
                  <article><span>Equipamento</span><strong>{selected.equipmentId || 'Por definir'}</strong><small>{selected.zoneId || 'Zona por definir'}</small></article>
                  <article><span>Prioridade</span><strong>{selected.priority || 'Normal'}</strong><small>{selected.completedAt || 'Nao concluida'}</small></article>
                </div>
                <EntityAction class="entity-inline-link" path={condominiumPath(props.resources, selected.condominium)} navigate$={props.navigate$}>
                  Abrir condominio: {selected.condominium || 'Geral'}
                </EntityAction>
                <p>{selected.notes || 'Sem notas operacionais.'}</p>
                <div class="linked-strip">
                  <EntityAction class="linked-strip-card" path={linkedTicket ? entityPath('ticket', linkedTicket.id) : ''} navigate$={props.navigate$} disabled={!linkedTicket}>
                    <span>Ticket ligado</span>
                    <strong>{linkedTicket?.title || selected.ticketId || 'Sem ticket ligado'}</strong>
                  </EntityAction>
                  <EntityAction class="linked-strip-card" path={linkedEvent ? entityPath('calendarEvent', linkedEvent.id) : ''} navigate$={props.navigate$} disabled={!linkedEvent}>
                    <span>Evento ligado</span>
                    <strong>{linkedEvent?.title || selected.calendarEventId || 'Sem evento ligado'}</strong>
                  </EntityAction>
                </div>
                <div class="ops-history">
                  <strong>Sequencia operacional</strong>
                  <article><span>Planeamento</span><p>{selected.type || 'Preventiva'} - {selected.status}</p><small>{selected.date}</small></article>
                  {linkedTicket ? <article><span>Ticket</span><p>{linkedTicket.status} - {linkedTicket.detail}</p><small>{linkedTicket.updatedAt}</small></article> : null}
                  {linkedEvent ? <article><span>Calendario</span><p>{linkedEvent.eventType} - {linkedEvent.status}</p><small>{linkedEvent.startAt}</small></article> : null}
                </div>
              </div>
            ) : (
              <div class="simple-empty-state"><strong>Seleciona uma manutencao</strong><span>O detalhe aparece aqui.</span></div>
            )}
          </aside>
        </div>
      </section>

      {isCreating.value || editingItem ? (
        <MaintenanceForm
          item={editingItem}
          condominiumOptions={condominiumOptions}
          suppliers={props.resources.suppliers.map((supplier) => supplier.name)}
          isSaving={props.isSaving}
          onClose$={() => { isCreating.value = false; editingId.value = ''; }}
          onSubmit$={async (payload) => {
            if (editingItem) {
              await props.onUpdate$('maintenance', editingItem.id, payload);
            } else {
              await props.onCreate$('maintenance', payload);
            }
            isCreating.value = false;
            editingId.value = '';
          }}
        />
      ) : null}
    </section>
  );
});

const MaintenanceForm = component$((props: {
  item?: MaintenanceItem;
  condominiumOptions: string[];
  suppliers: string[];
  isSaving: boolean;
  onClose$: PropFunction<() => void>;
  onSubmit$: PropFunction<(payload: Record<string, unknown>) => void>;
}) => (
  <section class="glass-panel simple-form-panel calendar-form-panel">
    <div class="simple-content-header">
      <div>
        <span class="page-eyebrow">{props.item ? 'Editar manutencao' : 'Nova manutencao'}</span>
        <h2>{props.item?.title ?? 'Agendar intervencao'}</h2>
      </div>
      <button type="button" class="secondary-action" onClick$={props.onClose$}>Fechar</button>
    </div>
    <form preventdefault:submit onSubmit$={async (event) => props.onSubmit$(maintenancePayloadFromForm(event.target as HTMLFormElement, props.item))}>
      <div class="ops-form-grid">
        <label>Titulo<input name="title" value={props.item?.title ?? ''} placeholder="Inspecao do elevador" required /></label>
        <label>Condominio<select name="condominium" value={props.item?.condominium || props.condominiumOptions[1] || 'Geral'}>
          {props.condominiumOptions.map((name) => <option key={name} value={name}>{name}</option>)}
        </select></label>
        <label>Fornecedor<input name="supplier" value={props.item?.supplier ?? ''} placeholder={props.suppliers[0] || 'Elevatec Lisboa'} /></label>
        <label>Tipo<select name="type" value={props.item?.type || 'Preventiva'}>{FORM_TYPES.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        <label>Estado<select name="status" value={props.item?.status || 'Planeada'}>{FORM_STATUSES.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        <label>Prioridade<select name="priority" value={props.item?.priority || 'Normal'}>{PRIORITIES.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        <label>Data<input type="date" name="date" value={props.item?.date ?? ''} /></label>
        <label>Inicio<input type="datetime-local" name="scheduledStart" value={toInputDateTime(props.item?.scheduledStart)} /></label>
        <label>Fim<input type="datetime-local" name="scheduledEnd" value={toInputDateTime(props.item?.scheduledEnd)} /></label>
        <label>Equipamento<input name="equipmentId" value={props.item?.equipmentId ?? ''} placeholder="elevador-bloco-b" /></label>
        <label>Zona<input name="zoneId" value={props.item?.zoneId ?? ''} placeholder="bloco-b" /></label>
        <label>ID ticket<input name="ticketId" value={props.item?.ticketId ?? ''} placeholder="ticket-001" /></label>
        <label>ID evento<input name="calendarEventId" value={props.item?.calendarEventId ?? ''} placeholder="cal-001" /></label>
        <label>Custo estimado<input name="costEstimate" value={props.item?.costEstimate ?? ''} placeholder="420.00" /></label>
        <label>Concluida em<input type="datetime-local" name="completedAt" value={toInputDateTime(props.item?.completedAt)} /></label>
        <label class="wide">Notas<textarea name="notes" value={props.item?.notes ?? ''} placeholder="Notas tecnicas e proximos passos" /></label>
      </div>
      <div class="simple-header-actions">
        <button type="submit" class="primary-action" disabled={props.isSaving}>{props.isSaving ? 'A guardar...' : 'Guardar manutencao'}</button>
      </div>
    </form>
  </section>
));

function maintenancePayloadFromForm(form: HTMLFormElement, current?: MaintenanceItem): Record<string, unknown> {
  const data = new FormData(form);
  const scheduledStart = stringField(data, 'scheduledStart');
  const date = stringField(data, 'date') || scheduledStart.slice(0, 10) || current?.date || new Date().toISOString().slice(0, 10);

  return {
    title: stringField(data, 'title'),
    condominium: stringField(data, 'condominium') || 'Geral',
    supplier: stringField(data, 'supplier') || 'Fornecedor por definir',
    type: stringField(data, 'type') || 'Preventiva',
    status: stringField(data, 'status') || 'Planeada',
    priority: stringField(data, 'priority') || 'Normal',
    date,
    scheduledStart,
    scheduledEnd: stringField(data, 'scheduledEnd'),
    completedAt: stringField(data, 'completedAt'),
    equipmentId: stringField(data, 'equipmentId'),
    zoneId: stringField(data, 'zoneId'),
    ticketId: stringField(data, 'ticketId'),
    calendarEventId: stringField(data, 'calendarEventId'),
    costEstimate: stringField(data, 'costEstimate'),
    notes: stringField(data, 'notes')
  };
}

function stringField(data: FormData, key: string): string {
  return String(data.get(key) ?? '').trim();
}

function statusTone(status: string): string {
  const normalized = status.toLowerCase();
  if (normalized.includes('conclu')) return 'green';
  if (normalized.includes('fornecedor') || normalized.includes('aguardar')) return 'gold';
  if (normalized.includes('curso') || normalized.includes('agendada')) return 'blue';
  if (normalized.includes('cancel')) return 'red';
  return 'purple';
}

function maintenanceTone(status: string, priority = 'Normal'): string {
  if (priority === 'Urgente') return 'red';
  return statusTone(status);
}

function toInputDateTime(value: string | undefined): string {
  return value ? value.slice(0, 16) : '';
}

function formatDate(value: string | undefined): string {
  if (!value) {
    return 'Por definir';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString('pt-PT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}
