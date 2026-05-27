import { component$, useSignal, type PropFunction } from '@builder.io/qwik';
import type { DashboardModule } from '../../lib/api';
import { VisualAnchor } from './VisualAnchor';

type ModuleCardProps = {
  module: DashboardModule;
  navigate$: PropFunction<(path: string) => void>;
  onModuleCommand$: PropFunction<(moduleId: string, command: string) => void>;
};

const condominiumShortcuts = [
  { label: 'Geral', path: '/condominios?area=general' },
  { label: 'Vistorias', path: '/condominios?area=inspections' },
  { label: 'Time Line', path: '/condominios?area=timeline' },
  { label: 'Avarias', path: '/condominios?area=avarias' }
] as const;

export const ModuleCard = component$((props: ModuleCardProps) => {
  const module = props.module;
  const menuOpen = useSignal(false);
  const shortcuts = module.id === 'condominiums' ? condominiumShortcuts : [];

  return (
    <article
      class={`module-card ${module.tone}`}
      onClick$={() => props.navigate$(module.path)}
    >
      <div class="card-light" />
      <div class="module-content">
        <header class="module-header">
          <span class="module-icon">{module.title.charAt(0)}</span>
          <div>
            <h2>{module.title}</h2>
            <p>{module.subtitle}</p>
          </div>

        </header>

        <div class="metrics-row">
          {module.metrics.map((metric) => (
            <div class={`metric ${metric.status ?? ''}`} key={`${module.id}-${metric.label}`}>
              <strong>{metric.value}</strong>
              <span>{metric.label}</span>
            </div>
          ))}
        </div>

        {shortcuts.length ? (
          <div class="module-shortcuts" role="group" aria-label={`Atalhos de ${module.title}`}>
            {shortcuts.map((shortcut) => (
              <button
                class="module-shortcut"
                key={`${module.id}-${shortcut.path}`}
                type="button"
                onClick$={(event) => {
                  event.stopPropagation();
                  props.navigate$(shortcut.path);
                }}
              >
                {shortcut.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <VisualAnchor visual={module.visual} />
    </article>
  );
});
