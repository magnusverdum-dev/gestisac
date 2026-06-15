import { component$ } from '@builder.io/qwik';
import { QwikCityProvider, RouterOutlet } from '@builder.io/qwik-city';
import './styles/global.css';

export default component$(() => {
  return (
    <QwikCityProvider>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="GESTISAC - plataforma de gestao de condominios" />
        <meta name="theme-color" content="#0b1324" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="GESTISAC" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="icon" href="/icons/gestisac-icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icons/gestisac-maskable.svg" />
        <title>GESTISAC Command Center</title>
      </head>
      <body lang="pt-PT">
        <RouterOutlet />
      </body>
    </QwikCityProvider>
  );
});
