import { component$ } from '@builder.io/qwik';
import { createRuntimeConfig } from '@gestisac/config';
import { PortalFrame } from '@gestisac/ui';

const config = createRuntimeConfig('worker', import.meta.env);

const kpis = [
  { label: 'Modo', value: 'Campo', detail: 'PWA focada em tickets atribuidos.' },
  { label: 'API', value: '/api/worker', detail: 'Payloads pequenos e offline-friendly.' },
  { label: 'Fluxo', value: 'Hoje', detail: 'Urgentes, em curso, pecas e resolvidos.' }
];

const sections = [
  {
    title: 'Fila do funcionario',
    description: 'Tickets atribuidos ordenados por urgencia, SLA e proximidade operacional.',
    endpoint: '/api/worker/tickets'
  },
  {
    title: 'Modo execucao',
    description: 'Chegar, iniciar, pausar, aguardar pecas e resolver com prova.',
    endpoint: '/api/ocorrencias/{id}/worker-action'
  },
  {
    title: 'Checklist e fotos',
    description: 'Antes, depois, prova e documento, com visibilidade publica ou interna.',
    endpoint: '/api/ocorrencias/{id}/anexos'
  },
  {
    title: 'QR no terreno',
    description: 'Criacao de ticket contextualizada por condominio, zona ou equipamento.',
    endpoint: '/api/ocorrencias/from-qr'
  }
];

export const App = component$(() => (
  <PortalFrame
    appContext={config.appContext}
    eyebrow="PWA operacional"
    title="Funcionario com foco no proximo passo"
    subtitle="Esta app prepara a separacao nativa futura: contratos worker dedicados, dados minimos e workflow de campo claro."
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
