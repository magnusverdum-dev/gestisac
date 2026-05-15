import { $, component$, useSignal, useVisibleTask$ } from '@builder.io/qwik';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

type PwaInstallPanelProps = {
  compact?: boolean;
};

export const PwaInstallPanel = component$((props: PwaInstallPanelProps) => {
  const isInstalled = useSignal(false);
  const installAvailable = useSignal(false);
  const showInstructions = useSignal(false);
  const platform = useSignal<'android' | 'ios' | 'desktop' | 'unknown'>('unknown');
  const installState = useSignal<'ready' | 'installing' | 'installed' | 'manual'>('manual');

  const refreshInstallState = $(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches;
    const navigatorStandalone =
      'standalone' in navigator &&
      (navigator as Navigator & { standalone?: boolean }).standalone === true;

    const userAgent = navigator.userAgent.toLowerCase();
    const isiOS = /iphone|ipad|ipod/.test(userAgent);
    const isAndroid = userAgent.includes('android');

    platform.value = isiOS ? 'ios' : isAndroid ? 'android' : 'desktop';
    isInstalled.value = Boolean(window.__gestisacPwaInstalled) || standalone || navigatorStandalone;
    installAvailable.value = Boolean(window.__gestisacInstallPrompt);
    installState.value = isInstalled.value
      ? 'installed'
      : installAvailable.value
        ? 'ready'
        : 'manual';
  });

  useVisibleTask$(({ cleanup }) => {
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      window.__gestisacInstallPrompt = event as BeforeInstallPromptEvent;
      installAvailable.value = true;
      refreshInstallState();
    };

    const onInstalled = () => {
      window.__gestisacInstallPrompt = undefined;
      window.__gestisacPwaInstalled = true;
      installAvailable.value = false;
      isInstalled.value = true;
      installState.value = 'installed';
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onInstalled);
    window.addEventListener('gestisac-pwa-install-ready', refreshInstallState);
    window.addEventListener('gestisac-pwa-installed', onInstalled);
    refreshInstallState();

    cleanup(() => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onInstalled);
      window.removeEventListener('gestisac-pwa-install-ready', refreshInstallState);
      window.removeEventListener('gestisac-pwa-installed', onInstalled);
    });
  });

  const install$ = $(async () => {
    if (isInstalled.value) {
      installState.value = 'installed';
      return;
    }

    const promptEvent = window.__gestisacInstallPrompt;
    if (!promptEvent) {
      installState.value = 'manual';
      showInstructions.value = true;
      return;
    }

    installState.value = 'installing';
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    window.__gestisacInstallPrompt = undefined;
    installAvailable.value = false;
    isInstalled.value = choice.outcome === 'accepted';
    installState.value = isInstalled.value ? 'installed' : 'manual';
    showInstructions.value = choice.outcome !== 'accepted';
  });

  return (
    <section
      class={props.compact ? 'mobile-version-panel compact glass-panel' : 'mobile-version-panel glass-panel'}
      aria-label="Versao telemovel"
    >
      <div class="mobile-version-copy">
        <span class="eyebrow">Versao Telemovel</span>
        <strong>
          {isInstalled.value ? 'Aplicacao instalada' : 'Aplicacao pronta para instalar'}
        </strong>
        <p>
          {installState.value === 'installed'
            ? 'A GESTISAC ja esta disponivel como app neste dispositivo.'
            : installState.value === 'ready'
              ? 'Toca em instalar para abrir a GESTISAC como uma app.'
              : platform.value === 'ios'
                ? 'No iPhone, usa Partilhar e depois Adicionar ao ecra principal.'
                : 'Se o botao direto nao aparecer, segue os passos abaixo.'}
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
          {isInstalled.value
            ? 'Instalada'
            : installState.value === 'ready'
              ? 'Instalar'
              : 'Como instalar'}
        </button>
      </div>

      {showInstructions.value && !isInstalled.value ? (
        <div class="install-instructions">
          {platform.value === 'ios' ? (
            <>
              <strong>Instalar no iPhone</strong>
              <ol>
                <li>Toca no botao Partilhar do Safari.</li>
                <li>Escolhe Adicionar ao ecra principal.</li>
                <li>Confirma com Adicionar.</li>
              </ol>
            </>
          ) : (
            <>
              <strong>Instalar no Android</strong>
              <ol>
                <li>Abre esta pagina no Chrome.</li>
                <li>Toca no menu dos tres pontos.</li>
                <li>Escolhe Instalar app ou Adicionar ao ecra principal.</li>
              </ol>
            </>
          )}
        </div>
      ) : null}

      <div class="build-signature">
        <span>Versao: Em desenvolvimento</span>
        <span>inteli Solutions - 2026</span>
      </div>
    </section>
  );
});
