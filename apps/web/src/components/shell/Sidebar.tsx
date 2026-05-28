import { component$, useSignal, type PropFunction } from '@builder.io/qwik';
import { navPages } from '../../data/pages';
import type { AppContext, PublicUser } from '../../lib/api';

type SidebarProps = {
  currentPath: string;
  user: PublicUser;
  appContext: AppContext;
  navigate$: PropFunction<(path: string) => void>;
};

export const Sidebar = component$((props: SidebarProps) => {
  const mobileMenuOpen = useSignal(false);
  const navItems = navPages.filter((page) => {
    if (props.appContext === 'hq') return true;
    if (props.appContext === 'worker') {
      return ['/dashboard', '/tickets', '/manutencao', '/calendario', '/vistorias'].includes(page.path);
    }
    return ['/dashboard', '/tickets', '/documentos'].includes(page.path);
  });

  return (
    <aside class="sidebar" aria-label="Navegacao principal">
      <div class="brand">
        <div class="brand-mark">
          <span />
          <span />
          <span />
        </div>
        <div>
          <strong>GESTISAC</strong>
          <small>Gestao de Condominios</small>
        </div>
      </div>

      <button
        class="mobile-nav-toggle"
        type="button"
        aria-label={mobileMenuOpen.value ? 'Fechar menu' : 'Abrir menu'}
        aria-expanded={mobileMenuOpen.value}
        onClick$={() => {
          mobileMenuOpen.value = !mobileMenuOpen.value;
        }}
      >
        <span />
        <span />
        <span />
      </button>

      <nav class={mobileMenuOpen.value ? 'nav-list mobile-open' : 'nav-list'}>
        {navItems.map((page) => (
          <button
            class={props.currentPath === page.path ? 'nav-item active' : 'nav-item'}
            key={page.path}
            onClick$={() => {
              mobileMenuOpen.value = false;
              props.navigate$(page.path);
            }}
          >
            <span>{page.icon}</span>
            {page.navLabel}
          </button>
        ))}
      </nav>

      <div class="profile-card">
        <div class="avatar">{initials(props.user.name)}</div>
        <div class="profile-copy">
          <strong>{props.user.name}</strong>
          <span>{props.user.role}</span>
        </div>
        <div class="profile-meta">
          <span>{props.user.activeCondominiums} condominios ativos</span>
          <span>Sessao autenticada</span>
        </div>
      </div>
    </aside>
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
