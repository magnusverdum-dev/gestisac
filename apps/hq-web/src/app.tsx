import { component$ } from '@builder.io/qwik';
import { createRuntimeConfig } from '@gestisac/config';
import { PortalFrame } from '@gestisac/ui';

const config = createRuntimeConfig('hq', import.meta.env);

const kpis = [
  { label: 'Modo', value: 'HQ', detail: 'Backoffice completo e permissivo por funcao.' },
  { label: 'API', value: '/api/hq', detail: 'Contratos dedicados para gestao interna.' },
  { label: 'Dados', value: 'PostgreSQL', detail: 'Preparado para repositorios relacionais.' }
];

const sections = [
  {
    title: 'Dashboard operacional',
    description: 'Avisos, tarefas, triagem, validacoes e saude dos modulos sem misturar apps.',
    endpoint: '/api/hq/dashboard'
  },
  {
    title: 'Tickets e triagem',
    description: 'Fila completa, atribuicao a funcionarios, SLA, reabertura e validacao HQ.',
    endpoint: '/api/hq/tickets'
  },
  {
    title: 'Contabilidade por contexto',
    description: 'Overview sem fuga de valores individuais; detalhe apenas por condominio ou fracao autorizada.',
    endpoint: '/api/hq/accounting/*'
  },
  {
    title: 'Administracao modular',
    description: 'Condominios, residentes, fornecedores, documentos, manutencao e auditoria por dominio.',
    endpoint: '/api/hq/*'
  }
];

export const App = component$(() => (
  <PortalFrame
    appContext={config.appContext}
    eyebrow="Separacao fisica das apps"
    title="Backoffice HQ preparado para escala"
    subtitle="Esta app deixa de depender do seletor de contexto da shell legacy e passa a consumir contratos HQ dedicados."
    kpis={kpis}
    sections={sections}
  >
    <section class="portal-note">
      <strong>Guarda de privacidade:</strong>
      <span>
        A contabilidade geral mostra apenas estatisticas e avisos. Valores de clientes, fracoes ou fornecedores ficam
        bloqueados ate existir contexto autorizado.
      </span>
    </section>
  </PortalFrame>
));
