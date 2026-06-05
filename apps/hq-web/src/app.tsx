import { component$ } from '@builder.io/qwik';
import { createRuntimeConfig } from '@gestisac/config';
import { PortalFrame } from '@gestisac/ui';

const config = createRuntimeConfig('hq', import.meta.env);

const kpis = [
  { label: 'Hoje', value: 'HQ', detail: 'Operacao, equipa e prioridades num so ritmo.' },
  { label: 'Menu', value: '6 areas', detail: 'Hoje, Condominios, Equipa, Tarefas, Pedidos e Agenda.' },
  { label: 'Dados', value: 'Reais', detail: 'Utilizadores e trabalho operacional ligados a API.' }
];

const sections = [
  {
    title: 'Hoje',
    description: 'Avisos, prioridades e estado diario sem ruido administrativo.',
    endpoint: '/api/hq/dashboard'
  },
  {
    title: 'Equipa',
    description: 'Funcionarios, carga aberta, trabalho em curso e validacoes.',
    endpoint: '/api/team'
  },
  {
    title: 'Tarefas',
    description: 'Fila composta por pedidos, manutencao, vistorias e agenda.',
    endpoint: '/api/hq/tickets'
  },
  {
    title: 'Pedidos',
    description: 'Avarias, pedidos e reclamacoes com responsavel e estado.',
    endpoint: '/api/hq/tickets'
  },
  {
    title: 'Agenda',
    description: 'Calendario operacional ligado ao trabalho em campo.',
    endpoint: '/api/calendar-events'
  }
];

export const App = component$(() => (
  <PortalFrame
    appContext={config.appContext}
    eyebrow="Separacao fisica das apps"
    title="HQ focado no dia a dia"
    subtitle="A experiencia principal fica reduzida ao essencial operacional sem apagar os modulos internos."
    kpis={kpis}
    sections={sections}
  >
    <section class="portal-note">
      <strong>Guarda de privacidade:</strong>
      <span>
        Documentos, relatorios, contabilidade e fornecedores continuam disponiveis como modulos internos, mas deixam de
        ocupar a navegacao principal.
      </span>
    </section>
  </PortalFrame>
));
