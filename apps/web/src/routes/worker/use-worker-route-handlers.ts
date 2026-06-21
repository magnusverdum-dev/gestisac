import { $ } from '@builder.io/qwik';
import { useNavigate } from '@builder.io/qwik-city';

export function useWorkerRouteHandlers() {
  const nav = useNavigate();

  const navigate$ = $((path: string) => {
    nav(path);
  });

  const onLogout$ = $(() => {
    // Future: clear session cookie + redirect to /entry
  });

  const onSwitchApp$ = $(() => {
    // Future: switch app context
  });

  return { navigate$, onLogout$, onSwitchApp$ };
}
