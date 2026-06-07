import { component$, useSignal, type PropFunction } from '@builder.io/qwik';
import {
  CalendarDaysIcon,
  ClipboardListIcon,
  ShieldCheckIcon,
  WrenchIcon
} from 'lucide-qwik';
import type { AppContext, PublicUser, ResourceState } from '../../lib/api';
import {
  entityPath,
  isCalendarClosed,
  isMaintenanceClosed,
  isTicketClosed,
  normalize
} from '../../lib/entity-navigation';
import {
  ContextPanel,
  EmptyOperationalState,
  MetricStrip,
  OperationalList,
  OperationalPageLayout,
  OperationalToolbar,
  PrimaryActionBar,
  RelationChipRow,
  SelectionHeader
} from '../operations/CommandCenter';

type TasksPageProps = {
  appContext: AppContext;
  currentUser: PublicUser | null;
  resources: ResourceState;
  navigate$: PropFunction<(path: string) => void>;
};

type TaskKind = 'pedido' | 'manutencao' | 'vistoria' | 'agenda';
type TaskFilter = 'todas' | 'hoje' | 'em-curso' | 'validacao' | 'atrasadas';

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

export const TasksPage = component$((props: TasksPageProps) => {
  const search = useSignal('');
  const quickFilter = useSignal<TaskFilter>('todas');
  const selectedKey = useSignal('');
  const normalizedSearch = normalize(search.value);
  const allTasks = buildTasks(props.resources, props.appContext, props.currentUser);
  const tasks = allTasks
    .filter((task) => matchQuickFilter(task, quickFilter.value))
    .filter((task) =>
      normalizedSearch
        ? normalize(`${task.title} ${task.meta} ${task.status} ${task.assignee}`).includes(normalizedSearch)
        : true
    )
    .sort((left, right) => taskRank(left) - taskRank(right) || left.dueAt.localeCompare(right.dueAt));
  const selected = tasks.find((task) => rowKey(task) === selectedKey.value) ?? tasks[0];

  return (
    <OperationalPageLayout
      eyebrow="GESTISAC - Tarefas"
      title="Tarefas"
      description="Fila operacional composta: pedidos, manutencao, vistorias e agenda."
    >
      <MetricStrip
        q:slot="metrics"
        activeId={quickFilter.value}
        onSelect$={(id) => (quickFilter.value = id as TaskFilter)}
        items={[
          { id: 'todas', label: 'Todas', value: allTasks.length, detail: 'Vista agregada', tone: 'info' },
          { id: 'hoje', label: 'Hoje', value: allTasks.filter(isTodayTask).length, detail: 'Prazo do dia', tone: 'neutral' },
          { id: 'em-curso', label: 'Em curso', value: allTasks.filter((task) => normalize(task.status).includes('curso')).length, detail: 'No terreno', tone: 'warning' },
          { id: 'validacao', label: 'Validacao', value: allTasks.filter(needsValidation).length, detail: 'A rever', tone: 'danger' },
          { id: 'atrasadas', label: 'Atrasadas', value: allTasks.filter(isOverdueTask).length, detail: 'Intervencao urgente', tone: 'danger' }
        ]}
      />

      <OperationalToolbar
        title="Fila de trabalho"
        eyebrow="Operacao diaria"
        searchValue={search.value}
        searchPlaceholder="Pesquisar tarefa, condominio ou responsavel"
        onSearch$={(value) => (search.value = value)}
      >
        <select value={quickFilter.value} onChange$={(event) => (quickFilter.value = (event.target as HTMLSelectElement).value as TaskFilter)}>
          <option value="todas">Todas</option>
          <option value="hoje">Hoje</option>
          <option value="em-curso">Em curso</option>
          <option value="validacao">Validacao</option>
          <option value="atrasadas">Atrasadas</option>
        </select>
      </OperationalToolbar>

      <OperationalList>
        {tasks.length ? tasks.map((task) => (
          <button
            key={rowKey(task)}
            type="button"
            class={`cc-row-button ${selected && rowKey(selected) === rowKey(task) ? 'selected' : ''}`}
            onClick$={() => (selectedKey.value = rowKey(task))}
          >
            <div class="cc-row-leading">
              <span class={`cc-kind-pill ${task.kind}`}>{iconForTask(task.kind)}</span>
              <div class="cc-row-main">
                <strong>{task.title}</strong>
                <span>{task.meta}</span>
              </div>
            </div>
            <div class="cc-row-meta">
              <small>{task.assignee || 'Por atribuir'}</small>
              <strong>{task.status}</strong>
            </div>
          </button>
        )) : (
          <EmptyOperationalState>
            <strong>Sem tarefas nesta vista</strong>
            <span>Ajusta os filtros ou pesquisa para voltar a encontrar trabalho.</span>
          </EmptyOperationalState>
        )}
      </OperationalList>

      <ContextPanel
        q:slot="panel"
        eyebrow="Contexto da tarefa"
        title={selected?.title || 'Sem tarefa selecionada'}
        subtitle={selected?.meta || 'Escolhe uma linha para abrir o contexto'}
        status={selected?.status}
      >
        {selected ? (
          <>
            <SelectionHeader
              title={selected.title}
              subtitle={`${selected.priority || 'Normal'} - ${selected.assignee || 'Por atribuir'}`}
              status={selected.dueAt || 'Sem prazo'}
            />
            <RelationChipRow
              items={[
                { label: taskKindLabel(selected.kind), tone: 'info' },
                { label: selected.priority || 'Normal', tone: toneForTask(selected) },
                { label: isOverdueTask(selected) ? 'Atrasada' : 'Dentro do prazo', tone: isOverdueTask(selected) ? 'danger' : 'success' }
              ]}
            />
            <PrimaryActionBar>
              <button class="primary-action" type="button" onClick$={() => props.navigate$(selected.path)}>
                Abrir origem
              </button>
              <button class="secondary-action" type="button" onClick$={() => props.navigate$('/tickets')}>
                Ver pedidos
              </button>
            </PrimaryActionBar>
          </>
        ) : (
          <EmptyOperationalState>
            <strong>Sem detalhe disponivel</strong>
            <span>Seleciona uma tarefa na lista principal.</span>
          </EmptyOperationalState>
        )}
      </ContextPanel>
    </OperationalPageLayout>
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
  if (needsValidation(task)) return 2;
  return 4;
}

function matchQuickFilter(task: OperationalTask, filter: TaskFilter): boolean {
  if (filter === 'hoje') return isTodayTask(task);
  if (filter === 'em-curso') return normalize(task.status).includes('curso');
  if (filter === 'validacao') return needsValidation(task);
  if (filter === 'atrasadas') return isOverdueTask(task);
  return true;
}

function needsValidation(task: OperationalTask): boolean {
  return normalize(task.priority).includes('valid') || normalize(task.status).includes('submet');
}

function isTodayTask(task: OperationalTask): boolean {
  if (!task.dueAt) return false;
  return task.dueAt.slice(0, 10) === new Date().toISOString().slice(0, 10);
}

function isOverdueTask(task: OperationalTask): boolean {
  if (!task.dueAt || isClosedTask(task)) return false;
  return Date.parse(task.dueAt) < Date.now();
}

function taskKindLabel(kind: TaskKind): string {
  if (kind === 'pedido') return 'Pedido';
  if (kind === 'manutencao') return 'Manutencao';
  if (kind === 'vistoria') return 'Vistoria';
  return 'Agenda';
}

function toneForTask(task: OperationalTask): 'danger' | 'warning' | 'success' | 'info' {
  if (isOverdueTask(task)) return 'danger';
  if (normalize(task.status).includes('curso')) return 'warning';
  if (isClosedTask(task)) return 'success';
  return 'info';
}

function iconForTask(kind: TaskKind) {
  if (kind === 'pedido') return <ClipboardListIcon size={14} />;
  if (kind === 'manutencao') return <WrenchIcon size={14} />;
  if (kind === 'vistoria') return <ShieldCheckIcon size={14} />;
  return <CalendarDaysIcon size={14} />;
}

function rowKey(task: OperationalTask): string {
  return `${task.kind}:${task.id}`;
}
