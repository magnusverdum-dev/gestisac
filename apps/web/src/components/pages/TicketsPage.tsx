import { $, component$, useSignal, useTask$, type PropFunction } from '@builder.io/qwik';
import { EditIcon, MessageSquareIcon, MoreHorizontalIcon, PlusIcon, SearchIcon, Trash2Icon } from 'lucide-qwik';
import type { AppContext, Canal, Ocorrencia, OcorrenciaStatus, Prioridade, ResourceEndpoint, ResourceState } from '../../lib/api';
import {
  condominiumPath,
  entityPath,
  isTicketClosed,
  normalize
} from '../../lib/entity-navigation';
import { EntityAction } from '../common/EntityAction';
import { criarComentario, executarAcaoFuncionario, transitarStatus, validarResolucao } from '../../lib/api/ocorrencias';

type TicketsPageProps = {
  appContext: AppContext;
  resources: ResourceState;
  isSaving: boolean;
  token: string;
  createIntentVersion: number;
  initialStatusGroup?: string;
  initialPriority?: string;
  navigate$: PropFunction<(path: string) => void>;
  onCreate$: PropFunction<(resource: ResourceEndpoint, payload: Record<string, unknown>) => void>;
  onUpdate$: PropFunction<(resource: ResourceEndpoint, id: string, payload: Record<string, unknown>) => void>;
  onDelete$: PropFunction<(resource: ResourceEndpoint, id: string) => void>;
};

const TIPO_TABS = ['todas', 'avaria', 'pedido'] as const;
const STATUS_OPTS: OcorrenciaStatus[] = ['nova', 'emTriagem', 'aguardaPecas', 'emCurso', 'pendente', 'resolvida', 'fechada', 'reaberta'];
const PRIORIDADE_OPTS: Prioridade[] = ['baixa', 'normal', 'alta', 'urgente'];
const CANAIS: Canal[] = ['portal', 'email', 'telefone', 'presencial', 'interno'];

const STATUS_MAP: Record<string, OcorrenciaStatus[]> = {
  abertos: ['nova', 'emTriagem', 'aguardaPecas', 'emCurso', 'reaberta'],
  pendentes: ['pendente'],
  resolvidos: ['resolvida'],
  fechados: ['fechada']
};

const TRANSICOES: Record<OcorrenciaStatus, OcorrenciaStatus[]> = {
  nova: ['emTriagem', 'emCurso', 'fechada'],
  emTriagem: ['emCurso', 'aguardaPecas', 'fechada'],
  aguardaPecas: ['emCurso', 'pendente'],
  emCurso: ['pendente', 'resolvida'],
  pendente: ['emCurso', 'fechada'],
  resolvida: ['fechada', 'reaberta'],
  fechada: ['reaberta'],
  reaberta: ['emCurso', 'emTriagem']
};

export const TicketsPage = component$((props: TicketsPageProps) => {
  const search = useSignal('');
  const tipoTab = useSignal<'todas' | 'avaria' | 'pedido'>('todas');
  const statusFiltro = useSignal<string>('');
  const prioridadeFiltro = useSignal<string>('');
  const condominiumFiltro = useSignal('Geral');
  const selectedId = useSignal(props.resources.ocorrencias[0]?.id ?? '');
  const isCreating = useSignal(false);
  const editingId = useSignal('');
  const detailTab = useSignal<'resumo' | 'checklist' | 'fotos' | 'historico' | 'resolver' | 'timeline' | 'ficheiros' | 'custos'>('resumo');
  const showCommentForm = useSignal(false);
  const commentText = useSignal('');
  const commentVisibility = useSignal<'interno' | 'publico'>('interno');
  const pageError = useSignal('');
  const transitioningId = useSignal('');
  const isClientContext = props.appContext === 'client';
  const isWorkerContext = props.appContext === 'worker';
  const isHqContext = props.appContext === 'hq';

  useTask$(({ track }) => {
    track(() => props.createIntentVersion);
    if (props.createIntentVersion > 0) {
      isCreating.value = true;
      editingId.value = '';
    }
  });

  useTask$(({ track }) => {
    const routedGroup = track(() => props.initialStatusGroup);
    if (routedGroup && STATUS_MAP[routedGroup]) {
      statusFiltro.value = routedGroup;
      tipoTab.value = 'todas';
      selectedId.value = '';
    }
  });

  useTask$(({ track }) => {
    const routedPriority = track(() => props.initialPriority);
    if (routedPriority) {
      prioridadeFiltro.value = routedPriority.toLowerCase();
      statusFiltro.value = '';
      selectedId.value = '';
    }
  });

  const condominiumOptions = ['Geral', ...props.resources.condominiums.map((item) => item.name)];
  const condominiumNameToId: Record<string, string> = {};
  const condominiumIdToName: Record<string, string> = {};
  for (const c of props.resources.condominiums) {
    condominiumNameToId[c.name] = c.id;
    condominiumIdToName[c.id] = c.name;
  }
  const normalizedSearch = search.value.trim().toLowerCase();

  const filtered = props.resources.ocorrencias.filter((oc) => {
    if (isClientContext && oc.tipo !== 'avaria') return false;
    if (isWorkerContext) {
      const assigned = (oc.assignedWorkerId || oc.atribuidoA || '').toLowerCase();
      if (!assigned.includes('worker') && !assigned.includes('tecnico') && !assigned.includes('funcionario')) {
        return false;
      }
    }
    if (condominiumFiltro.value !== 'Geral') {
      const targetId = condominiumNameToId[condominiumFiltro.value] || condominiumFiltro.value;
      if (oc.condominiumId !== targetId) return false;
    }
    if (tipoTab.value === 'avaria' && oc.tipo !== 'avaria') return false;
    if (tipoTab.value === 'pedido' && oc.tipo !== 'pedido') return false;
    if (statusFiltro.value) {
      const statuses = STATUS_MAP[statusFiltro.value];
      if (statuses && !statuses.includes(oc.status)) return false;
      if (!statuses && oc.status !== statusFiltro.value) return false;
    }
    if (prioridadeFiltro.value && oc.prioridade !== prioridadeFiltro.value) return false;
    if (normalizedSearch) {
      const condName = condominiumIdToName[oc.condominiumId] || '';
      const haystack = `${oc.titulo} ${oc.descricao} ${oc.requisitanteNome} ${oc.atribuidoA} ${condName}`.toLowerCase();
      if (!haystack.includes(normalizedSearch)) return false;
    }
    return true;
  });

  const selected = filtered.find((oc) => oc.id === selectedId.value) ?? filtered[0];
  const editingOcorrencia = props.resources.ocorrencias.find((oc) => oc.id === editingId.value);
  const abertas = props.resources.ocorrencias.filter((oc) => !isTicketClosed(oc.status)).length;
  const urgentes = props.resources.ocorrencias.filter((oc) => oc.prioridade === 'urgente').length;

  return (
    <section class="page-view operational-page cmt-page">
      <header class="page-header compact-page-header calendar-header">
        <div>
          <span class="page-eyebrow">GESTISAC - CMT</span>
          <h1>Ocorrências</h1>
          <p>{isClientContext ? 'Reportar avarias e acompanhar estado.' : isWorkerContext ? 'Avarias atribuídas para execução técnica.' : 'Gestão central de avarias, pedidos e atribuição.'}</p>
        </div>
        {!isWorkerContext ? (
          <button
            type="button"
            class="primary-action action-with-icon"
            onClick$={() => {
              pageError.value = '';
              isCreating.value = true;
              editingId.value = '';
            }}
          >
            <PlusIcon size={16} />
            {isClientContext ? 'Reportar avaria' : 'Nova ocorrência'}
          </button>
        ) : null}
      </header>

      {pageError.value ? <div class="app-error glass-panel">{pageError.value}</div> : null}

      <div class="summary-grid simple-summary-grid ticket-summary-strip">
        {isWorkerContext ? (
          <>
            <button class="summary-card blue" type="button" onClick$={() => { statusFiltro.value = ''; prioridadeFiltro.value = ''; }}>
              <span>Hoje</span><strong>{filtered.filter((oc) => !isTicketClosed(oc.status)).length}</strong><small>Fila atribuída</small>
            </button>
            <button class={`summary-card red ${prioridadeFiltro.value === 'urgente' ? 'active' : ''}`} type="button" onClick$={() => { prioridadeFiltro.value = 'urgente'; statusFiltro.value = ''; }}>
              <span>Urgentes</span><strong>{filtered.filter((oc) => oc.prioridade === 'urgente').length}</strong><small>Resposta rápida</small>
            </button>
            <button class={`summary-card gold ${statusFiltro.value === 'aguardaPecas' ? 'active' : ''}`} type="button" onClick$={() => { statusFiltro.value = 'aguardaPecas'; prioridadeFiltro.value = ''; }}>
              <span>A aguardar peças</span><strong>{filtered.filter((oc) => oc.status === 'aguardaPecas').length}</strong><small>Material/fornecedor</small>
            </button>
            <button class={`summary-card green ${statusFiltro.value === 'resolvidos' ? 'active' : ''}`} type="button" onClick$={() => { statusFiltro.value = 'resolvidos'; prioridadeFiltro.value = ''; }}>
              <span>Resolvidos</span><strong>{filtered.filter((oc) => isTicketClosed(oc.status)).length}</strong><small>A validar/fechar</small>
            </button>
          </>
        ) : (
          <>
            <button class={`summary-card red ${statusFiltro.value === 'abertos' ? 'active' : ''}`} type="button" onClick$={() => { statusFiltro.value = 'abertos'; tipoTab.value = 'todas'; }}>
              <span>Abertas</span><strong>{abertas}</strong><small>{urgentes} urgente</small>
            </button>
            <button class={`summary-card gold ${statusFiltro.value === 'pendentes' ? 'active' : ''}`} type="button" onClick$={() => { statusFiltro.value = 'pendentes'; tipoTab.value = 'todas'; }}>
              <span>{isHqContext ? 'A validar HQ' : 'Pendentes'}</span><strong>{isHqContext ? props.resources.ocorrencias.filter((oc) => oc.requiresHqValidation && oc.hqValidationStatus === 'pendente').length : props.resources.ocorrencias.filter((oc) => oc.status === 'pendente').length}</strong><small>{isHqContext ? 'Resoluções técnicas' : 'A aguardar decisão'}</small>
            </button>
            <button class="summary-card blue" type="button" onClick$={() => { statusFiltro.value = ''; prioridadeFiltro.value = ''; }}>
              <span>Filtradas</span><strong>{filtered.length}</strong><small>Vista atual</small>
            </button>
            <button class={`summary-card green ${statusFiltro.value === 'resolvidos' ? 'active' : ''}`} type="button" onClick$={() => { statusFiltro.value = 'resolvidos'; tipoTab.value = 'todas'; }}>
              <span>Resolvidas</span><strong>{props.resources.ocorrencias.filter((oc) => isTicketClosed(oc.status)).length}</strong><small>Histórico operacional</small>
            </button>
          </>
        )}
      </div>

      <section class="glass-panel ops-workspace tickets-command-surface">
        <div class="ops-panel-header calendar-toolbar">
          <div>
            <span class="page-eyebrow">Dados reais da API online</span>
            <h2>Registos CMT</h2>
          </div>
          <div class="ops-toolbar calendar-filters tickets-toolbar">
            <nav class="detail-tabs cmt-type-tabs" style="margin-bottom:0">
              {TIPO_TABS.map((t) => (
                <button key={t} type="button" class={`tab-btn ${tipoTab.value === t ? 'active' : ''}`} onClick$={() => { tipoTab.value = t; statusFiltro.value = ''; }}>
                  {t === 'todas' ? 'Todas' : t === 'avaria' ? 'Avarias' : 'Pedidos'}
                </button>
              ))}
            </nav>
            <label class="ops-search">
              <SearchIcon size={16} />
              <input value={search.value} placeholder="Pesquisar por título, condomínio ou responsável" onInput$={(e) => (search.value = (e.target as HTMLInputElement).value)} />
            </label>
            <select value={condominiumFiltro.value} onChange$={(e) => (condominiumFiltro.value = (e.target as HTMLSelectElement).value)}>
              {condominiumOptions.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <select value={statusFiltro.value} onChange$={(e) => { statusFiltro.value = (e.target as HTMLSelectElement).value; tipoTab.value = 'todas'; }}>
              <option value="">Todos os estados</option>
              {STATUS_OPTS.map((s) => <option key={s} value={s}>{rotuloStatus(s)}</option>)}
            </select>
            <select value={prioridadeFiltro.value} onChange$={(e) => (prioridadeFiltro.value = (e.target as HTMLSelectElement).value)}>
              <option value="">Todas as prioridades</option>
              {PRIORIDADE_OPTS.map((p) => <option key={p} value={p}>{rotuloPri(p)}</option>)}
            </select>
          </div>
        </div>

        <div class="ops-detail-layout">
          <div class="ops-list-column">
            {filtered.length ? filtered.map((oc) => (
              <article class={`ops-ticket-card ${selected?.id === oc.id ? 'active' : ''}`} key={oc.id}>
                <button type="button" class="ops-ticket-main" onClick$={() => { selectedId.value = oc.id; detailTab.value = 'resumo'; }}>
                  <span class={`priority-rail ${tomPrioridade(oc.prioridade)}`} />
                  <div>
                    <strong><span class={`tipo-badge ${oc.tipo}`}>{iconeTipo(oc.tipo)}</span> {oc.titulo}</strong>
                    <span>{oc.requisitanteNome || 'Requerente por definir'} {oc.condominiumId ? `- ${oc.condominiumId}` : ''}</span>
                    <p>{oc.descricao}</p>
                  </div>
                  <div class="ticket-card-meta">
                    <small class={`status-chip ${tomStatus(oc.status)}`}>{rotuloStatus(oc.status)}</small>
                    <small>{rotuloPri(oc.prioridade)}</small>
                  </div>
                </button>
                <details class="simple-more-menu">
                  <summary><MoreHorizontalIcon size={16} /></summary>
                  {isHqContext ? (
                    <button type="button" onClick$={() => { editingId.value = oc.id; isCreating.value = false; }}>
                      <EditIcon size={14} /> Editar
                    </button>
                  ) : null}
                  {(isHqContext ? TRANSICOES[oc.status] : allowedTransitionsForContext(props.appContext, oc.status))?.length ? (isHqContext ? TRANSICOES[oc.status] : allowedTransitionsForContext(props.appContext, oc.status)).map((dest) => (
                    <button key={dest} type="button" disabled={transitioningId.value === oc.id} onClick$={async () => {
                      if (!props.token) return;
                      transitioningId.value = oc.id;
                      pageError.value = '';
                      try {
                        await transitarStatus(props.token, oc.id, dest);
                        window.location.reload();
                      } catch (e) {
                        pageError.value = e instanceof Error ? e.message : 'Erro ao transitar estado';
                      } finally {
                        transitioningId.value = '';
                      }
                    }}>
                      {acaoTransicao(dest)}
                    </button>
                  )) : null}
                  {isHqContext ? (
                    <button type="button" class="danger-action" onClick$={async () => {
                      if (confirm(`Apagar ${oc.titulo}?`)) {
                        await props.onDelete$('ocorrencias', oc.id);
                        selectedId.value = '';
                      }
                    }}>
                      <Trash2Icon size={14} /> Apagar
                    </button>
                  ) : null}
                </details>
              </article>
            )) : (
              <div class="simple-empty-state"><strong>Sem ocorrências</strong><span>Ajusta os filtros ou abre uma nova ocorrência.</span></div>
            )}
          </div>

          <aside class="ops-detail-panel tickets-context-panel">
            {selected ? (
              <div class="simple-detail-panel ticket-context-card">
                <div class="simple-detail-header">
                  <div>
                    <span class="page-eyebrow">{rotuloTipo(selected.tipo)}</span>
                    <h2>{selected.titulo}</h2>
                    <p>
                      <small class={`status-chip ${tomStatus(selected.status)}`}>{rotuloStatus(selected.status)}</small>
                      {' '}<small class={`pri-chip ${tomPrioridade(selected.prioridade)}`}>{rotuloPri(selected.prioridade)}</small>
                      {!isClientContext && selected.custoEstimado ? <small> Custo estimado: {selected.custoEstimado} EUR</small> : null}
                    </p>
                  </div>
                  {isHqContext ? (
                    <button type="button" class="secondary-action" onClick$={() => { editingId.value = selected.id; isCreating.value = false; }}>
                      Editar
                    </button>
                  ) : null}
                </div>

                <div class="simple-header-actions ticket-context-actions">
                  <button
                    type="button"
                    class="primary-action"
                    onClick$={() => props.navigate$(entityPath('ticket', selected.id))}
                  >
                    Abrir origem
                  </button>
                  <button
                    type="button"
                    class="secondary-action"
                    onClick$={() => props.navigate$(condominiumPath(props.resources, selected.condominiumId))}
                    disabled={!condominiumPath(props.resources, selected.condominiumId)}
                  >
                    Abrir condominio
                  </button>
                </div>

                <div class="detail-kv-grid ticket-context-grid">
                  {isClientContext ? (
                    <>
                      <article>
                        <span>Estado público</span>
                        <strong>{selected.publicTimelineStatus || selected.publicStatusText || rotuloStatus(selected.status)}</strong>
                        <small>Atualizado: {selected.atualizadoEm}</small>
                      </article>
                      <article>
                        <span>Referência</span>
                        <strong>{selected.tokenAcompanhamento || selected.id}</strong>
                        <small>{rotuloTipo(selected.tipo)}</small>
                      </article>
                    </>
                  ) : (
                    <>
                      <article>
                        <span>Requerente</span>
                        <strong>{selected.requisitanteNome || 'Por definir'}</strong>
                        <small>{selected.requisitanteEmail || selected.requisitanteTelefone || selected.canal || 'Sem contacto'}</small>
                      </article>
                      <EntityAction class="detail-link-card" path={(selected.assignedWorkerId || selected.atribuidoA) ? entityPath('profile', `perfil-${selected.assignedWorkerId || selected.atribuidoA}`) : ''} navigate$={props.navigate$}>
                        <span>Atribuído a</span>
                        <strong>{selected.assignedWorkerId || selected.atribuidoA || 'Por atribuir'}</strong>
                        <small>{selected.categoria || 'Sem categoria'}</small>
                      </EntityAction>
                      <article>
                        <span>Tipo</span>
                        <strong>{rotuloTipo(selected.tipo)}</strong>
                        <small>Canal: {rotuloCanal(selected.canal)}</small>
                      </article>
                      <article>
                        <span>Impacto / Urgência</span>
                        <strong>{rotuloImpacto(selected.impacto)}</strong>
                        <small>{rotuloUrgencia(selected.urgencia)}</small>
                      </article>
                      {selected.blocoId ? <article><span>Localização</span><strong>Bloco {selected.blocoId}{selected.pisoId ? `, Piso ${selected.pisoId}` : ''}{selected.zonaId ? `, ${selected.zonaId}` : ''}</strong></article> : null}
                      {selected.equipamentoId ? <article><span>Equipamento</span><strong>{selected.equipamentoId}</strong></article> : null}
                      <article><span>Criado em</span><strong>{selected.criadoEm}</strong><small>Atualizado: {selected.atualizadoEm}</small></article>
                    </>
                  )}
                </div>

                <EntityAction class="entity-inline-link ticket-context-link" path={condominiumPath(props.resources, selected.condominiumId)} navigate$={props.navigate$}>
                  Abrir condomínio: {selected.condominiumId || 'Geral'}
                </EntityAction>

                <p>{isClientContext ? (selected.publicStatusText || selected.descricao) : selected.descricao}</p>
                {!isClientContext && selected.technicalNotes ? (
                  <div class="ops-history">
                    <strong>Notas técnicas</strong>
                    <p>{selected.technicalNotes}</p>
                  </div>
                ) : null}

                {selected.tags?.length ? <div class="calendar-badges">{selected.tags.map((tag) => <span key={tag}>{tag}</span>)}</div> : null}

                {selected.motivoResolucao ? (
                  <div class="ops-history">
                    <strong>Motivo de resolução</strong>
                    <p>{selected.motivoResolucao}</p>
                  </div>
                ) : null}

                <nav class="detail-tabs ticket-detail-tabs" style="margin-top:1rem">
                  {(isWorkerContext ? ['resumo', 'checklist', 'fotos', 'historico', 'resolver'] : isClientContext ? ['resumo', 'historico'] : ['resumo', 'historico', 'fotos', 'custos'] as const).map((t) => (
                    <button key={t} type="button" class={`tab-btn ${detailTab.value === t ? 'active' : ''}`} onClick$={() => (detailTab.value = t as typeof detailTab.value)}>
                      {tabLabel(t)}
                    </button>
                  ))}
                </nav>

                {detailTab.value === 'resumo' ? (
                  <div class="ops-history">
                    <div class="detail-kv-grid">
                      <article><span>Próxima ação</span><strong>{nextTicketAction(selected, props.appContext)}</strong><small>{selected.publicTimelineStatus || selected.publicStatusText || 'Sem estado público'}</small></article>
                      {!isClientContext ? <article><span>Validacao HQ</span><strong>{selected.hqValidationStatus || 'nao_requerida'}</strong><small>{selected.hqValidationNotes || 'Sem notas de validacao'}</small></article> : null}
                      {!isClientContext ? <article><span>Tempo no terreno</span><strong>{selected.workerTimeMinutes || 0} min</strong><small>{selected.arrivedAt ? `Chegada: ${selected.arrivedAt}` : 'Sem chegada registada'}</small></article> : null}
                      {!isClientContext ? <article><span>QR origem</span><strong>{selected.qrSourceType || 'Manual'}</strong><small>{selected.qrSourceId || selected.equipamentoId || selected.zonaId || 'Sem QR'}</small></article> : null}
                    </div>
                    {isHqContext && selected.requiresHqValidation && selected.hqValidationStatus === 'pendente' ? (
                      <div class="simple-header-actions">
                        <button type="button" class="primary-action" onClick$={async () => { await validarResolucao(props.token, selected.id, { decision: 'accept', notes: 'Validado por HQ' }); window.location.reload(); }}>Validar resolução</button>
                        <button type="button" class="secondary-action" onClick$={async () => { await validarResolucao(props.token, selected.id, { decision: 'reject', notes: 'Rever intervenção e submeter novamente.' }); window.location.reload(); }}>Rejeitar</button>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {detailTab.value === 'checklist' ? (
                  <form class="ops-history" preventdefault:submit onSubmit$={async (event) => {
                    const form = event.target as HTMLFormElement;
                    const checklist = checklistFromForm(form, selected.workerChecklist || []);
                    await executarAcaoFuncionario(props.token, selected.id, { action: selected.status === 'emCurso' ? 'start' : 'start', workerChecklist: checklist, note: 'Checklist atualizada' });
                    window.location.reload();
                  }}>
                    {(selected.workerChecklist?.length ? selected.workerChecklist : defaultChecklistForTicket(selected)).map((step) => (
                      <label class="worker-check-row" key={step.id}>
                        <input type="checkbox" name={`check-${step.id}`} checked={step.done} />
                        <span>{step.label}</span>
                        <input name={`note-${step.id}`} value={step.note || ''} placeholder="Nota curta" />
                      </label>
                    ))}
                    <button type="submit" class="primary-action">Guardar checklist</button>
                  </form>
                ) : null}

                {detailTab.value === 'fotos' ? (
                  <div class="ops-history">
                    <div class="detail-kv-grid">
                      <article><span>Antes</span><strong>Preparado</strong><small>Upload usa kind=before</small></article>
                      <article><span>Depois</span><strong>Preparado</strong><small>Upload usa kind=after</small></article>
                      <article><span>Prova</span><strong>Preparado</strong><small>Upload usa kind=proof</small></article>
                    </div>
                    <div class="simple-empty-state"><strong>Prova visual preparada</strong><span>Os anexos já suportam antes/depois/prova e visibilidade pública/interna.</span></div>
                  </div>
                ) : null}

                {detailTab.value === 'historico' || detailTab.value === 'timeline' ? (
                  <div class="ops-history">
                    <div class="simple-header-actions">
                      <button type="button" class="primary-action action-with-icon" onClick$={() => (showCommentForm.value = !showCommentForm.value)}>
                        <MessageSquareIcon size={14} /> Comentar
                      </button>
                    </div>
                    {showCommentForm.value ? (
                      <form preventdefault:submit onSubmit$={async () => {
                        if (!commentText.value.trim() || !props.token) return;
                        pageError.value = '';
                        try {
                          await criarComentario(props.token, selected.id, commentText.value, isClientContext ? 'publico' : commentVisibility.value);
                          commentText.value = '';
                          showCommentForm.value = false;
                        } catch (e) {
                          pageError.value = e instanceof Error ? e.message : 'Erro ao enviar comentário';
                        }
                      }}>
                        <textarea value={commentText.value} onInput$={(e) => (commentText.value = (e.target as HTMLTextAreaElement).value)} placeholder="Escreve um comentário..." rows={3} />
                        <div class="simple-header-actions">
                          {!isClientContext ? (
                            <select value={commentVisibility.value} onChange$={(e) => (commentVisibility.value = (e.target as HTMLSelectElement).value as 'interno' | 'publico')}>
                              <option value="interno">Interno</option>
                              <option value="publico">Público</option>
                            </select>
                          ) : null}
                          <button type="submit" class="primary-action" disabled={!commentText.value.trim()}>Enviar</button>
                        </div>
                      </form>
                    ) : null}
                    <article class="audit-entry"><span>Criação</span><p>{selected.titulo} - {isClientContext ? (selected.publicStatusText || selected.publicTimelineStatus) : selected.descricao}</p><small>{selected.criadoEm} por {selected.requisitanteNome || 'Sistema'}</small></article>
                    {selected.workStartedAt ? <article class="audit-entry"><span>Execução</span><p>Trabalho iniciado</p><small>{selected.workStartedAt}</small></article> : null}
                    {selected.resolvedByWorkerAt ? <article class="audit-entry"><span>Resolução técnica</span><p>{selected.resolutionSummary || selected.motivoResolucao}</p><small>{selected.resolvedByWorkerAt}</small></article> : null}
                  </div>
                ) : null}

                {detailTab.value === 'resolver' ? (
                  <form class="ops-history" preventdefault:submit onSubmit$={async (event) => {
                    const form = event.target as HTMLFormElement;
                    const data = new FormData(form);
                    await executarAcaoFuncionario(props.token, selected.id, {
                      action: 'resolve',
                      resolutionSummary: String(data.get('resolutionSummary') || ''),
                      workerTimeMinutes: Number(data.get('workerTimeMinutes') || selected.workerTimeMinutes || 0),
                      workerChecklist: checklistFromForm(form, selected.workerChecklist || [])
                    });
                    window.location.reload();
                  }}>
                    <div class="simple-header-actions">
                      <button type="button" class="secondary-action" onClick$={async () => { await executarAcaoFuncionario(props.token, selected.id, { action: 'arrive', note: 'Chegada ao local' }); window.location.reload(); }}>Cheguei</button>
                      <button type="button" class="primary-action" onClick$={async () => { await executarAcaoFuncionario(props.token, selected.id, { action: 'start', note: 'Intervenção iniciada' }); window.location.reload(); }}>Iniciar</button>
                      <button type="button" class="secondary-action" onClick$={async () => { await executarAcaoFuncionario(props.token, selected.id, { action: 'await_parts', note: 'A aguardar peças/material' }); window.location.reload(); }}>Aguardar peças</button>
                    </div>
                    <label>Resumo da resolução<textarea name="resolutionSummary" placeholder="O que foi feito, resultado e prova recolhida" required /></label>
                    <label>Tempo no terreno (min)<input name="workerTimeMinutes" value={selected.workerTimeMinutes || ''} placeholder="45" /></label>
                    {(selected.workerChecklist?.length ? selected.workerChecklist : defaultChecklistForTicket(selected)).map((step) => (
                      <label class="worker-check-row" key={`resolve-${step.id}`}>
                        <input type="checkbox" name={`check-${step.id}`} checked={step.done} />
                        <span>{step.label}</span>
                        <input name={`note-${step.id}`} value={step.note || ''} placeholder="Nota curta" />
                      </label>
                    ))}
                    <button type="submit" class="primary-action">Resolver e enviar para HQ</button>
                  </form>
                ) : null}

                {detailTab.value === 'custos' ? (
                  <div class="ops-history">
                    <div class="detail-kv-grid">
                      <article><span>Custo estimado</span><strong>{selected.custoEstimado ? `${selected.custoEstimado}€` : 'Por definir'}</strong></article>
                      <article><span>Custo final</span><strong>{selected.custoFinal ? `${selected.custoFinal}€` : 'Por definir'}</strong></article>
                      <article><span>Fornecedor</span><strong>{selected.fornecedorId || 'Por definir'}</strong></article>
                      <article><span>Contrato</span><strong>{selected.referenciaContrato || 'Sem referência'}</strong></article>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div class="simple-empty-state"><strong>Seleciona uma ocorrência</strong><span>O detalhe aparece aqui.</span></div>
            )}
          </aside>
        </div>
      </section>

      {(isCreating.value || editingOcorrencia) && !isWorkerContext ? (
        <OcorrenciaForm
          appContext={props.appContext}
          ocorrencia={editingOcorrencia}
          condominiumOptions={condominiumOptions}
          isSaving={props.isSaving}
          onClose$={() => { isCreating.value = false; editingId.value = ''; pageError.value = ''; }}
          onSubmit$={async (payload) => {
            pageError.value = '';
            try {
              if (editingOcorrencia) {
                await props.onUpdate$('ocorrencias', editingOcorrencia.id, payload);
              } else {
                await props.onCreate$('ocorrencias', payload);
              }
              isCreating.value = false;
              editingId.value = '';
            } catch (e) {
              pageError.value = e instanceof Error ? e.message : 'Erro ao guardar';
            }
          }}
        />
      ) : null}
    </section>
  );
});

const OcorrenciaForm = component$((props: {
  appContext: AppContext;
  ocorrencia?: Ocorrencia;
  condominiumOptions: string[];
  isSaving: boolean;
  onClose$: PropFunction<() => void>;
  onSubmit$: PropFunction<(payload: Record<string, unknown>) => void>;
}) => {
  const isClientForm = props.appContext === 'client';

  return (
  <section class="glass-panel simple-form-panel calendar-form-panel">
    <div class="simple-content-header">
      <div>
        <span class="page-eyebrow">{props.ocorrencia ? 'Editar ocorrência' : 'Nova ocorrência'}</span>
        <h2>{props.ocorrencia?.titulo ?? 'Registar ocorrência'}</h2>
      </div>
      <button type="button" class="secondary-action" onClick$={props.onClose$}>Fechar</button>
    </div>
    <form
      preventdefault:submit
      onSubmit$={async (event) => {
        const form = event.target as HTMLFormElement;
        await props.onSubmit$(payloadFromForm(form, props.ocorrencia, props.appContext));
      }}
    >
      {props.appContext === 'client' ? (
        <div class="ticket-quick-wizard">
          <span>Wizard rápido</span>
          <strong>1. Condomínio → 2. Local/equipamento → 3. Descrição → 4. Contacto</strong>
          <small>A prioridade é sugerida automaticamente pela descrição, impacto e urgência.</small>
        </div>
      ) : null}
      <div class="ops-form-grid">
        <label>Título<input name="titulo" value={props.ocorrencia?.titulo ?? ''} placeholder="Avaria no elevador" required /></label>
        <label>Condomínio<select name="condominiumId" value={props.ocorrencia?.condominiumId || props.condominiumOptions[1] || 'Geral'}>
          {props.condominiumOptions.map((n) => <option key={n} value={n}>{n}</option>)}
        </select></label>
        {!isClientForm ? (
          <label>Tipo<select name="tipo" value={props.ocorrencia?.tipo || 'avaria'}>
            <option value="avaria">Avaria</option><option value="pedido">Pedido</option>
            <option value="reclamacao">Reclamacao</option><option value="pergunta">Pergunta</option>
            <option value="tarefaInterna">Tarefa interna</option>
          </select></label>
        ) : null}
        <label>Prioridade<select name="prioridade" value={props.ocorrencia?.prioridade || 'normal'}>
          {PRIORIDADE_OPTS.map((p) => <option key={p} value={p}>{rotuloPri(p)}</option>)}
        </select></label>
        <label>Impacto<select name="impacto" value={props.ocorrencia?.impacto || 'medio'}>
          <option value="baixo">Baixo</option><option value="medio">Médio</option>
          <option value="alto">Alto</option><option value="critico">Crítico</option>
        </select></label>
        <label>Urgência<select name="urgencia" value={props.ocorrencia?.urgencia || 'media'}>
          <option value="baixa">Baixa</option><option value="media">Média</option>
          <option value="alta">Alta</option><option value="imediata">Imediata</option>
        </select></label>
        <label>Canal<select name="canal" value={props.ocorrencia?.canal || 'portal'}>
          {CANAIS.map((c) => <option key={c} value={c}>{rotuloCanal(c)}</option>)}
        </select></label>
        <label>Categoria<input name="categoria" value={props.ocorrencia?.categoria ?? ''} placeholder="Elevadores" /></label>
        {!isClientForm ? (
          <label>Estado<select name="status" value={props.ocorrencia?.status || 'nova'}>
            {STATUS_OPTS.map((s) => <option key={s} value={s}>{rotuloStatus(s)}</option>)}
          </select></label>
        ) : null}
        <label>Requerente<input name="requisitanteNome" value={props.ocorrencia?.requisitanteNome ?? ''} placeholder="Carlos Almeida" /></label>
        <label>Email<input name="requisitanteEmail" value={props.ocorrencia?.requisitanteEmail ?? ''} placeholder="morador@example.pt" /></label>
        <label>Telefone<input name="requisitanteTelefone" value={props.ocorrencia?.requisitanteTelefone ?? ''} placeholder="+351 900 000 000" /></label>
        {!isClientForm ? (
          <>
            <label>Atribuido a<input name="atribuidoA" value={props.ocorrencia?.atribuidoA ?? ''} placeholder="Joao Silva" /></label>
            <label>Worker ID<input name="assignedWorkerId" value={props.ocorrencia?.assignedWorkerId ?? ''} placeholder="worker-demo-1" /></label>
          </>
        ) : null}
        <label>Bloco<input name="blocoId" value={props.ocorrencia?.blocoId ?? ''} placeholder="A" /></label>
        <label>Piso<input name="pisoId" value={props.ocorrencia?.pisoId ?? ''} placeholder="3" /></label>
        <label>Zona<input name="zonaId" value={props.ocorrencia?.zonaId ?? ''} placeholder="Entrada nascente" /></label>
        <label>Equipamento<input name="equipamentoId" value={props.ocorrencia?.equipamentoId ?? ''} placeholder="Elevador 1" /></label>
        <label>Origem QR<select name="qrSourceType" value={props.ocorrencia?.qrSourceType || ''}>
          <option value="">Manual</option><option value="condominium">Condomínio</option>
          <option value="zone">Zona</option><option value="equipment">Equipamento</option>
        </select></label>
        <label>ID QR<input name="qrSourceId" value={props.ocorrencia?.qrSourceId ?? ''} placeholder="zona-a-entrada" /></label>
        {!isClientForm ? (
          <>
            <label>Custo estimado (EUR)<input name="custoEstimado" value={props.ocorrencia?.custoEstimado ?? ''} placeholder="250" /></label>
            <label>Fornecedor<input name="fornecedorId" value={props.ocorrencia?.fornecedorId ?? ''} placeholder="Fornecedor" /></label>
            <label>Contrato<input name="referenciaContrato" value={props.ocorrencia?.referenciaContrato ?? ''} placeholder="CT-2024-001" /></label>
          </>
        ) : null}
        <label>Tags<input name="tags" value={props.ocorrencia?.tags?.join(', ') ?? ''} placeholder="elevador, urgente" /></label>
        {!isClientForm ? <label>Estado publico<input name="publicStatusText" value={props.ocorrencia?.publicStatusText ?? ''} placeholder="Avaria recebida e em analise" /></label> : null}
        {!isClientForm ? <label class="wide">Notas tecnicas<textarea name="technicalNotes" value={props.ocorrencia?.technicalNotes ?? ''} placeholder="Notas internas para HQ/Funcionarios" /></label> : null}
        <label class="wide">Descrição<textarea name="descricao" value={props.ocorrencia?.descricao ?? ''} placeholder="Descrição operacional" /></label>
      </div>
      <div class="simple-header-actions">
        <button type="submit" class="primary-action" disabled={props.isSaving}>{props.isSaving ? 'A guardar...' : 'Guardar ocorrência'}</button>
      </div>
    </form>
  </section>
  );
});

function payloadFromForm(form: HTMLFormElement, current?: Ocorrencia, appContext: AppContext = 'hq'): Record<string, unknown> {
  const data = new FormData(form);
  const isClient = appContext === 'client';
  const descricao = stringField(data, 'descricao');
  const impacto = stringField(data, 'impacto') || 'medio';
  const urgencia = stringField(data, 'urgencia') || 'media';
  return {
    titulo: stringField(data, 'titulo'),
    tipo: isClient ? 'avaria' : (stringField(data, 'tipo') || 'avaria'),
    condominiumId: stringField(data, 'condominiumId'),
    prioridade: stringField(data, 'prioridade') || suggestPriority(descricao, impacto, urgencia),
    impacto,
    urgencia,
    canal: stringField(data, 'canal') || 'portal',
    categoria: stringField(data, 'categoria'),
    status: stringField(data, 'status') || 'nova',
    requisitanteNome: stringField(data, 'requisitanteNome'),
    requisitanteEmail: stringField(data, 'requisitanteEmail'),
    requisitanteTelefone: stringField(data, 'requisitanteTelefone'),
    atribuidoA: stringField(data, 'atribuidoA'),
    assignedWorkerId: stringField(data, 'assignedWorkerId'),
    blocoId: stringField(data, 'blocoId'),
    pisoId: stringField(data, 'pisoId'),
    zonaId: stringField(data, 'zonaId'),
    equipamentoId: stringField(data, 'equipamentoId'),
    qrSourceType: stringField(data, 'qrSourceType'),
    qrSourceId: stringField(data, 'qrSourceId'),
    custoEstimado: stringField(data, 'custoEstimado'),
    fornecedorId: stringField(data, 'fornecedorId'),
    referenciaContrato: stringField(data, 'referenciaContrato'),
    descricao,
    publicStatusText: stringField(data, 'publicStatusText') || (isClient ? 'Avaria recebida' : ''),
    technicalNotes: stringField(data, 'technicalNotes'),
    originChannel: appContext,
    tags: splitList(stringField(data, 'tags'))
  };
}

function suggestPriority(description: string, impact: string, urgency: string): Prioridade {
  const text = `${description} ${impact} ${urgency}`.toLowerCase();
  if (text.includes('urgente') || text.includes('imediata') || text.includes('sem agua') || text.includes('elevador parado') || text.includes('risco')) {
    return 'urgente';
  }
  if (text.includes('alto') || text.includes('alta') || text.includes('infiltracao') || text.includes('infiltração')) {
    return 'alta';
  }
  if (text.includes('baixo') || text.includes('baixa')) {
    return 'baixa';
  }
  return 'normal';
}

function stringField(data: FormData, key: string): string {
  return String(data.get(key) ?? '').trim();
}

function splitList(value: string): string[] {
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

function rotuloStatus(s: OcorrenciaStatus): string {
  const m: Record<OcorrenciaStatus, string> = { nova: 'Nova', emTriagem: 'Triagem', aguardaPecas: 'Aguarda peças', emCurso: 'Em curso', pendente: 'Pendente', resolvida: 'Resolvida', fechada: 'Fechada', reaberta: 'Reaberta' };
  return m[s] || s;
}

function rotuloPri(p: Prioridade): string {
  const m: Record<Prioridade, string> = { baixa: 'Baixa', normal: 'Normal', alta: 'Alta', urgente: 'Urgente' };
  return m[p] || p;
}

function rotuloTipo(t: string): string {
  const m: Record<string, string> = { avaria: 'Avaria', pedido: 'Pedido', reclamacao: 'Reclamação', pergunta: 'Pergunta', tarefaInterna: 'Tarefa interna' };
  return m[t] || t;
}

function rotuloCanal(c: Canal): string {
  const m: Record<Canal, string> = { portal: 'Portal', email: 'Email', telefone: 'Telefone', presencial: 'Presencial', interno: 'Interno' };
  return m[c] || c;
}

function rotuloImpacto(i: string): string {
  const m: Record<string, string> = { baixo: 'Baixo', medio: 'Médio', alto: 'Alto', critico: 'Crítico' };
  return m[i] || i;
}

function rotuloUrgencia(u: string): string {
  const m: Record<string, string> = { baixa: 'Baixa', media: 'Média', alta: 'Alta', imediata: 'Imediata' };
  return m[u] || u;
}

function iconeTipo(t: string): string {
  return t === 'avaria' ? '⚡' : t === 'pedido' ? 'ðŸ“‹' : 'ðŸ“Œ';
}

function tomPrioridade(p: string): string {
  if (p === 'urgente') return 'red';
  if (p === 'alta') return 'gold';
  if (p === 'baixa') return 'green';
  return 'blue';
}

function tomStatus(s: string): string {
  const n = normalize(s);
  if (n.includes('resolvida') || n.includes('fechada')) return 'green';
  if (n.includes('pendente') || n.includes('pecas')) return 'gold';
  if (n.includes('curso') || n.includes('triagem')) return 'blue';
  if (n.includes('reaberta')) return 'purple';
  return 'red';
}

function acaoTransicao(dest: OcorrenciaStatus): string {
  const m: Record<OcorrenciaStatus, string> = {
    nova: 'Marcar como nova',
    emTriagem: 'Iniciar triagem',
    aguardaPecas: 'Aguardar peças',
    emCurso: 'Iniciar reparação',
    pendente: 'Marcar pendente',
    resolvida: 'Resolver',
    fechada: 'Fechar',
    reaberta: 'Reabrir'
  };
  return m[dest] || dest;
}

function tabLabel(tab: string): string {
  const m: Record<string, string> = {
    resumo: 'Resumo',
    checklist: 'Checklist',
    fotos: 'Fotos',
    historico: 'Histórico',
    resolver: 'Resolver',
    timeline: 'Timeline',
    ficheiros: 'Ficheiros',
    custos: 'Custos'
  };
  return m[tab] || tab;
}

function nextTicketAction(item: Ocorrencia, context: AppContext): string {
  if (context === 'client') {
    if (item.status === 'resolvida') return 'Confirmar ou reabrir';
    return item.publicTimelineStatus || item.publicStatusText || 'Aguardar atualização';
  }
  if (context === 'hq') {
    if (item.requiresHqValidation && item.hqValidationStatus === 'pendente') return 'Validar resolução';
    if (!item.assignedWorkerId && !item.atribuidoA) return 'Atribuir funcionário';
    return 'Acompanhar SLA';
  }
  if (!item.arrivedAt) return 'Registar chegada';
  if (item.status !== 'emCurso') return 'Iniciar intervenção';
  return 'Resolver com prova';
}

function defaultChecklistForTicket(item: Ocorrencia) {
  const category = `${item.categoria} ${item.titulo}`.toLowerCase();
  const labels = category.includes('elev')
    ? ['Confirmar segurança do elevador', 'Verificar quadro/comando', 'Registar teste final']
    : category.includes('infil')
      ? ['Identificar origem da infiltração', 'Fotografar zona afetada', 'Indicar reparação necessária']
      : ['Confirmar local e segurança', 'Executar intervenção', 'Registar conclusão e evidências'];
  return labels.map((label, index) => ({ id: `step-${index + 1}`, label, done: false, note: '' }));
}

function checklistFromForm(form: HTMLFormElement, base: ReturnType<typeof defaultChecklistForTicket>) {
  const data = new FormData(form);
  return base.map((step) => ({
    ...step,
    done: data.get(`check-${step.id}`) === 'on',
    note: String(data.get(`note-${step.id}`) || '').trim()
  }));
}

function allowedTransitionsForContext(context: AppContext, status: OcorrenciaStatus): OcorrenciaStatus[] {
  if (context === 'worker') {
    if (status === 'emTriagem' || status === 'aguardaPecas' || status === 'pendente' || status === 'reaberta') {
      return ['emCurso'];
    }
    if (status === 'emCurso') {
      return ['resolvida'];
    }
    return [];
  }
  if (context === 'client') {
    if (status === 'resolvida') {
      return ['fechada', 'reaberta'];
    }
    if (status === 'fechada') {
      return ['reaberta'];
    }
    return [];
  }
  return TRANSICOES[status] ?? [];
}
