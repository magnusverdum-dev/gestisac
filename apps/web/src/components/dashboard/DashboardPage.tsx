import { component$, type PropFunction } from '@builder.io/qwik';
import type { DashboardResponse } from '../../lib/api';
import { AlertCard } from './AlertCard';
import { ModuleCard } from './ModuleCard';
import { PwaInstallPanel } from './PwaInstallPanel';

type DashboardPageProps = {
  dashboard: DashboardResponse;
  navigate$: PropFunction<(path: string) => void>;
  onQuickAction$: PropFunction<(title: string) => void>;
  onModuleCommand$: PropFunction<(moduleId: string, command: string) => void>;
};

export const DashboardPage = component$((props: DashboardPageProps) => {
  const data = props.dashboard;

  return (
    <section class="dashboard" aria-label="Dashboard GESTISAC">
      <section class="hero-row">
        <div class="welcome-copy">
          <p>Bom dia, {data.user.name}.</p>
          <h1>Aqui esta o resumo operacional do {data.activeCondominium}.</h1>
        </div>

        <article class="urgent-notice glass-panel" aria-label="Aviso urgente">
          <div class="notice-icon">!</div>
          <div class="notice-copy">
            <small>Aviso urgente</small>
            <strong>{data.urgentNotice.title}</strong>
            <span>{data.urgentNotice.detail}</span>
          </div>
          <button type="button" onClick$={() => props.navigate$('/contabilidade')}>
            Ver aviso
          </button>
        </article>

        <article class="operations-panel glass-panel" aria-label="Estado operacional">
          <small>Estado operacional</small>
          <div class="operation-list">
            {data.operationalSummary.map((item) => (
              <span class={item.tone} key={item.label}>
                {item.label}
              </span>
            ))}
          </div>
        </article>
      </section>

      <section class="quick-grid" aria-label="Acoes rapidas">
        {data.quickActions.map((action) => (
          <button
            class={`quick-action ${action.tone}`}
            key={action.title}
            type="button"
            onClick$={() => props.onQuickAction$(action.title)}
          >
            <span class="quick-icon">{action.icon}</span>
            <span>
              <strong>{action.title}</strong>
              <small>{action.description}</small>
            </span>
          </button>
        ))}
      </section>

      <PwaInstallPanel />

      <section class="module-grid" aria-label="Modulos principais">
        {data.dashboardModules.map((module) => (
          <ModuleCard
            key={module.id}
            module={module}
            navigate$={props.navigate$}
            onModuleCommand$={props.onModuleCommand$}
          />
        ))}
      </section>

      <section class="alert-strip glass-panel" aria-label="Alertas importantes">
        <header>
          <span>!</span>
          <strong>Avisos importantes</strong>
        </header>
        <div class="alert-list">
          {data.alerts.map((alert) => (
            <AlertCard
              alert={alert}
              key={alert.title}
              onOpen$={() => props.navigate$(alert.type === 'ticket' ? '/tickets' : '/contabilidade')}
            />
          ))}
        </div>
        <button class="see-all" type="button" onClick$={() => props.navigate$('/administracao')}>
          Ver todos avisos
          <span>-&gt;</span>
        </button>
      </section>
    </section>
  );
});
