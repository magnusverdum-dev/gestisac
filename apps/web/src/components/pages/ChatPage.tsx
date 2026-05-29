import { $, component$, useSignal, useVisibleTask$, type PropFunction } from '@builder.io/qwik';
import { listChatMessages, sendChatMessage, type AppContext, type ChatMessage, type PublicUser } from '../../lib/api';

type ChatPageProps = {
  appContext: AppContext;
  currentUser: PublicUser | null;
  token: string;
  navigate$: PropFunction<(path: string) => void>;
};

export const ChatPage = component$((props: ChatPageProps) => {
  const messageText = useSignal('');
  const messages = useSignal<ChatMessage[]>([]);
  const loading = useSignal(true);
  const sending = useSignal(false);
  const error = useSignal('');

  const loadMessages = $(async () => {
    if (!props.token) return;
    try {
      error.value = '';
      messages.value = await listChatMessages(props.token);
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Nao foi possivel carregar mensagens';
    } finally {
      loading.value = false;
    }
  });

  const sendMessage$ = $(async () => {
    const text = messageText.value.trim();
    if (!text) return;
    if (!props.token) return;
    try {
      sending.value = true;
      error.value = '';
      await sendChatMessage(props.token, text, props.appContext);
      messageText.value = '';
      await loadMessages();
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Nao foi possivel enviar a mensagem';
    } finally {
      sending.value = false;
    }
  });

  useVisibleTask$(({ cleanup }) => {
    loadMessages();
    const timer = window.setInterval(() => {
      loadMessages();
    }, 3000);
    cleanup(() => {
      window.clearInterval(timer);
    });
  });

  const currentAppLabel = appLabel(props.appContext);

  return (
    <section class="glass-panel ops-workspace">
      <header class="page-header-row">
        <div>
          <span class="page-eyebrow">GESTISAC - Chat</span>
          <h1>Chat de apoio</h1>
          <p>Canal partilhado entre Cliente, HQ e Fornecedores para comunicacao direta.</p>
        </div>
        <div class="page-actions">
          <button class="secondary-action" type="button" onClick$={() => props.navigate$('/tickets')}>
            Abrir tickets
          </button>
        </div>
      </header>

      <div class="chat-page">
        <div class="chat-meta glass-panel">
          <strong>App atual: {currentAppLabel}</strong>
          <span>{messages.value.length} mensagens no canal global</span>
        </div>

        <div class="chat-feed glass-panel" role="log" aria-live="polite" aria-label="Mensagens do chat">
          {error.value ? <p class="chat-empty">{error.value}</p> : null}
          {loading.value ? <p class="chat-empty">A carregar mensagens...</p> : null}
          {messages.value.length ? (
            messages.value.map((msg) => (
              <article class="chat-message" key={msg.id}>
                <header>
                  <strong>{msg.senderName}</strong>
                  <span>{msg.senderRole} - {appLabel(msg.sourceApp)}</span>
                  <time dateTime={msg.createdAt}>{formatDateTime(msg.createdAt)}</time>
                </header>
                <p>{msg.text}</p>
              </article>
            ))
          ) : (
            <p class="chat-empty">Sem mensagens ainda. Escreve a primeira para iniciar a conversa.</p>
          )}
        </div>

        <form
          class="chat-compose glass-panel"
          preventdefault:submit
          onSubmit$={async () => {
            await sendMessage$();
          }}
        >
          <label for="chat-input">Nova mensagem</label>
          <textarea
            id="chat-input"
            rows={3}
            placeholder="Escreve aqui para falar com apoio, HQ e fornecedores..."
            value={messageText.value}
            onInput$={(event) => {
              const target = event.target as HTMLTextAreaElement;
              messageText.value = target.value;
            }}
          />
          <div class="chat-compose-actions">
            <button class="primary-action" type="submit" disabled={!messageText.value.trim() || sending.value}>
              Enviar
            </button>
          </div>
        </form>
      </div>
    </section>
  );
});

function appLabel(app: AppContext): string {
  if (app === 'client') return 'Cliente';
  if (app === 'worker') return 'Fornecedores';
  return 'HQ';
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}
