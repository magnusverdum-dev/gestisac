import { component$ } from '@builder.io/qwik';
import { createRuntimeConfig } from '@gestisac/config';
import { PortalFrame } from '@gestisac/ui';

const config = createRuntimeConfig('client', import.meta.env);

const kpis = [
  { label: 'Modo', value: 'Cliente', detail: 'Apenas dados publicos e do seu contexto.' },
  { label: 'API', value: '/api/client', detail: 'Payloads curtos e sem campos internos.' },
  { label: 'Privacidade', value: 'Bloqueada', detail: 'Sem custos internos, notas tecnicas ou fornecedores.' }
];

const sections = [
  {
    title: 'Criar avaria',
    description: 'Wizard rapido com condominio, local, descricao, foto e contacto.',
    endpoint: '/api/ocorrencias/publica'
  },
  {
    title: 'Acompanhar estado',
    description: 'Timeline publica, mensagens permitidas e confirmacao ou reabertura quando aplicavel.',
    endpoint: '/api/client/tickets'
  },
  {
    title: 'Documentos permitidos',
    description: 'Acesso apenas a documentos publicados para o cliente ou para a fracao.',
    endpoint: '/api/client/documents'
  },
  {
    title: 'Perfil e permissoes',
    description: 'Sessao contextualizada por tenant e app, pronta para URLs/deploys separados.',
    endpoint: '/api/shared/me'
  }
];

export const App = component$(() => (
  <PortalFrame
    appContext={config.appContext}
    eyebrow="Portal autonomo"
    title="Cliente simples, privado e direto"
    subtitle="Esta app e desenhada para abrir pedidos e acompanhar estado sem expor informacao interna da administracao."
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
