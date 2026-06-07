import { component$, type PropFunction } from '@builder.io/qwik';
import { ArrowRightIcon } from 'lucide-qwik';
import type { DashboardResponse } from '../../lib/api';
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

type DashboardPageProps = {
  dashboard: DashboardResponse;
  navigate$: PropFunction<(path: string) => void>;
  onQuickAction$: PropFunction<(title: string) => void>;
  onModuleCommand$: PropFunction<(moduleId: string, command: string) => void>;
};

export const DashboardPage = component$((props: DashboardPageProps) => {
  const data = props.dashboard;
  const primaryAlert = data.alerts[0];
  const queue = [
    ...data.dashboardModules.map((module) => ({
      id: module.id,
      title: module.title,
      detail: module.subtitle,
      meta: module.metrics.map((metric) => `${metric.label}: ${metric.value}`).join(' - '),
      status: module.cta,
      path: module.path
    })),
    ...data.alerts.map((alert, index) => ({
      id: `alert-${index}`,
      title: alert.title,
      detail: alert.detail,
      meta: alert.type,
      status: 'Abrir',
      path: alert.type === 'ticket' ? '/tickets' : '/calendario'
    }))
  ].slice(0, 8);

  return (
    <OperationalPageLayout
      eyebrow="GESTISAC - Hoje"
      title="Hoje"
      description={`Operacao diaria, prioridades e proxima acao para ${data.user.name}.`}
    >
      <MetricStrip
        q:slot="metrics"
        items={[
          {
            id: 'alerts',
            label: 'Pedidos abertos',
            value: data.alerts.length,
            detail: 'Fila atual',
            tone: primaryAlert ? 'warning' : 'neutral'
          },
          {
            id: 'modules',
            label: 'Modulos ativos',
            value: data.dashboardModules.length,
            detail: 'Operacao carregada',
            tone: 'info'
          },
          {
            id: 'actions',
            label: 'Acoes rapidas',
            value: data.quickActions.length,
            detail: 'Atalhos do dia',
            tone: 'neutral'
          },
          {
            id: 'summary',
            label: 'Sinais operacionais',
            value: data.operationalSummary.length,
            detail: 'Resumo em tempo real',
            tone: 'success'
          }
        ]}
      />

      <OperationalToolbar title="Fila operacional" eyebrow="Comando diario">
        <button class="primary-action" type="button" onClick$={() => props.navigate$('/tickets')}>
          Ver pedidos
        </button>
      </OperationalToolbar>

      <OperationalList>
        {queue.length ? queue.map((item) => (
          <button
            key={item.id}
            type="button"
            class="cc-row-button"
            onClick$={() => props.navigate$(item.path)}
          >
            <div class="cc-row-main">
              <strong>{item.title}</strong>
              <span>{item.detail}</span>
            </div>
            <div class="cc-row-meta">
              <small>{item.meta}</small>
              <span class="cc-row-link">
                {item.status}
                <ArrowRightIcon size={14} />
              </span>
            </div>
          </button>
        )) : (
          <EmptyOperationalState>
            <strong>Sem fila operacional carregada</strong>
            <span>Assim que o dashboard receber dados reais, a vista do dia aparece aqui.</span>
          </EmptyOperationalState>
        )}
      </OperationalList>

      <ContextPanel
        q:slot="panel"
        eyebrow="Proxima acao"
        title={primaryAlert?.title || data.urgentNotice.title}
        subtitle={primaryAlert?.detail || data.urgentNotice.detail}
        status={data.urgentNotice.priority}
      >
        <SelectionHeader
          title={data.user.name}
          subtitle={`${data.user.role} - ${data.activeCondominium}`}
          status="Sessao ativa"
        />
        <RelationChipRow
          items={data.operationalSummary.slice(0, 4).map((item) => ({
            label: item.label,
            tone: item.tone
          }))}
        />
        <PrimaryActionBar>
          {data.quickActions.slice(0, 3).map((action) => (
            <button
              key={action.title}
              class="secondary-action"
              type="button"
              onClick$={() => props.onQuickAction$(action.title)}
            >
              {action.title}
            </button>
          ))}
        </PrimaryActionBar>
        <div class="cc-panel-section">
          <h4>Modulos ligados</h4>
          <div class="cc-inline-list">
            {data.dashboardModules.slice(0, 4).map((module) => (
              <button
                key={module.id}
                class="cc-inline-card"
                type="button"
                onClick$={() => props.navigate$(module.path)}
              >
                <strong>{module.title}</strong>
                <span>{module.subtitle}</span>
              </button>
            ))}
          </div>
        </div>
      </ContextPanel>
    </OperationalPageLayout>
  );
});
