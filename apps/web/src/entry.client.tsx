import { render, type RenderOptions } from '@builder.io/qwik';
import Root from './root';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

declare global {
  interface Window {
    __gestisacInstallPrompt?: BeforeInstallPromptEvent;
    __gestisacPwaInstalled?: boolean;
  }
}

export default function (opts: RenderOptions) {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    window.__gestisacInstallPrompt = event as BeforeInstallPromptEvent;
    window.dispatchEvent(new Event('gestisac-pwa-install-ready'));
  });

  window.addEventListener('appinstalled', () => {
    window.__gestisacInstallPrompt = undefined;
    window.__gestisacPwaInstalled = true;
    window.dispatchEvent(new Event('gestisac-pwa-installed'));
  });

  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => undefined);
    });
  }

  return render(document, <Root />, opts);
}
