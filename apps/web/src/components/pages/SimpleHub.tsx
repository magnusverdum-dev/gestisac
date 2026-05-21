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
  quickActions?: string[];
};

type SimpleHubCardsProps = {
  sections: SimpleHubSection[];
  activeId?: string;
  onSelect$: PropFunction<(id: string) => void>;
};

export const SimpleHubCards = component$(({ sections, activeId, onSelect$ }: SimpleHubCardsProps) => (
  <section class="simple-hub-grid" aria-label="Areas principais">
    {sections.map((section) => (
      <article
        class={`simple-hub-card ${section.tone ?? 'blue'} ${activeId === section.id ? 'active' : ''}`}
        key={section.id}
      >
        <button
          class="simple-hub-main"
          type="button"
          data-section-id={section.id}
          onClick$={async (event) => {
            const target = event.target as HTMLElement;
            const sectionId = target.closest<HTMLElement>('[data-section-id]')?.dataset.sectionId ?? '';
            await onSelect$(sectionId);
          }}
        >
          <span class="simple-hub-icon">{section.icon}</span>
          <strong>{section.title}</strong>
          <em>{section.count ?? section.primaryAction ?? 'Abrir'}</em>
          <p>{section.description}</p>
        </button>
        {section.quickActions?.length ? (
          <div class="simple-hub-shortcuts" aria-label={`Atalhos de ${section.title}`}>
            {section.quickActions.map((action) => (
              <button
                key={action}
                type="button"
                data-section-id={section.id}
                onClick$={async (event) => {
                  const target = event.target as HTMLElement;
                  const sectionId = target.closest<HTMLElement>('[data-section-id]')?.dataset.sectionId ?? '';
                  await onSelect$(sectionId);
                }}
              >
                {action}
              </button>
            ))}
          </div>
        ) : null}
      </article>
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
