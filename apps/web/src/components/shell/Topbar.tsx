import { component$, useSignal, type PropFunction } from '@builder.io/qwik';
import type { AlertItem, GlobalSearchResult, PublicUser } from '../../lib/api';

export type ApiStatus = 'online' | 'offline' | 'checking';

type TopbarProps = {
  apiStatus: ApiStatus;
  alertCount: number;
  alerts: AlertItem[];
  searchResults: GlobalSearchResult[];
  user: PublicUser;
  navigate$: PropFunction<(path: string) => void>;
  onLogout$: PropFunction<() => void>;
};

export const Topbar = component$((props: TopbarProps) => {
  const searchQuery = useSignal('');
  const alertsOpen = useSignal(false);
  const statusLabel =
    props.apiStatus === 'online'
      ? 'Sistema ativo'
      : props.apiStatus === 'offline'
        ? 'Modo local'
        : 'A ligar';
  const normalizedSearch = searchQuery.value.trim().toLowerCase();
  const visibleResults = normalizedSearch
    ? props.searchResults
        .filter((result) =>
          `${result.title} ${result.detail}`.toLowerCase().includes(normalizedSearch)
        )
        .slice(0, 7)
    : [];

  return (
    <header class="topbar">
      <div class="search-box">
        <span>?</span>
        <input
          aria-label="Pesquisar"
          placeholder="Pesquisar..."
          value={searchQuery.value}
          onInput$={(event) => {
            searchQuery.value = (event.target as HTMLInputElement).value;
            alertsOpen.value = false;
          }}
        />
        <kbd>Ctrl K</kbd>
        {searchQuery.value ? (
          <div class="topbar-popover search-results">
            <small>Pesquisa operacional</small>
            {visibleResults.length ? (
              visibleResults.map((result) => (
                <button
                  class={`search-result ${result.tone}`}
                  key={result.id}
                  type="button"
                  onClick$={() => {
                    searchQuery.value = '';
                    props.navigate$(result.path);
                  }}
                >
                  <strong>{result.title}</strong>
                  <span>{result.detail}</span>
                </button>
              ))
            ) : (
              <div class="empty-popover">Sem resultados para esta pesquisa.</div>
            )}
          </div>
        ) : null}
      </div>

      <div class="topbar-actions">
        <div class={`system-status ${props.apiStatus}`}>{statusLabel}</div>
        <button
          class="urgent-pill"
          type="button"
          onClick$={() => {
            props.navigate$('/contabilidade');
          }}
        >
          <span>!</span>
          {props.alertCount} avisos
        </button>
        <div class="topbar-menu-anchor">
          <button
            class="notification"
            aria-label="Notificacoes"
            type="button"
            onClick$={() => {
              alertsOpen.value = !alertsOpen.value;
            }}
          >
            <span>{props.alertCount}</span>
          </button>
          {alertsOpen.value ? (
            <div class="topbar-popover notification-panel">
              <small>Notificacoes ativas</small>
              {props.alerts.map((alert) => (
                <button
                  class={`notification-item ${alert.tone}`}
                  key={`${alert.type}-${alert.title}`}
                  type="button"
                  onClick$={() => {
                    alertsOpen.value = false;
                    props.navigate$(alert.type === 'ticket' ? '/tickets' : '/contabilidade');
                  }}
                >
                  <strong>{alert.title}</strong>
                  <span>{alert.detail}</span>
                </button>
              ))}
              <button
                class="popover-action"
                type="button"
                onClick$={() => {
                  alertsOpen.value = false;
                  props.navigate$('/administracao');
                }}
              >
                Ver centro operacional
              </button>
            </div>
          ) : null}
        </div>
        <button class="user-pill" type="button" aria-label="Terminar sessao" onClick$={props.onLogout$}>
          {initials(props.user.name)}
        </button>
      </div>
    </header>
  );
});

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}
