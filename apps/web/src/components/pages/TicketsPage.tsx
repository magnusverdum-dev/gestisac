import { component$, useSignal, useTask$, type PropFunction } from '@builder.io/qwik';
import { EditIcon, MoreHorizontalIcon, PlusIcon, SearchIcon, Trash2Icon } from 'lucide-qwik';
import type { ResourceEndpoint, ResourceState, Ticket } from '../../lib/api';
import {
  condominiumPath,
  entityPath,
  isTicketClosed,
  isTicketOpen,
  isTicketPending,
  personPath,
  ticketMatchesGroup,
  ticketStatusPath,
  type TicketStatusGroup
} from '../../lib/entity-navigation';
import { EntityAction } from '../common/EntityAction';

type TicketsPageProps = {
  resources: ResourceState;
  isSaving: boolean;
  createIntentVersion: number;
  initialStatusGroup?: TicketStatusGroup | '';
  initialPriority?: string;
  navigate$: PropFunction<(path: string) => void>;
  onCreate$: PropFunction<(resource: ResourceEndpoint, payload: Record<string, unknown>) => void>;
  onUpdate$: PropFunction<(resource: ResourceEndpoint, id: string, payload: Record<string, unknown>) => void>;
  onDelete$: PropFunction<(resource: ResourceEndpoint, id: string) => void>;
};

const STATUSES = ['Todos', 'Novo', 'Aberto', 'Em curso', 'Pendente', 'Em espera', 'Resolvido', 'Fechado'];
const PRIORITIES = ['Todos', 'Baixa', 'Normal', 'Alta', 'Urgente'];
const CHANNELS = ['Portal', 'Email', 'Telefone', 'Presencial', 'Interno'];
const TYPES = ['Avaria', 'Pedido', 'Pergunta', 'Reclamacao', 'Tarefa interna'];

export const TicketsPage = component$((props: TicketsPageProps) => {
  const search = useSignal('');
  const statusFilter = useSignal('Todos');
  const statusGroup = useSignal<TicketStatusGroup | ''>(props.initialStatusGroup ?? '');
  const priorityFilter = useSignal('Todos');
  const condominiumFilter = useSignal('Geral');
  const selectedId = useSignal(props.resources.tickets[0]?.id ?? '');
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
    const routedGroup = track(() => props.initialStatusGroup);
    statusGroup.value = routedGroup ?? '';
    if (routedGroup) {
      statusFilter.value = 'Todos';
      selectedId.value = '';
    }
  });
  useTask$(({ track }) => {
    const routedPriority = track(() => props.initialPriority);
    if (routedPriority) {
      priorityFilter.value = routedPriority;
      statusGroup.value = '';
      selectedId.value = '';
    }
  });

  const condominiumOptions = ['Geral', ...props.resources.condominiums.map((item) => item.name)];
  const normalizedSearch = search.value.trim().toLowerCase();
  const tickets = props.resources.tickets
    .filter((ticket) => condominiumFilter.value === 'Geral' || ticket.condominium === condominiumFilter.value)
    .filter((ticket) =>
      statusGroup.value ? ticketMatchesGroup(ticket.status, statusGroup.value) : statusFilter.value === 'Todos' || ticket.status === statusFilter.value
    )
    .filter((ticket) => priorityFilter.value === 'Todos' || ticket.priority === priorityFilter.value)
    .filter((ticket) => {
      if (!normalizedSearch) {
        return true;
      }

      return `${ticket.title} ${ticket.detail} ${ticket.condominium} ${ticket.requesterName ?? ''} ${ticket.assignee ?? ''}`
        .toLowerCase()
        .includes(normalizedSearch);
    });
  const selected = tickets.find((ticket) => ticket.id === selectedId.value) ?? tickets[0];
  const editingTicket = props.resources.tickets.find((ticket) => ticket.id === editingId.value);
  const openCount = props.resources.tickets.filter((ticket) => isTicketOpen(ticket.status)).length;
  const urgentCount = props.resources.tickets.filter((ticket) => ticket.priority === 'Urgente').length;
  const pendingCount = props.resources.tickets.filter((ticket) => isTicketPending(ticket.status)).length;
  const linkedMaintenance = selected
    ? props.resources.maintenance.find((item) => item.id === selected.linkedMaintenanceId || item.ticketId === selected.id)
    : undefined;
  const linkedEvent = selected
    ? props.resources.calendarEvents.find((item) => item.id === selected.linkedCalendarEventId || item.linkedEntityId === selected.id)
    : undefined;
  const relatedAudit = selected
    ? props.resources.auditLog.filter((entry) => entry.recordId === selected.id || entry.summary.includes(selected.title)).slice(0, 4)
    : [];

  return (
    <section class="page-view operational-page cmt-page">
      <header class="page-header compact-page-header calendar-header">
        <div>
          <span class="page-eyebrow">GESTISAC - CMT</span>
          <h1>Tickets</h1>
          <p>Customer/Condominium Ticket Management com prioridade, estado, responsavel e ligacoes.</p>
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
          Abrir ticket
        </button>
      </header>

      <div class="summary-grid simple-summary-grid">
        <button class={`summary-card red ${statusGroup.value === 'abertos' ? 'active' : ''}`} type="button" onClick$={() => props.navigate$(ticketStatusPath('abertos'))}>
          <span>Abertos</span><strong>{openCount}</strong><small>{urgentCount} urgente</small>
        </button>
        <button class={`summary-card gold ${statusGroup.value === 'pendentes' ? 'active' : ''}`} type="button" onClick$={() => props.navigate$(ticketStatusPath('pendentes'))}>
          <span>Pendentes</span><strong>{pendingCount}</strong><small>A aguardar decisao</small>
        </button>
        <button class="summary-card blue" type="button" onClick$={() => props.navigate$('/tickets')}>
          <span>Filtrados</span><strong>{tickets.length}</strong><small>Vista atual</small>
        </button>
        <button class={`summary-card green ${statusGroup.value === 'resolvidos' ? 'active' : ''}`} type="button" onClick$={() => props.navigate$(ticketStatusPath('resolvidos'))}>
          <span>Resolvidos</span><strong>{props.resources.tickets.filter((ticket) => isTicketClosed(ticket.status)).length}</strong><small>Historico operacional</small>
        </button>
      </div>

      <section class="glass-panel ops-workspace">
        <div class="ops-panel-header calendar-toolbar">
          <div>
            <span class="page-eyebrow">Dados reais da API local</span>
            <h2>Registos CMT</h2>
          </div>
          <div class="ops-toolbar calendar-filters">
            <label class="ops-search">
              <SearchIcon size={16} />
              <input
                value={search.value}
                placeholder="Pesquisar por nome, estado, condominio ou responsavel"
                onInput$={(event) => (search.value = (event.target as HTMLInputElement).value)}
              />
            </label>
            <select value={condominiumFilter.value} onChange$={(event) => (condominiumFilter.value = (event.target as HTMLSelectElement).value)}>
              {condominiumOptions.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
            <select value={statusFilter.value} onChange$={(event) => { statusFilter.value = (event.target as HTMLSelectElement).value; statusGroup.value = ''; }}>
              {STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
            <select value={priorityFilter.value} onChange$={(event) => (priorityFilter.value = (event.target as HTMLSelectElement).value)}>
              {PRIORITIES.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
            </select>
          </div>
        </div>

        <div class="ops-detail-layout">
          <div class="ops-list-column">
            {tickets.length ? tickets.map((ticket) => (
              <article class={`ops-ticket-card ${selected?.id === ticket.id ? 'active' : ''}`} key={ticket.id}>
                <button type="button" class="ops-ticket-main" onClick$={() => props.navigate$(entityPath('ticket', ticket.id))}>
                  <span class={`priority-rail ${priorityTone(ticket.priority)}`} />
                  <div>
                    <strong>{ticket.title}</strong>
                    <span>{ticket.condominium} - {ticket.requesterName || 'Requerente por definir'}</span>
                    <p>{ticket.detail}</p>
                  </div>
                  <div class="ticket-card-meta">
                    <small class={`status-chip ${statusTone(ticket.status)}`}>{ticket.status}</small>
                    <small>{ticket.priority}</small>
                  </div>
                </button>
                <details class="simple-more-menu">
                  <summary><MoreHorizontalIcon size={16} /></summary>
                  <button type="button" onClick$={() => { editingId.value = ticket.id; isCreating.value = false; }}>
                    <EditIcon size={14} /> Editar
                  </button>
                  {!isTicketClosed(ticket.status) ? (
                    <button
                      type="button"
                      onClick$={async () => props.onUpdate$('tickets', ticket.id, { ...ticket, status: 'Resolvido', resolvedAt: new Date().toISOString(), priority: 'Normal' })}
                    >
                      Resolver
                    </button>
                  ) : null}
                  <button
                    type="button"
                    class="danger-action"
                    onClick$={async () => {
                      if (confirm(`Apagar ${ticket.title}?`)) {
                        await props.onDelete$('tickets', ticket.id);
                        selectedId.value = '';
                      }
                    }}
                  >
                    <Trash2Icon size={14} /> Apagar
                  </button>
                </details>
              </article>
            )) : (
              <div class="simple-empty-state"><strong>Sem tickets</strong><span>Ajusta os filtros ou abre um ticket novo.</span></div>
            )}
          </div>

          <aside class="ops-detail-panel">
            {selected ? (
              <div class="simple-detail-panel">
                <div class="simple-detail-header">
                  <div>
                    <span class="page-eyebrow">{selected.type || 'Ticket'}</span>
                    <h2>{selected.title}</h2>
                    <p>{selected.condominium} - {selected.priority} - {selected.status}</p>
                  </div>
                  <button type="button" class="secondary-action" onClick$={() => { editingId.value = selected.id; isCreating.value = false; }}>
                    Editar
                  </button>
                </div>
                <div class="detail-kv-grid">
                  <EntityAction
                    class="detail-link-card"
                    path={selected.requesterName || selected.requesterEmail ? personPath(props.resources, selected.requesterName, selected.requesterEmail) : ''}
                    navigate$={props.navigate$}
                    disabled={!selected.requesterName && !selected.requesterEmail}
                  >
                    <span>Requerente</span><strong>{selected.requesterName || 'Por definir'}</strong><small>{selected.requesterEmail || selected.channel || 'Sem contacto'}</small>
                  </EntityAction>
                  <EntityAction class="detail-link-card" path={selected.assignee ? personPath(props.resources, selected.assignee) : ''} navigate$={props.navigate$} disabled={!selected.assignee}>
                    <span>Responsavel</span><strong>{selected.assignee || 'Por atribuir'}</strong><small>{selected.dueAt || 'Sem prazo'}</small>
                  </EntityAction>
                  <article><span>Categoria</span><strong>{selected.category || 'Operacional'}</strong><small>{selected.channel || 'Portal'}</small></article>
                  <article><span>Atualizado</span><strong>{selected.updatedAt || 'Agora'}</strong><small>{selected.createdAt || 'Sem data de criacao'}</small></article>
                </div>
                <EntityAction class="entity-inline-link" path={condominiumPath(props.resources, selected.condominium)} navigate$={props.navigate$}>
                  Abrir condominio: {selected.condominium || 'Geral'}
                </EntityAction>
                <p>{selected.detail}</p>
                {selected.tags?.length ? <div class="calendar-badges">{selected.tags.map((tag) => <span key={tag}>{tag}</span>)}</div> : null}

                <div class="linked-strip">
                  <EntityAction class="linked-strip-card" path={linkedMaintenance ? entityPath('maintenance', linkedMaintenance.id) : ''} navigate$={props.navigate$} disabled={!linkedMaintenance}>
                    <span>Manutencao ligada</span>
                    <strong>{linkedMaintenance?.title || selected.linkedMaintenanceId || 'Sem manutencao ligada'}</strong>
                  </EntityAction>
                  <EntityAction class="linked-strip-card" path={linkedEvent ? entityPath('calendarEvent', linkedEvent.id) : ''} navigate$={props.navigate$} disabled={!linkedEvent}>
                    <span>Evento ligado</span>
                    <strong>{linkedEvent?.title || selected.linkedCalendarEventId || 'Sem evento ligado'}</strong>
                  </EntityAction>
                </div>

                <div class="ops-history">
                  <strong>Historico operacional</strong>
                  {relatedAudit.length ? relatedAudit.map((entry) => (
                    <article key={entry.id}>
                      <span>{entry.action}</span>
                      <p>{entry.summary}</p>
                      <small>{entry.createdAt}</small>
                    </article>
                  )) : (
                    <article>
                      <span>Registo CMT</span>
                      <p>{selected.status} - {selected.detail}</p>
                      <small>{selected.updatedAt || selected.createdAt || 'Sem data'}</small>
                    </article>
                  )}
                </div>
              </div>
            ) : (
              <div class="simple-empty-state"><strong>Seleciona um ticket</strong><span>O detalhe aparece aqui.</span></div>
            )}
          </aside>
        </div>
      </section>

      {isCreating.value || editingTicket ? (
        <TicketForm
          ticket={editingTicket}
          condominiumOptions={condominiumOptions}
          isSaving={props.isSaving}
          onClose$={() => { isCreating.value = false; editingId.value = ''; }}
          onSubmit$={async (payload) => {
            if (editingTicket) {
              await props.onUpdate$('tickets', editingTicket.id, payload);
            } else {
              await props.onCreate$('tickets', payload);
            }
            isCreating.value = false;
            editingId.value = '';
          }}
        />
      ) : null}
    </section>
  );
});

const TicketForm = component$((props: {
  ticket?: Ticket;
  condominiumOptions: string[];
  isSaving: boolean;
  onClose$: PropFunction<() => void>;
  onSubmit$: PropFunction<(payload: Record<string, unknown>) => void>;
}) => (
  <section class="glass-panel simple-form-panel calendar-form-panel">
    <div class="simple-content-header">
      <div>
        <span class="page-eyebrow">{props.ticket ? 'Editar ticket' : 'Novo ticket'}</span>
        <h2>{props.ticket?.title ?? 'Abrir ticket'}</h2>
      </div>
      <button type="button" class="secondary-action" onClick$={props.onClose$}>Fechar</button>
    </div>
    <form
      preventdefault:submit
      onSubmit$={async (event) => {
        const form = event.target as HTMLFormElement;
        await props.onSubmit$(ticketPayloadFromForm(form, props.ticket));
      }}
    >
      <div class="ops-form-grid">
        <label>Titulo<input name="title" value={props.ticket?.title ?? ''} placeholder="Avaria no elevador" required /></label>
        <label>Condominio<select name="condominium" value={props.ticket?.condominium || props.condominiumOptions[1] || 'Geral'}>
          {props.condominiumOptions.map((name) => <option key={name} value={name}>{name}</option>)}
        </select></label>
        <label>Requerente<input name="requesterName" value={props.ticket?.requesterName ?? ''} placeholder="Carlos Almeida" /></label>
        <label>Email<input name="requesterEmail" value={props.ticket?.requesterEmail ?? ''} placeholder="morador@example.pt" /></label>
        <label>Canal<select name="channel" value={props.ticket?.channel || 'Portal'}>{CHANNELS.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        <label>Tipo<select name="type" value={props.ticket?.type || 'Avaria'}>{TYPES.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        <label>Categoria<input name="category" value={props.ticket?.category ?? ''} placeholder="Elevadores" /></label>
        <label>Prioridade<select name="priority" value={props.ticket?.priority || 'Normal'}>{PRIORITIES.filter((item) => item !== 'Todos').map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        <label>Estado<select name="status" value={props.ticket?.status || 'Novo'}>{STATUSES.filter((item) => item !== 'Todos').map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        <label>Responsavel<input name="assignee" value={props.ticket?.assignee ?? ''} placeholder="Joao Silva" /></label>
        <label>Prazo<input type="datetime-local" name="dueAt" value={toInputDateTime(props.ticket?.dueAt)} /></label>
        <label>Tags<input name="tags" value={props.ticket?.tags?.join(', ') ?? ''} placeholder="elevador, urgente" /></label>
        <label>ID manutencao<input name="linkedMaintenanceId" value={props.ticket?.linkedMaintenanceId ?? ''} placeholder="maint-001" /></label>
        <label>ID evento<input name="linkedCalendarEventId" value={props.ticket?.linkedCalendarEventId ?? ''} placeholder="cal-001" /></label>
        <label class="wide">Detalhe<textarea name="detail" value={props.ticket?.detail ?? ''} placeholder="Descricao operacional" /></label>
      </div>
      <div class="simple-header-actions">
        <button type="submit" class="primary-action" disabled={props.isSaving}>{props.isSaving ? 'A guardar...' : 'Guardar ticket'}</button>
      </div>
    </form>
  </section>
));

function ticketPayloadFromForm(form: HTMLFormElement, current?: Ticket): Record<string, unknown> {
  const data = new FormData(form);
  const status = stringField(data, 'status') || current?.status || 'Novo';
  return {
    title: stringField(data, 'title'),
    condominium: stringField(data, 'condominium') || 'Geral',
    requesterName: stringField(data, 'requesterName'),
    requesterEmail: stringField(data, 'requesterEmail'),
    channel: stringField(data, 'channel') || 'Portal',
    type: stringField(data, 'type') || 'Avaria',
    category: stringField(data, 'category') || 'Operacional',
    priority: stringField(data, 'priority') || 'Normal',
    status,
    assignee: stringField(data, 'assignee'),
    dueAt: stringField(data, 'dueAt'),
    detail: stringField(data, 'detail') || 'Ocorrencia registada',
    tags: splitList(stringField(data, 'tags')),
    linkedMaintenanceId: stringField(data, 'linkedMaintenanceId'),
    linkedCalendarEventId: stringField(data, 'linkedCalendarEventId'),
    createdAt: current?.createdAt || new Date().toISOString(),
    resolvedAt: isTicketClosed(status) ? current?.resolvedAt || new Date().toISOString() : '',
    updatedAt: new Date().toLocaleString('pt-PT')
  };
}

function stringField(data: FormData, key: string): string {
  return String(data.get(key) ?? '').trim();
}

function splitList(value: string): string[] {
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

function priorityTone(priority: string): string {
  if (priority === 'Urgente') return 'red';
  if (priority === 'Alta') return 'gold';
  if (priority === 'Baixa') return 'green';
  return 'blue';
}

function statusTone(status: string): string {
  const normalized = status.toLowerCase();
  if (normalized.includes('resolvido') || normalized.includes('fechado')) return 'green';
  if (normalized.includes('pend') || normalized.includes('espera')) return 'gold';
  if (normalized.includes('curso')) return 'blue';
  return 'red';
}

function toInputDateTime(value: string | undefined): string {
  return value ? value.slice(0, 16) : '';
}
