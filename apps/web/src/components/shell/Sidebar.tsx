import { component$, type PropFunction } from '@builder.io/qwik';
import { navPages } from '../../data/pages';
import type { PublicUser } from '../../lib/api';

type SidebarProps = {
  currentPath: string;
  user: PublicUser;
  navigate$: PropFunction<(path: string) => void>;
};

export const Sidebar = component$((props: SidebarProps) => {
  const normalizedCurrentPath = normalizeMenuPath(props.currentPath);

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

      <nav class="nav-list">
        {navPages.map((page) => {
          const isActive = isPathActive(normalizedCurrentPath, page.path);

          return (
            <a
              class={isActive ? 'nav-item active' : 'nav-item'}
              href={page.path}
              key={page.path}
              aria-current={isActive ? 'page' : undefined}
              onClick$={(event) => {
                event.preventDefault();
                props.navigate$(page.path);
              }}
            >
              <span>{page.icon}</span>
              {page.navLabel}
            </a>
          );
        })}
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

function normalizeMenuPath(path: string) {
  if (!path || path === '/') {
    return '/dashboard';
  }

  const pathname = path.split('?')[0]?.split('#')[0] ?? '/';
  const normalized = pathname.replace(/\/+$/, '');
  return normalized || '/dashboard';
}

function isPathActive(currentPath: string, targetPath: string) {
  const normalizedTarget = normalizeMenuPath(targetPath);
  return (
    currentPath === normalizedTarget ||
    currentPath.startsWith(`${normalizedTarget}/`)
  );
}

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}
