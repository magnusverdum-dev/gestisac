import { component$, type PropFunction } from '@builder.io/qwik';
import type { DashboardResponse } from '../../lib/api';
import { ModuleCard } from './ModuleCard';

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
      <section class="dashboard-intro">
        <div class="welcome-copy">
          <p>Bom dia, {data.user.name}.</p>
          <h1>Aqui esta a visao geral da operacao GESTISAC.</h1>
        </div>
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
    </section>
  );
});
