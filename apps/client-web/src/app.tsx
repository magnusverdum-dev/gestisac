import { component$ } from '@builder.io/qwik';
import { createRuntimeConfig } from '@gestisac/config';
import { PortalFrame } from '@gestisac/ui';

const config = createRuntimeConfig('client', import.meta.env);

const kpis = [
  { label: 'Hoje', value: 'Cliente', detail: 'Estado simples dos pedidos e proximos eventos.' },
  { label: 'Menu', value: '3 areas', detail: 'Hoje, Pedidos e Agenda.' },
  { label: 'Privacidade', value: 'Bloqueada', detail: 'Sem custos internos, notas tecnicas ou fornecedores.' }
];

const sections = [
  {
    title: 'Hoje',
    description: 'Resumo simples do que interessa ao cliente.',
    endpoint: '/api/client/dashboard'
  },
  {
    title: 'Pedidos',
    description: 'Wizard rapido com condominio, local, descricao, foto e contacto.',
    endpoint: '/api/ocorrencias/publica'
  },
  {
    title: 'Acompanhar pedidos',
    description: 'Timeline publica, mensagens permitidas e confirmacao ou reabertura quando aplicavel.',
    endpoint: '/api/client/tickets'
  },
  {
    title: 'Agenda',
    description: 'Eventos publicos e datas relevantes sem expor operacao interna.',
    endpoint: '/api/client/dashboard'
  }
];

export const App = component$(() => (
  <PortalFrame
    appContext={config.appContext}
    eyebrow="Portal autonomo"
    title="Cliente simples e direto"
    subtitle="A experiencia fica centrada em Hoje, Pedidos e Agenda, sem ruido interno."
    kpis={kpis}
    sections={sections}
  >
    <section class="portal-note">
      <strong>Regra de ouro:</strong>
      <span>
        O cliente ve estado publico, anexos publicos e comentarios publicos. Custos internos, validacao HQ e notas
        tecnicas ficam sempre fora desta app.
      </span>
    </section>
  </PortalFrame>
));
