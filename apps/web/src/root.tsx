import { component$ } from '@builder.io/qwik';
import { QwikCityProvider, RouterOutlet } from '@builder.io/qwik-city';
import './styles/global.css';

export default component$(() => {
  return (
    <QwikCityProvider>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta
          name="description"
          content="GESTISAC - plataforma premium de gestao de condominios"
        />
        <title>GESTISAC Command Center</title>
      </head>
      <body lang="pt-PT">
        <RouterOutlet />
      </body>
    </QwikCityProvider>
  );
});
