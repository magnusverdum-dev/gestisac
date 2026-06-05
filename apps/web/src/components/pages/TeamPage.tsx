import { component$, useSignal, type PropFunction } from '@builder.io/qwik';
import { SearchIcon, UserIcon } from 'lucide-qwik';
import type { ResourceState, TeamMember } from '../../lib/api';
import { entityPath, normalize } from '../../lib/entity-navigation';

type TeamPageProps = {
  resources: ResourceState;
  navigate$: PropFunction<(path: string) => void>;
};

export const TeamPage = component$((props: TeamPageProps) => {
  const search = useSignal('');
  const statusFilter = useSignal<'todos' | 'campo' | 'validacao' | 'livres'>('todos');
  const normalizedSearch = normalize(search.value);
  const members = props.resources.team
    .filter((member) => {
      if (statusFilter.value === 'campo') return member.inProgressTasks > 0;
      if (statusFilter.value === 'validacao') return member.pendingValidation > 0;
      if (statusFilter.value === 'livres') return member.openTasks === 0;
      return true;
    })
    .filter((member) =>
      normalizedSearch
        ? normalize(`${member.name} ${member.email} ${member.role}`).includes(normalizedSearch)
        : true
    )
    .sort((left, right) => right.openTasks - left.openTasks || left.name.localeCompare(right.name));

  const totals = {
    members: props.resources.team.length,
    open: props.resources.team.reduce((total, member) => total + member.openTasks, 0),
    field: props.resources.team.reduce((total, member) => total + member.inProgressTasks, 0),
    validation: props.resources.team.reduce((total, member) => total + member.pendingValidation, 0)
  };

  return (
    <section class="page-view operational-page team-page">
      <header class="page-header compact-page-header calendar-header">
        <div>
          <span class="page-eyebrow">GESTISAC - Equipa</span>
          <h1>Equipa</h1>
          <p>Funcionarios, responsabilidades e carga operacional ligada ao trabalho diario.</p>
        </div>
      </header>

      <div class="summary-grid simple-summary-grid">
        <button class="summary-card blue" type="button" onClick$={() => (statusFilter.value = 'todos')}>
          <span>Membros</span><strong>{totals.members}</strong><small>Utilizadores ativos</small>
        </button>
        <button class="summary-card gold" type="button" onClick$={() => (statusFilter.value = 'todos')}>
          <span>Abertas</span><strong>{totals.open}</strong><small>Tarefas por fechar</small>
        </button>
        <button class="summary-card purple" type="button" onClick$={() => (statusFilter.value = 'campo')}>
          <span>Em campo</span><strong>{totals.field}</strong><small>Execucao ativa</small>
        </button>
        <button class="summary-card green" type="button" onClick$={() => (statusFilter.value = 'validacao')}>
          <span>Validacao</span><strong>{totals.validation}</strong><small>A rever pelo HQ</small>
        </button>
      </div>

      <section class="glass-panel ops-workspace team-workspace">
        <div class="ops-panel-header calendar-toolbar">
          <div>
            <span class="page-eyebrow">Operacao interna</span>
            <h2>Funcionarios</h2>
          </div>
          <div class="ops-toolbar calendar-filters">
            <label class="ops-search">
              <SearchIcon size={16} />
              <input
                value={search.value}
                placeholder="Pesquisar por nome, email ou funcao"
                onInput$={(event) => (search.value = (event.target as HTMLInputElement).value)}
              />
            </label>
            <select value={statusFilter.value} onChange$={(event) => (statusFilter.value = (event.target as HTMLSelectElement).value as typeof statusFilter.value)}>
              <option value="todos">Todos</option>
              <option value="campo">Em campo</option>
              <option value="validacao">Com validacao</option>
              <option value="livres">Sem tarefas</option>
            </select>
          </div>
        </div>

        <div class="team-grid">
          {members.length ? members.map((member) => (
            <article class="team-member-card" key={member.id}>
              <div class="team-member-main">
                <div class="team-avatar"><UserIcon size={18} /></div>
                <div>
                  <strong>{member.name}</strong>
                  <span>{member.role || 'Sem funcao'} - {member.email}</span>
                </div>
              </div>
              <div class="team-load-grid">
                <Metric label="Abertas" value={member.openTasks} />
                <Metric label="Em curso" value={member.inProgressTasks} />
                <Metric label="Validacao" value={member.pendingValidation} />
              </div>
              <button
                type="button"
                class="secondary-action"
                onClick$={() => props.navigate$(entityPath('profile', member.name || member.id))}
              >
                Ver atividade
              </button>
              <small>{member.lastActivityAt ? `Ultima atividade: ${formatDate(member.lastActivityAt)}` : 'Sem atividade recente'}</small>
            </article>
          )) : (
            <div class="simple-empty-state">
              <strong>Sem equipa para mostrar</strong>
              <span>Quando existirem utilizadores carregados, aparecem aqui.</span>
            </div>
          )}
        </div>
      </section>
    </section>
  );
});

type MetricProps = {
  label: string;
  value: number;
};

const Metric = component$((props: MetricProps) => (
  <span>
    <strong>{props.value}</strong>
    <small>{props.label}</small>
  </span>
));

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString('pt-PT', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
}
