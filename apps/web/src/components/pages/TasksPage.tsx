import { component$, useSignal, type PropFunction } from '@builder.io/qwik';
import { CalendarDaysIcon, ClipboardListIcon, SearchIcon, WrenchIcon } from 'lucide-qwik';
import type { AppContext, PublicUser, ResourceState } from '../../lib/api';
import {
  entityPath,
  isCalendarClosed,
  isMaintenanceClosed,
  isTicketClosed,
  normalize
} from '../../lib/entity-navigation';

type TasksPageProps = {
  appContext: AppContext;
  currentUser: PublicUser | null;
  resources: ResourceState;
  navigate$: PropFunction<(path: string) => void>;
};

type TaskKind = 'pedido' | 'manutencao' | 'vistoria' | 'agenda';

type OperationalTask = {
  id: string;
  kind: TaskKind;
  title: string;
  meta: string;
  status: string;
  priority: string;
  dueAt: string;
  assignee: string;
  path: string;
};

const FILTERS: Array<{ id: 'todas' | TaskKind; label: string }> = [
  { id: 'todas', label: 'Todas' },
  { id: 'pedido', label: 'Pedidos' },
  { id: 'manutencao', label: 'Manutencao' },
  { id: 'vistoria', label: 'Vistorias' },
  { id: 'agenda', label: 'Agenda' }
];

export const TasksPage = component$((props: TasksPageProps) => {
  const search = useSignal('');
  const kindFilter = useSignal<'todas' | TaskKind>('todas');
  const normalizedSearch = normalize(search.value);
  const tasks = buildTasks(props.resources, props.appContext, props.currentUser)
    .filter((task) => kindFilter.value === 'todas' || task.kind === kindFilter.value)
    .filter((task) =>
      normalizedSearch
        ? normalize(`${task.title} ${task.meta} ${task.status} ${task.assignee}`).includes(normalizedSearch)
        : true
    )
    .sort((left, right) => taskRank(left) - taskRank(right) || left.dueAt.localeCompare(right.dueAt));
  const openTasks = tasks.filter((task) => !isClosedTask(task)).length;
  const urgentTasks = tasks.filter((task) => normalize(task.priority).includes('urgent')).length;
  const inProgressTasks = tasks.filter((task) => normalize(task.status).includes('curso')).length;

  return (
    <section class="page-view operational-page tasks-page">
      <header class="page-header compact-page-header calendar-header">
        <div>
          <span class="page-eyebrow">GESTISAC - Tarefas</span>
          <h1>Tarefas</h1>
          <p>Fila unica do dia a dia: pedidos, manutencao, vistorias e eventos operacionais.</p>
        </div>
      </header>

      <div class="summary-grid simple-summary-grid">
        <button class="summary-card blue" type="button" onClick$={() => (kindFilter.value = 'todas')}>
          <span>Total</span><strong>{tasks.length}</strong><small>Vista atual</small>
        </button>
        <button class="summary-card gold" type="button" onClick$={() => (kindFilter.value = 'todas')}>
          <span>Abertas</span><strong>{openTasks}</strong><small>Por concluir</small>
        </button>
        <button class="summary-card red" type="button" onClick$={() => (kindFilter.value = 'pedido')}>
          <span>Urgentes</span><strong>{urgentTasks}</strong><small>Resposta rapida</small>
        </button>
        <button class="summary-card purple" type="button" onClick$={() => (kindFilter.value = 'todas')}>
          <span>Em curso</span><strong>{inProgressTasks}</strong><small>No terreno</small>
        </button>
      </div>

      <section class="glass-panel ops-workspace tasks-workspace">
        <div class="ops-panel-header calendar-toolbar">
          <div>
            <span class="page-eyebrow">Operacao diaria</span>
            <h2>Fila de trabalho</h2>
          </div>
          <div class="ops-toolbar calendar-filters">
            <label class="ops-search">
              <SearchIcon size={16} />
              <input
                value={search.value}
                placeholder="Pesquisar tarefa, condominio ou responsavel"
                onInput$={(event) => (search.value = (event.target as HTMLInputElement).value)}
              />
            </label>
            <select value={kindFilter.value} onChange$={(event) => (kindFilter.value = (event.target as HTMLSelectElement).value as typeof kindFilter.value)}>
              {FILTERS.map((filter) => <option key={filter.id} value={filter.id}>{filter.label}</option>)}
            </select>
          </div>
        </div>

        <div class="tasks-list">
          {tasks.length ? tasks.map((task) => (
            <button
              type="button"
              class={`task-row ${task.kind} ${isClosedTask(task) ? 'done' : ''}`}
              key={`${task.kind}-${task.id}`}
              onClick$={() => props.navigate$(task.path)}
            >
              <span class="task-kind-icon">{iconForTask(task.kind)}</span>
              <span>
                <strong>{task.title}</strong>
                <small>{task.meta}</small>
              </span>
              <span class="task-meta">
                <small>{task.assignee || 'Por atribuir'}</small>
                <strong>{task.status}</strong>
              </span>
              <span class={`status-chip ${toneForTask(task)}`}>{task.priority || 'Normal'}</span>
            </button>
          )) : (
            <div class="simple-empty-state">
              <strong>Sem tarefas nesta vista</strong>
              <span>Ajusta os filtros ou volta a Todas.</span>
            </div>
          )}
        </div>
      </section>
    </section>
  );
});

function buildTasks(resources: ResourceState, appContext: AppContext, currentUser: PublicUser | null): OperationalTask[] {
  const userMatch = (value: string) => {
    if (appContext !== 'worker' || !currentUser) {
      return true;
    }
    const normalized = normalize(value);
    return [currentUser.id, currentUser.name, currentUser.email]
      .map(normalize)
      .some((candidate) => candidate && normalized.includes(candidate));
  };

  return [
    ...resources.ocorrencias
      .filter((item) => userMatch(`${item.assignedWorkerId} ${item.atribuidoA}`))
      .map((item) => ({
        id: item.id,
        kind: 'pedido' as const,
        title: item.titulo,
        meta: `${item.tipo} - ${condominiumName(resources, item.condominiumId)}`,
        status: item.status,
        priority: item.prioridade,
        dueAt: item.slaResolucaoEm || item.atualizadoEm,
        assignee: item.atribuidoA || item.assignedWorkerId,
        path: entityPath('ticket', item.id)
      })),
    ...resources.maintenance.map((item) => ({
      id: item.id,
      kind: 'manutencao' as const,
      title: item.title,
      meta: `${item.condominium || 'Geral'} - ${item.supplier || 'Fornecedor por definir'}`,
      status: item.status,
      priority: item.priority || 'Normal',
      dueAt: item.scheduledStart || item.date,
      assignee: item.supplier,
      path: entityPath('maintenance', item.id)
    })),
    ...resources.inspections
      .filter((item) => userMatch(item.assignedWorkerId))
      .map((item) => ({
        id: item.id,
        kind: 'vistoria' as const,
        title: item.title,
        meta: `${item.condominium || 'Geral'} - ${item.location || 'Local por definir'}`,
        status: item.status,
        priority: item.status === 'Submetida' ? 'Validacao' : 'Normal',
        dueAt: item.requiredDate || item.submittedAt,
        assignee: item.assignedWorkerId,
        path: entityPath('inspection', item.id)
      })),
    ...resources.calendarEvents.map((item) => ({
      id: item.id,
      kind: 'agenda' as const,
      title: item.title,
      meta: `${item.condominium || 'Geral'} - ${item.eventType}`,
      status: item.status,
      priority: item.eventType,
      dueAt: item.startAt,
      assignee: item.attendees.join(', '),
      path: entityPath('calendarEvent', item.id)
    }))
  ];
}

function condominiumName(resources: ResourceState, id: string): string {
  return resources.condominiums.find((item) => item.id === id)?.name || id || 'Geral';
}

function isClosedTask(task: OperationalTask): boolean {
  if (task.kind === 'pedido') return isTicketClosed(task.status);
  if (task.kind === 'manutencao') return isMaintenanceClosed(task.status);
  if (task.kind === 'agenda') return isCalendarClosed(task.status);
  return normalize(task.status).includes('confirm') || normalize(task.status).includes('conclu');
}

function taskRank(task: OperationalTask): number {
  if (isClosedTask(task)) return 8;
  if (normalize(task.priority).includes('urgent')) return 0;
  if (normalize(task.status).includes('curso')) return 1;
  if (normalize(task.status).includes('submet')) return 2;
  return 4;
}

function toneForTask(task: OperationalTask): string {
  if (isClosedTask(task)) return 'success';
  if (normalize(task.priority).includes('urgent')) return 'danger';
  if (normalize(task.status).includes('curso')) return 'warning';
  return 'info';
}

function iconForTask(kind: TaskKind) {
  if (kind === 'manutencao') return <WrenchIcon size={17} />;
  if (kind === 'vistoria') return <ClipboardListIcon size={17} />;
  if (kind === 'agenda') return <CalendarDaysIcon size={17} />;
  return <ClipboardListIcon size={17} />;
}
