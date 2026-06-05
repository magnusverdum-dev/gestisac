import { component$ } from '@builder.io/qwik';
import { createRuntimeConfig } from '@gestisac/config';
import { PortalFrame } from '@gestisac/ui';

const config = createRuntimeConfig('worker', import.meta.env);

const kpis = [
  { label: 'Hoje', value: 'Campo', detail: 'Proximo passo, urgentes e trabalho atribuido.' },
  { label: 'Menu', value: '4 areas', detail: 'Hoje, Tarefas, Pedidos e Agenda.' },
  { label: 'Fluxo', value: 'Execucao', detail: 'Chegar, iniciar, aguardar pecas e resolver.' }
];

const sections = [
  {
    title: 'Hoje',
    description: 'Tickets atribuidos ordenados por urgencia, SLA e proximidade operacional.',
    endpoint: '/api/worker/tickets'
  },
  {
    title: 'Tarefas',
    description: 'Fila diaria composta por pedidos, vistorias, manutencao e agenda.',
    endpoint: '/api/ocorrencias/{id}/worker-action'
  },
  {
    title: 'Pedidos',
    description: 'Avarias e pedidos atribuidos com checklist, fotos e estado publico.',
    endpoint: '/api/ocorrencias/{id}/anexos'
  },
  {
    title: 'Agenda',
    description: 'Eventos e vistorias que organizam o dia no terreno.',
    endpoint: '/api/calendar-events'
  }
];

export const App = component$(() => (
  <PortalFrame
    appContext={config.appContext}
    eyebrow="PWA operacional"
    title="Funcionario com foco no dia"
    subtitle="A experiencia passa a privilegiar tarefa, pedido e agenda, sem navegacao administrativa."
    kpis={kpis}
    sections={sections}
  >
    <section class="portal-note">
      <strong>Limite intencional:</strong>
      <span>
        O funcionario recebe o necessario para executar. Informacao financeira, dados de cliente sensiveis e decisao HQ
        ficam fora do payload worker.
      </span>
    </section>
  </PortalFrame>
));
