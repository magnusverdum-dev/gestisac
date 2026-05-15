import { $, component$, useSignal, useVisibleTask$ } from '@builder.io/qwik';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

let deferredInstallPrompt: BeforeInstallPromptEvent | null = null;

export const PwaInstallPanel = component$(() => {
  const isInstalled = useSignal(false);
  const installAvailable = useSignal(false);
  const installState = useSignal<'ready' | 'installing' | 'installed' | 'manual'>('manual');

  const refreshInstallState = $(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches;
    const navigatorStandalone =
      'standalone' in navigator &&
      (navigator as Navigator & { standalone?: boolean }).standalone === true;

    isInstalled.value = standalone || navigatorStandalone;
    installState.value = isInstalled.value
      ? 'installed'
      : installAvailable.value
        ? 'ready'
        : 'manual';
  });

  useVisibleTask$(({ cleanup }) => {
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      deferredInstallPrompt = event as BeforeInstallPromptEvent;
      installAvailable.value = true;
      refreshInstallState();
    };

    const onInstalled = () => {
      deferredInstallPrompt = null;
      installAvailable.value = false;
      isInstalled.value = true;
      installState.value = 'installed';
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onInstalled);
    refreshInstallState();

    cleanup(() => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    });
  });

  const install$ = $(async () => {
    if (isInstalled.value) {
      installState.value = 'installed';
      return;
    }

    if (!deferredInstallPrompt) {
      installState.value = 'manual';
      return;
    }

    installState.value = 'installing';
    await deferredInstallPrompt.prompt();
    const choice = await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    installAvailable.value = false;
    isInstalled.value = choice.outcome === 'accepted';
    installState.value = isInstalled.value ? 'installed' : 'manual';
  });

  return (
    <section class="mobile-version-panel glass-panel" aria-label="Versao telemovel">
      <div class="mobile-version-copy">
        <span class="eyebrow">Versao Telemovel</span>
        <strong>
          {isInstalled.value ? 'Aplicacao instalada' : 'Aplicacao pronta para instalar'}
        </strong>
        <p>
          {installState.value === 'installed'
            ? 'A GESTISAC ja esta disponivel como app neste dispositivo.'
            : installState.value === 'ready'
              ? 'Instala a experiencia mobile para abrir como uma app.'
              : 'Instala pelo menu do browser quando o botao direto nao estiver disponivel.'}
        </p>
      </div>

      <div class="mobile-version-actions">
        <div class={`install-status ${installState.value}`}>
          {installState.value === 'installed'
            ? 'Instalada'
            : installState.value === 'ready'
              ? 'Instalavel'
              : installState.value === 'installing'
                ? 'A instalar'
                : 'Disponivel'}
        </div>
        <button
          class="install-button"
          type="button"
          disabled={isInstalled.value || installState.value === 'installing'}
          onClick$={install$}
        >
          {isInstalled.value ? 'Instalada' : 'Instalar'}
        </button>
      </div>

      <div class="build-signature">
        <span>Versao: Em desenvolvimento</span>
        <span>inteli Solutions - 2026</span>
      </div>
    </section>
  );
});
