import { component$, type PropFunction } from '@builder.io/qwik';
import type { AppContext } from '../../lib/api';

type AppEntryPageProps = {
  activeContext?: AppContext;
  isLoading?: boolean;
  onChoose$: PropFunction<(context: AppContext) => void>;
};

const cards: Array<{ id: AppContext; title: string; detail: string }> = [
  { id: 'hq', title: 'GESTISAC HQ', detail: 'Quartel-general da empresa: monitorizacao e atribuicao.' },
  { id: 'worker', title: 'App Funcionarios', detail: 'Execucao tecnica, atualizacao de estado e intervencao.' },
  { id: 'client', title: 'App Clientes', detail: 'Reportar avaria e acompanhar estado da resolucao.' }
];

export const AppEntryPage = component$((props: AppEntryPageProps) => {
  return (
    <main class="login-screen">
      <div class="ambient ambient-one" />
      <div class="ambient ambient-two" />
      <section class="login-panel glass-panel ecosystem-entry">
        <div class="login-copy">
          <h1>Escolher aplicacao</h1>
          <p>Entrada unica do ecossistema GESTISAC.</p>
        </div>
        <div class="entry-grid">
          {cards.map((card) => (
            <button
              key={card.id}
              class="entry-card"
              type="button"
              aria-busy={props.isLoading && props.activeContext === card.id ? 'true' : 'false'}
              disabled={props.isLoading}
              onClick$={() => props.onChoose$(card.id)}
            >
              <strong>{card.title}</strong>
              <span>
                {props.isLoading && props.activeContext === card.id ? 'A abrir app...' : card.detail}
              </span>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
});
