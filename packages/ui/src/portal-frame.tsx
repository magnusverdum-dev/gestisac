import { component$, Slot } from '@builder.io/qwik';
import type { AppContext } from '@gestisac/domain-types';

export type PortalKpi = {
  label: string;
  value: string;
  detail: string;
};

export type PortalSection = {
  title: string;
  description: string;
  endpoint: string;
};

export type PortalFrameProps = {
  appContext: AppContext;
  eyebrow: string;
  title: string;
  subtitle: string;
  kpis: PortalKpi[];
  sections: PortalSection[];
};

export const PortalFrame = component$((props: PortalFrameProps) => {
  return (
    <main class={`portal portal-${props.appContext}`}>
      <section class="portal-hero">
        <div>
          <p class="portal-eyebrow">{props.eyebrow}</p>
          <h1>{props.title}</h1>
          <p>{props.subtitle}</p>
        </div>
        <aside class="portal-contract">
          <span>App isolada</span>
          <strong>/api/{props.appContext}/*</strong>
          <small>Sem importacao de paginas legacy.</small>
        </aside>
      </section>

      <section class="portal-kpis" aria-label="Indicadores principais">
        {props.kpis.map((kpi) => (
          <article key={kpi.label}>
            <span>{kpi.label}</span>
            <strong>{kpi.value}</strong>
            <small>{kpi.detail}</small>
          </article>
        ))}
      </section>

      <section class="portal-grid" aria-label="Areas da aplicacao">
        {props.sections.map((section) => (
          <article key={section.endpoint}>
            <span>{section.endpoint}</span>
            <h2>{section.title}</h2>
            <p>{section.description}</p>
          </article>
        ))}
      </section>

      <Slot />
    </main>
  );
});
