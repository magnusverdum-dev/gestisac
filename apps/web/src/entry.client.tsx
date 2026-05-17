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

const applyPwaEnvironment = () => {
  const standalone = window.matchMedia('(display-mode: standalone)').matches;
  const navigatorStandalone =
    'standalone' in navigator &&
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  const userAgent = navigator.userAgent.toLowerCase();

  document.documentElement.classList.toggle('pwa-standalone', standalone || navigatorStandalone);
  document.documentElement.classList.toggle('pwa-installed', Boolean(window.__gestisacPwaInstalled));
  document.documentElement.classList.toggle('pwa-ios', /iphone|ipad|ipod/.test(userAgent));
  document.documentElement.classList.toggle('pwa-android', userAgent.includes('android'));
};

export default function (opts: RenderOptions) {
  applyPwaEnvironment();

  const standaloneQuery = window.matchMedia('(display-mode: standalone)');
  const standaloneQueryWithLegacy = standaloneQuery as unknown as {
    addEventListener?: (type: 'change', listener: () => void) => void;
    addListener?: (listener: () => void) => void;
  };

  if (standaloneQueryWithLegacy.addEventListener) {
    standaloneQueryWithLegacy.addEventListener('change', applyPwaEnvironment);
  } else if (standaloneQueryWithLegacy.addListener) {
    standaloneQueryWithLegacy.addListener(applyPwaEnvironment);
  }

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    window.__gestisacInstallPrompt = event as BeforeInstallPromptEvent;
    window.dispatchEvent(new Event('gestisac-pwa-install-ready'));
  });

  window.addEventListener('appinstalled', () => {
    window.__gestisacInstallPrompt = undefined;
    window.__gestisacPwaInstalled = true;
    applyPwaEnvironment();
    window.dispatchEvent(new Event('gestisac-pwa-installed'));
  });

  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => undefined);
    });
  }

  return render(document, <Root />, opts);
}
