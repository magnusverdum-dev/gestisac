import { component$, useSignal, useTask$, type PropFunction } from '@builder.io/qwik';
import { EditIcon, MoreHorizontalIcon, PlusIcon, SearchIcon, Trash2Icon } from 'lucide-qwik';
import type { CalendarEvent, InspectionItem, ResourceEndpoint, ResourceState } from '../../lib/api';
import { calendarTypePath, condominiumPath, entityPath, slugify } from '../../lib/entity-navigation';
import { EntityAction } from '../common/EntityAction';

type CalendarPageProps = {
  resources: ResourceState;
  isSaving: boolean;
  initialType?: string;
  navigate$: PropFunction<(path: string) => void>;
  onCreate$: PropFunction<(resource: ResourceEndpoint, payload: Record<string, unknown>) => void>;
  onUpdate$: PropFunction<(resource: ResourceEndpoint, id: string, payload: Record<string, unknown>) => void>;
  onDelete$: PropFunction<(resource: ResourceEndpoint, id: string) => void>;
};

const EVENT_TYPES = ['Todos', 'Vistoria', 'Reuniao', 'Email', 'Manutencao', 'Ticket', 'Assembleia', 'Outro'];
const EVENT_STATUS = ['Todos', 'Planeado', 'Agendado', 'Confirmado', 'Rascunho', 'Concluido', 'Cancelado'];
const FORM_TYPES = EVENT_TYPES.filter((item) => item !== 'Todos');
const FORM_STATUS = EVENT_STATUS.filter((item) => item !== 'Todos');
const LINK_TYPES = ['ticket', 'maintenance', 'assembly', 'document', 'inspection', 'email'];

export const CalendarPage = component$((props: CalendarPageProps) => {
  const viewMode = useSignal<'month' | 'week' | 'list'>('month');
  const condominiumFilter = useSignal('Geral');
  const typeFilter = useSignal('Todos');
  const statusFilter = useSignal('Todos');
  const search = useSignal('');
  const selectedId = useSignal(props.resources.calendarEvents[0]?.id ?? '');
  const isCreating = useSignal(false);
  const editingId = useSignal('');
  const quickInspectionDate = useSignal('');
  const quickInspectionOpen = useSignal(false);

  useTask$(({ track }) => {
    const routedType = track(() => props.initialType);
    if (routedType) {
      typeFilter.value = routedType;
      selectedId.value = '';
    }
  });

  const condominiumOptions = ['Geral', ...props.resources.condominiums.map((item) => item.name)];
  const normalizedSearch = search.value.trim().toLowerCase();
  const filteredEvents = props.resources.calendarEvents
    .filter((event) => condominiumFilter.value === 'Geral' || event.condominium === condominiumFilter.value)
    .filter((event) =>
      typeFilter.value === 'Todos' ||
      (slugify(typeFilter.value) === 'ligacoes'
        ? Boolean(event.linkedEntityType || event.linkedEntityId)
        : event.eventType === typeFilter.value || slugify(event.eventType) === slugify(typeFilter.value))
    )
    .filter((event) => statusFilter.value === 'Todos' || event.status === statusFilter.value)
    .filter((event) => {
      if (!normalizedSearch) {
        return true;
      }

      return `${event.title} ${event.description} ${event.condominium} ${event.eventType} ${event.status}`
        .toLowerCase()
        .includes(normalizedSearch);
    })
    .sort((left, right) => left.startAt.localeCompare(right.startAt));
  const selectedEvent = filteredEvents.find((event) => event.id === selectedId.value) ?? filteredEvents[0];
  const editingEvent = props.resources.calendarEvents.find((event) => event.id === editingId.value);
  const linkedInspection = selectedEvent
    ? props.resources.inspections.find((item) =>
        item.id === selectedEvent.linkedEntityId ||
        item.calendarEventId === selectedEvent.id
      )
    : undefined;
  const now = new Date();
  const monthCells = buildMonthCells(now);
  const weekCells = buildWeekCells(now);
  const upcomingEvents = filteredEvents.filter((event) => toDateKey(event.startAt) >= toDateKey(now.toISOString())).slice(0, 6);
  const counts = {
    total: filteredEvents.length,
    inspections: filteredEvents.filter((event) => event.eventType === 'Vistoria').length,
    emails: filteredEvents.filter((event) => event.eventType === 'Email').length,
    linked: filteredEvents.filter((event) => event.linkedEntityType || event.linkedEntityId).length
  };

  return (
    <section class="page-view operational-page calendar-page">
      <header class="page-header compact-page-header calendar-header">
        <div>
          <span class="page-eyebrow">GESTISAC - Calendario</span>
          <h1>Calendario operacional</h1>
          <p>Agenda ligada a vistorias, reunioes, emails planeados, tickets e manutencao.</p>
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
          Adicionar evento
        </button>
      </header>

      <div class="summary-grid simple-summary-grid">
        <button class="summary-card blue" type="button" onClick$={() => props.navigate$('/calendario')}>
          <span>Eventos filtrados</span><strong>{counts.total}</strong><small>Grelha atual</small>
        </button>
        <button class="summary-card gold" type="button" onClick$={() => props.navigate$(calendarTypePath('Vistoria'))}>
          <span>Vistorias</span><strong>{counts.inspections}</strong><small>Verificacoes e estados</small>
        </button>
        <button class="summary-card green" type="button" onClick$={() => props.navigate$(calendarTypePath('Email'))}>
          <span>Emails</span><strong>{counts.emails}</strong><small>Planeamento sem envio real</small>
        </button>
        <button class="summary-card purple" type="button" onClick$={() => props.navigate$(calendarTypePath('Ligacoes'))}>
          <span>Ligacoes</span><strong>{counts.linked}</strong><small>Tickets/manutencao/documentos</small>
        </button>
      </div>

      <section class="glass-panel ops-panel calendar-shell">
        <div class="ops-panel-header calendar-toolbar">
          <div>
            <span class="page-eyebrow">{monthLabel(now)}</span>
            <h2>Agenda</h2>
          </div>
          <div class="ops-toolbar calendar-filters">
            <label class="ops-search">
              <SearchIcon size={16} />
              <input
                value={search.value}
                placeholder="Pesquisar evento..."
                onInput$={(event) => (search.value = (event.target as HTMLInputElement).value)}
              />
            </label>
            <select value={condominiumFilter.value} onChange$={(event) => (condominiumFilter.value = (event.target as HTMLSelectElement).value)}>
              {condominiumOptions.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
            <select value={typeFilter.value} onChange$={(event) => (typeFilter.value = (event.target as HTMLSelectElement).value)}>
              {EVENT_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
            <select value={statusFilter.value} onChange$={(event) => (statusFilter.value = (event.target as HTMLSelectElement).value)}>
              {EVENT_STATUS.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </div>
        </div>

        <div class="calendar-view-switch" role="tablist" aria-label="Vista do calendario">
          {(['month', 'week', 'list'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              class={viewMode.value === mode ? 'active' : ''}
              onClick$={() => (viewMode.value = mode)}
            >
              {mode === 'month' ? 'Mes' : mode === 'week' ? 'Semana' : 'Lista'}
            </button>
          ))}
        </div>

        {quickInspectionOpen.value ? (
          <section class="quick-inspection-panel">
            <div>
              <span class="page-eyebrow">Agendar vistoria</span>
              <strong>{quickInspectionDate.value}</strong>
            </div>
            <form
              preventdefault:submit
              onSubmit$={async (event) => {
                const form = event.target as HTMLFormElement;
                await props.onCreate$('inspections', inspectionPayloadFromQuickForm(form, quickInspectionDate.value));
                form.reset();
                quickInspectionOpen.value = false;
              }}
            >
              <label>Titulo<input name="title" placeholder="Vistoria ao condominio" required /></label>
              <label>Condominio<select name="condominium" value={condominiumFilter.value}>
                {condominiumOptions.map((name) => <option key={name} value={name}>{name}</option>)}
              </select></label>
              <label>Trabalhador<input name="assignedWorkerId" placeholder="worker-demo-1" required /></label>
              <label>Local<input name="location" placeholder="Bloco, piso ou zona" /></label>
              <button class="primary-action" type="submit" disabled={props.isSaving}>
                {props.isSaving ? 'A guardar...' : 'Agendar'}
              </button>
              <button type="button" class="secondary-action" onClick$={() => (quickInspectionOpen.value = false)}>
                Cancelar
              </button>
            </form>
          </section>
        ) : null}

        <div class="calendar-layout">
          <div class="calendar-main-panel">
            {viewMode.value === 'month' ? (
              <div class="calendar-grid month-grid">
                {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'].map((day) => <strong key={day}>{day}</strong>)}
                {monthCells.map((date) => {
                  const dateKey = toDateKey(date.toISOString());
                  const dayEvents = filteredEvents.filter((event) => toDateKey(event.startAt) === dateKey).slice(0, 3);
                  const isOutside = date.getMonth() !== now.getMonth();
                  return (
                    <article
                      class={`calendar-day ${isOutside ? 'muted' : ''}`}
                      key={dateKey}
                      onContextMenu$={(event) => {
                        event.preventDefault();
                        quickInspectionDate.value = dateKey;
                        quickInspectionOpen.value = true;
                        isCreating.value = false;
                        editingId.value = '';
                      }}
                    >
                      <span>{date.getDate()}</span>
                      <div>
                        {dayEvents.map((event) => (
                          <button
                            key={event.id}
                            type="button"
                            class={`calendar-event-chip ${toneForType(event.eventType)}`}
                            onClick$={() => (selectedId.value = event.id)}
                          >
                            {shortTime(event.startAt)} {event.title}
                          </button>
                        ))}
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : null}

            {viewMode.value === 'week' ? (
              <div class="calendar-week-list">
                {weekCells.map((date) => {
                  const dateKey = toDateKey(date.toISOString());
                  const dayEvents = filteredEvents.filter((event) => toDateKey(event.startAt) === dateKey);
                  return (
                    <article class="calendar-week-day" key={dateKey}>
                      <div>
                        <strong>{weekdayLabel(date)}</strong>
                        <span>{date.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })}</span>
                      </div>
                      <div class="calendar-list-stack">
                        {dayEvents.length ? dayEvents.map((event) => (
                          <button
                            key={event.id}
                            type="button"
                            class={`calendar-list-item ${selectedEvent?.id === event.id ? 'active' : ''}`}
                            onClick$={() => props.navigate$(entityPath('calendarEvent', event.id))}
                          >
                            <span class={`event-dot ${toneForType(event.eventType)}`} />
                            <strong>{event.title}</strong>
                            <small>{shortTime(event.startAt)} - {event.status}</small>
                          </button>
                        )) : <span class="calendar-empty-note">Sem eventos neste dia.</span>}
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : null}

            {viewMode.value === 'list' ? (
              <div class="calendar-list-stack padded">
                {filteredEvents.length ? filteredEvents.map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    class={`calendar-list-item ${selectedEvent?.id === event.id ? 'active' : ''}`}
                    onClick$={() => props.navigate$(entityPath('calendarEvent', event.id))}
                  >
                    <span class={`event-dot ${toneForType(event.eventType)}`} />
                    <strong>{event.title}</strong>
                    <span>{event.condominium || 'Geral'} - {event.eventType}</span>
                    <small>{formatDateTime(event.startAt)} - {event.status}</small>
                  </button>
                )) : <EmptyCalendar />}
              </div>
            ) : null}
          </div>

          <aside class="calendar-side-panel">
            <section class="simple-detail-panel compact">
              <strong>Proximos eventos</strong>
              <div class="calendar-mini-list">
                {upcomingEvents.length ? upcomingEvents.map((event) => (
                  <button key={event.id} type="button" onClick$={() => props.navigate$(entityPath('calendarEvent', event.id))}>
                    <span class={`event-dot ${toneForType(event.eventType)}`} />
                    <strong>{event.title}</strong>
                    <small>{formatDateTime(event.startAt)}</small>
                  </button>
                )) : <span class="calendar-empty-note">Sem proximos eventos.</span>}
              </div>
            </section>

            {selectedEvent ? (
              <section class="simple-detail-panel calendar-detail-card">
                <div class="simple-detail-header">
                  <div>
                    <span class="page-eyebrow">{selectedEvent.eventType}</span>
                    <h2>{selectedEvent.title}</h2>
                    <p>{selectedEvent.condominium || 'Geral'} - {selectedEvent.status}</p>
                  </div>
                  <details class="simple-more-menu">
                    <summary><MoreHorizontalIcon size={16} /></summary>
                    <button
                      type="button"
                      onClick$={() => {
                        editingId.value = selectedEvent.id;
                        isCreating.value = false;
                      }}
                    >
                      <EditIcon size={14} /> Editar
                    </button>
                    <button
                      type="button"
                      onClick$={async () => {
                        const duplicate = eventToPayload(selectedEvent);
                        duplicate.title = `Copia - ${selectedEvent.title}`;
                        await props.onCreate$('calendar-events', duplicate);
                      }}
                    >
                      Duplicar
                    </button>
                    <button
                      type="button"
                      class="danger-action"
                      onClick$={async () => {
                        if (confirm(`Apagar ${selectedEvent.title}?`)) {
                          await props.onDelete$('calendar-events', selectedEvent.id);
                          selectedId.value = '';
                        }
                      }}
                    >
                      <Trash2Icon size={14} /> Apagar
                    </button>
                  </details>
                </div>
                <dl class="calendar-detail-list">
                  <div><dt>Inicio</dt><dd>{formatDateTime(selectedEvent.startAt)}</dd></div>
                  <div><dt>Fim</dt><dd>{formatDateTime(selectedEvent.endAt)}</dd></div>
                  <div><dt>Local</dt><dd>{selectedEvent.location || 'Por definir'}</dd></div>
                  <div>
                    <dt>Ligacao</dt>
                    <dd>
                      <EntityAction
                        class="entity-inline-link compact"
                        path={linkedPathForEvent(selectedEvent)}
                        navigate$={props.navigate$}
                        disabled={!linkedPathForEvent(selectedEvent)}
                      >
                        {selectedEvent.linkedEntityType || 'Sem ligacao'} {selectedEvent.linkedEntityId ? `- ${selectedEvent.linkedEntityId}` : ''}
                      </EntityAction>
                    </dd>
                  </div>
                </dl>
                <EntityAction class="entity-inline-link" path={condominiumPath(props.resources, selectedEvent.condominium)} navigate$={props.navigate$}>
                  Abrir condominio: {selectedEvent.condominium || 'Geral'}
                </EntityAction>
                <p>{selectedEvent.description || 'Sem descricao.'}</p>
                {selectedEvent.eventType === 'Email' ? (
                  <div class="calendar-email-note">
                    Email apenas planeado/registado. Nao existe envio real nesta fase.
                  </div>
                ) : null}
                {selectedEvent.attendees.length ? (
                  <div class="calendar-badges">
                    {selectedEvent.attendees.map((attendee) => <span key={attendee}>{attendee}</span>)}
                  </div>
                ) : null}
                {linkedInspection ? (
                  <div class="simple-header-actions">
                    {linkedInspection.status === 'Planeada' ? (
                      <button
                        type="button"
                        class="secondary-action"
                        disabled={props.isSaving}
                        onClick$={async () => {
                          await props.onUpdate$('inspections', linkedInspection.id, inspectionPayloadForCalendar(linkedInspection, {
                            status: 'Submetida',
                            submittedAt: new Date().toISOString()
                          }));
                        }}
                      >
                        Marcar submetida
                      </button>
                    ) : null}
                    {linkedInspection.status === 'Submetida' ? (
                      <button
                        type="button"
                        class="primary-action"
                        disabled={props.isSaving}
                        onClick$={async () => {
                          await props.onUpdate$('inspections', linkedInspection.id, inspectionPayloadForCalendar(linkedInspection, {
                            status: 'Confirmada',
                            confirmedAt: new Date().toISOString()
                          }));
                        }}
                      >
                        Validar vistoria
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </section>
            ) : null}
          </aside>
        </div>
      </section>

      {isCreating.value || editingEvent ? (
        <section class="glass-panel simple-form-panel calendar-form-panel">
          <div class="simple-content-header">
            <div>
              <span class="page-eyebrow">{editingEvent ? 'Editar' : 'Novo evento'}</span>
              <h2>{editingEvent ? editingEvent.title : 'Adicionar evento'}</h2>
            </div>
            <button
              type="button"
              class="secondary-action"
              onClick$={() => {
                isCreating.value = false;
                editingId.value = '';
              }}
            >
              Fechar
            </button>
          </div>
          <form
            preventdefault:submit
            onSubmit$={async (event) => {
              const form = event.target as HTMLFormElement;
              const payload = eventPayloadFromForm(form);
              if (editingEvent) {
                await props.onUpdate$('calendar-events', editingEvent.id, payload);
              } else {
                await props.onCreate$('calendar-events', payload);
              }
              isCreating.value = false;
              editingId.value = '';
            }}
          >
            <div class="ops-form-grid">
              <label>Titulo<input name="title" value={editingEvent?.title ?? ''} placeholder="Vistoria aos elevadores" required /></label>
              <label>Condominio<select name="condominium" value={editingEvent?.condominium || condominiumFilter.value}>
                {condominiumOptions.map((name) => <option key={name} value={name === 'Geral' ? 'Geral' : name}>{name}</option>)}
              </select></label>
              <label>Tipo<select name="eventType" value={editingEvent?.eventType || 'Vistoria'}>
                {FORM_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
              </select></label>
              <label>Estado<select name="status" value={editingEvent?.status || 'Planeado'}>
                {FORM_STATUS.map((status) => <option key={status} value={status}>{status}</option>)}
              </select></label>
              <label>Inicio<input type="datetime-local" name="startAt" value={toInputDateTime(editingEvent?.startAt)} required /></label>
              <label>Fim<input type="datetime-local" name="endAt" value={toInputDateTime(editingEvent?.endAt)} /></label>
              <label>Ligacao<select name="linkedEntityType" value={editingEvent?.linkedEntityType || ''}>
                <option value="">Sem ligacao</option>
                {LINK_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
              </select></label>
              <label>ID ligado<input name="linkedEntityId" value={editingEvent?.linkedEntityId ?? ''} placeholder="ticket-001" /></label>
              <label>Local<input name="location" value={editingEvent?.location ?? ''} placeholder="Sala do condominio" /></label>
              <label>Participantes<input name="attendees" value={editingEvent?.attendees.join(', ') ?? ''} placeholder="email1, email2" /></label>
              <label class="wide">Descricao<textarea name="description" value={editingEvent?.description ?? ''} placeholder="Resumo do evento" /></label>
              <label class="wide">Notas<textarea name="notes" value={editingEvent?.notes ?? ''} placeholder="Notas internas" /></label>
            </div>
            <div class="simple-header-actions">
              <button type="submit" class="primary-action" disabled={props.isSaving}>
                {props.isSaving ? 'A guardar...' : 'Guardar evento'}
              </button>
            </div>
          </form>
        </section>
      ) : null}
    </section>
  );
});

const EmptyCalendar = component$(() => (
  <div class="simple-empty-state">
    <strong>Sem eventos</strong>
    <span>Ajusta os filtros ou adiciona um evento para comecar.</span>
  </div>
));

function eventPayloadFromForm(form: HTMLFormElement): Record<string, unknown> {
  const data = new FormData(form);
  return {
    title: stringField(data, 'title'),
    condominium: stringField(data, 'condominium') || 'Geral',
    eventType: stringField(data, 'eventType') || 'Outro',
    status: stringField(data, 'status') || 'Planeado',
    startAt: stringField(data, 'startAt'),
    endAt: stringField(data, 'endAt') || stringField(data, 'startAt'),
    linkedEntityType: stringField(data, 'linkedEntityType'),
    linkedEntityId: stringField(data, 'linkedEntityId'),
    location: stringField(data, 'location'),
    description: stringField(data, 'description'),
    notes: stringField(data, 'notes'),
    attendees: splitList(stringField(data, 'attendees'))
  };
}

function inspectionPayloadFromQuickForm(form: HTMLFormElement, requiredDate: string): Record<string, unknown> {
  const data = new FormData(form);
  return {
    title: stringField(data, 'title'),
    condominium: stringField(data, 'condominium') || 'Geral',
    location: stringField(data, 'location'),
    requiredDate,
    status: 'Planeada',
    result: 'Pendente',
    checklist: [],
    workerNotes: '',
    hqNotes: '',
    submittedAt: '',
    confirmedAt: '',
    confirmedBy: '',
    calendarEventId: '',
    assignedWorkerId: stringField(data, 'assignedWorkerId')
  };
}

function inspectionPayloadForCalendar(
  item: InspectionItem,
  overrides: Partial<InspectionItem> = {}
): Record<string, unknown> {
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
    calendarEventId: overrides.calendarEventId ?? item.calendarEventId,
    assignedWorkerId: overrides.assignedWorkerId ?? item.assignedWorkerId
  };
}

function eventToPayload(event: CalendarEvent): Record<string, unknown> {
  return {
    title: event.title,
    condominium: event.condominium || 'Geral',
    eventType: event.eventType,
    status: event.status,
    startAt: event.startAt,
    endAt: event.endAt,
    linkedEntityType: event.linkedEntityType,
    linkedEntityId: event.linkedEntityId,
    location: event.location,
    description: event.description,
    notes: event.notes,
    attendees: event.attendees
  };
}

function stringField(data: FormData, key: string): string {
  return String(data.get(key) ?? '').trim();
}

function splitList(value: string): string[] {
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

function buildMonthCells(reference: Date): Date[] {
  const first = new Date(reference.getFullYear(), reference.getMonth(), 1);
  const mondayIndex = (first.getDay() + 6) % 7;
  const start = new Date(first);
  start.setDate(first.getDate() - mondayIndex);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

function buildWeekCells(reference: Date): Date[] {
  const mondayIndex = (reference.getDay() + 6) % 7;
  const start = new Date(reference);
  start.setHours(0, 0, 0, 0);
  start.setDate(reference.getDate() - mondayIndex);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

function toDateKey(value: string): string {
  return value.slice(0, 10);
}

function toInputDateTime(value: string | undefined): string {
  if (!value) {
    return '';
  }

  return value.slice(0, 16);
}

function shortTime(value: string): string {
  return value.includes('T') ? value.slice(11, 16) : value.slice(-5);
}

function formatDateTime(value: string): string {
  if (!value) {
    return 'Por definir';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString('pt-PT', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function monthLabel(value: Date): string {
  return value.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' });
}

function weekdayLabel(value: Date): string {
  return value.toLocaleDateString('pt-PT', { weekday: 'long' });
}

function toneForType(type: string): string {
  const normalized = type.toLowerCase();
  if (normalized.includes('email')) return 'green';
  if (normalized.includes('vist') || normalized.includes('manut')) return 'gold';
  if (normalized.includes('reun') || normalized.includes('assemble')) return 'purple';
  if (normalized.includes('ticket')) return 'red';
  return 'blue';
}

function linkedPathForEvent(event: CalendarEvent): string {
  const normalized = event.linkedEntityType.toLowerCase();
  if (!event.linkedEntityId) {
    return '';
  }

  if (normalized.includes('ticket')) {
    return entityPath('ticket', event.linkedEntityId);
  }
  if (normalized.includes('maintenance') || normalized.includes('manutencao')) {
    return entityPath('maintenance', event.linkedEntityId);
  }
  if (normalized.includes('inspection') || normalized.includes('vistoria')) {
    return entityPath('inspection', event.linkedEntityId);
  }
  if (normalized.includes('document')) {
    return entityPath('document', event.linkedEntityId);
  }
  if (normalized.includes('condominium') || normalized.includes('condominio')) {
    return entityPath('condominium', event.linkedEntityId);
  }

  return '';
}
