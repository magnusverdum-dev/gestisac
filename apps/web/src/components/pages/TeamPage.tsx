import { component$, useSignal, type PropFunction } from '@builder.io/qwik';
import { UserIcon } from 'lucide-qwik';
import type { ResourceState, TeamMember } from '../../lib/api';
import { entityPath, normalize } from '../../lib/entity-navigation';
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

type TeamPageProps = {
  resources: ResourceState;
  navigate$: PropFunction<(path: string) => void>;
};

export const TeamPage = component$((props: TeamPageProps) => {
  const search = useSignal('');
  const statusFilter = useSignal<'todos' | 'campo' | 'validacao' | 'livres'>('todos');
  const selectedId = useSignal(props.resources.team[0]?.id ?? '');
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
  const selected = members.find((member) => member.id === selectedId.value) ?? members[0];

  return (
    <OperationalPageLayout
      eyebrow="GESTISAC - Equipa"
      title="Equipa"
      description="Carga operacional, validacoes e atividade recente dos funcionarios."
    >
      <MetricStrip
        q:slot="metrics"
        activeId={statusFilter.value}
        onSelect$={(id) => (statusFilter.value = id as typeof statusFilter.value)}
        items={[
          {
            id: 'todos',
            label: 'Membros',
            value: props.resources.team.length,
            detail: 'Utilizadores ativos',
            tone: 'info'
          },
          {
            id: 'campo',
            label: 'Em campo',
            value: props.resources.team.reduce((total, member) => total + member.inProgressTasks, 0),
            detail: 'Execucao ativa',
            tone: 'warning'
          },
          {
            id: 'validacao',
            label: 'Validacao',
            value: props.resources.team.reduce((total, member) => total + member.pendingValidation, 0),
            detail: 'A rever pelo HQ',
            tone: 'danger'
          },
          {
            id: 'livres',
            label: 'Livres',
            value: props.resources.team.filter((member) => member.openTasks === 0).length,
            detail: 'Sem fila aberta',
            tone: 'success'
          }
        ]}
      />

      <OperationalToolbar
        title="Carga operacional"
        eyebrow="Distribuicao diaria"
        searchValue={search.value}
        searchPlaceholder="Pesquisar por nome, email ou funcao"
        onSearch$={(value) => (search.value = value)}
      >
        <select
          value={statusFilter.value}
          onChange$={(event) => (statusFilter.value = (event.target as HTMLSelectElement).value as typeof statusFilter.value)}
        >
          <option value="todos">Todos</option>
          <option value="campo">Em campo</option>
          <option value="validacao">Com validacao</option>
          <option value="livres">Sem fila</option>
        </select>
      </OperationalToolbar>

      <OperationalList>
        {members.length ? members.map((member) => (
          <button
            key={member.id}
            type="button"
            class={`cc-row-button ${selected?.id === member.id ? 'selected' : ''}`}
            onClick$={() => (selectedId.value = member.id)}
          >
            <div class="cc-row-leading">
              <span class="cc-avatar"><UserIcon size={16} /></span>
              <div class="cc-row-main">
                <strong>{member.name}</strong>
                <span>{member.role || 'Sem funcao'} - {member.email}</span>
              </div>
            </div>
            <div class="cc-row-stats">
              <span><strong>{member.openTasks}</strong><small>Abertas</small></span>
              <span><strong>{member.inProgressTasks}</strong><small>Em curso</small></span>
              <span><strong>{member.pendingValidation}</strong><small>Validacao</small></span>
            </div>
          </button>
        )) : (
          <EmptyOperationalState>
            <strong>Sem equipa para mostrar</strong>
            <span>Quando existirem utilizadores carregados, aparecem aqui.</span>
          </EmptyOperationalState>
        )}
      </OperationalList>

      <ContextPanel
        q:slot="panel"
        eyebrow="Trabalho atribuido"
        title={selected?.name || 'Sem membro selecionado'}
        subtitle={selected ? `${selected.role || 'Sem funcao'} - ${selected.email}` : 'Escolhe um membro da equipa'}
        status={selected ? formatDate(selected.lastActivityAt) : ''}
      >
        {selected ? (
          <>
            <SelectionHeader
              title={selected.name}
              subtitle={`${selected.openTasks} abertas - ${selected.inProgressTasks} em curso`}
              status={selected.pendingValidation > 0 ? 'Com validacao' : 'Operacao normal'}
            />
            <RelationChipRow
              items={[
                { label: `${selected.openTasks} tarefas abertas`, tone: 'info' },
                { label: `${selected.inProgressTasks} em curso`, tone: 'warning' },
                { label: `${selected.pendingValidation} validacoes`, tone: selected.pendingValidation ? 'danger' : 'success' }
              ]}
            />
            <PrimaryActionBar>
              <button
                class="primary-action"
                type="button"
                onClick$={() => props.navigate$(entityPath('profile', selected.name || selected.id))}
              >
                Ver atividade
              </button>
              <button class="secondary-action" type="button" onClick$={() => props.navigate$('/tarefas')}>
                Abrir tarefas
              </button>
            </PrimaryActionBar>
          </>
        ) : (
          <EmptyOperationalState>
            <strong>Sem detalhe disponivel</strong>
            <span>Seleciona um membro na lista principal.</span>
          </EmptyOperationalState>
        )}
      </ContextPanel>
    </OperationalPageLayout>
  );
});

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Sem atividade recente';
  }

  return date.toLocaleString('pt-PT', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
}
