import { component$, Slot, type PropFunction } from '@builder.io/qwik';

export type SimpleHubSection = {
  id: string;
  title: string;
  description: string;
  icon: string;
  tone?: 'blue' | 'green' | 'gold' | 'purple' | 'red';
  emptyState?: string;
  primaryAction?: string;
  count?: string | number;
};

type SimpleHubCardsProps = {
  sections: SimpleHubSection[];
  activeId?: string;
  onSelect$: PropFunction<(id: string) => void>;
};

export const SimpleHubCards = component$(({ sections, activeId, onSelect$ }: SimpleHubCardsProps) => (
  <section class="simple-hub-grid" aria-label="Areas principais">
    {sections.map((section) => (
      <button
        class={`simple-hub-card ${section.tone ?? 'blue'} ${activeId === section.id ? 'active' : ''}`}
        key={section.id}
        type="button"
        onClick$={async () => onSelect$(section.id)}
      >
        <span class="simple-hub-icon">{section.icon}</span>
        <strong>{section.title}</strong>
        <em>{section.count ?? section.primaryAction ?? 'Abrir'}</em>
        <p>{section.description}</p>
      </button>
    ))}
  </section>
));

type SimpleSectionShellProps = {
  title: string;
  description: string;
  sections: SimpleHubSection[];
  activeId: string;
  onSelect$: PropFunction<(id: string) => void>;
};

export const SimpleSectionShell = component$(({ title, description, sections, activeId, onSelect$ }: SimpleSectionShellProps) => (
  <section class="simple-section-layout">
    <aside class="simple-side-menu glass-panel" aria-label="Menu interno">
      <strong>{title}</strong>
      <span>{description}</span>
      <nav>
        {sections.map((section) => (
          <button
            class={activeId === section.id ? 'active' : ''}
            key={section.id}
            type="button"
            onClick$={async () => onSelect$(section.id)}
          >
            <span>{section.icon}</span>
            {section.title}
          </button>
        ))}
      </nav>
    </aside>
    <div class="simple-content-panel glass-panel">
      <Slot />
    </div>
  </section>
));
