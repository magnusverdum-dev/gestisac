import { component$, type PropFunction } from '@builder.io/qwik';
import type { ApiStatus, AppContext } from '../../lib/api';
import { PwaInstallPanel } from '../dashboard/PwaInstallPanel';

type LoginPageProps = {
  apiStatus: ApiStatus;
  error: string;
  isLoading: boolean;
  loadingProgress?: number;
  appContext: AppContext;
  hideCredentialEntry?: boolean;
  defaultEmail?: string;
  defaultPassword?: string;
  onLogin$: PropFunction<(email: string, password: string, appContext: AppContext) => void>;
  onBrowserSession$?: PropFunction<() => void>;
  onBackToEntry$: PropFunction<() => void>;
};

export const LoginPage = component$((props: LoginPageProps) => {
  const appLabel =
    props.appContext === 'worker'
      ? 'App Funcionarios'
      : props.appContext === 'client'
        ? 'App Clientes'
        : 'GESTISAC HQ';

  return (
    <main class="login-screen">
      <div class="ambient ambient-one" />
      <div class="ambient ambient-two" />
      <section class="login-panel glass-panel">
        <div class="brand login-brand">
          <div class="brand-mark">
            <span />
            <span />
            <span />
          </div>
          <div>
            <strong>GESTISAC</strong>
            <small>{appLabel}</small>
          </div>
        </div>

        <div class="login-copy">
          <span class={`system-status ${props.apiStatus}`}>
            {props.apiStatus === 'online' ? 'API Rust online' : 'A ligar ao backend'}
          </span>
          <h1>Entrar</h1>
          <p>
            {props.hideCredentialEntry
              ? 'Sessao de desenvolvimento a abrir automaticamente, sem credenciais manuais.'
              : 'Acede com a conta fornecida pela administracao.'}
          </p>
        </div>

        <form
          class="login-form"
          preventdefault:submit
          onSubmit$={(event) => {
            const form = event.target as HTMLFormElement;
            const formData = new FormData(form);
            props.onLogin$(
              String(formData.get('email') ?? ''),
              String(formData.get('password') ?? ''),
              props.appContext
            );
          }}
        >
          {!props.hideCredentialEntry ? (
            <>
              <label>
                <span>Email</span>
                <input
                  name="email"
                  type="text"
                  inputMode="email"
                  autoComplete="username"
                  placeholder="email@empresa.pt"
                  value={props.defaultEmail}
                  required
                />
              </label>
              <label>
                <span>Password</span>
                <input
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Password da conta"
                  value={props.defaultPassword}
                  required
                />
              </label>
            </>
          ) : null}

          {props.error ? <p class="form-error">{props.error}</p> : null}

          {props.hideCredentialEntry ? (
            <div class="login-progress" role="status" aria-live="polite">
              <div class="login-progress-header">
                <strong>Servidor a ligar</strong>
                <span>{Math.max(1, Math.min(99, props.loadingProgress ?? 12))}%</span>
              </div>
              <div class="login-progress-track" aria-hidden="true">
                <span style={{ width: `${Math.max(1, Math.min(99, props.loadingProgress ?? 12))}%` }} />
              </div>
              <p>Estamos a abrir a API publicada e a preparar a sessao. Nao tens de escrever nada.</p>
            </div>
          ) : null}

          {!props.hideCredentialEntry ? (
            <button class="primary-action" type="submit" disabled={props.isLoading}>
              {props.isLoading ? 'A entrar...' : 'Entrar'}
            </button>
          ) : null}
          <button
            class="secondary-action"
            type="button"
            disabled={props.isLoading || !props.onBrowserSession$}
            onClick$={props.onBrowserSession$}
          >
            {props.hideCredentialEntry ? 'Repetir sessao automatica' : 'Sessao de browser'}
          </button>
          <button
            class="secondary-action"
            type="button"
            disabled={props.isLoading}
            onClick$={props.onBackToEntry$}
          >
            Voltar ao menu das apps
          </button>
          {props.isLoading && !props.hideCredentialEntry ? (
            <p class="form-hint">
              A ligar a API online. No primeiro arranque pode demorar alguns segundos.
            </p>
          ) : null}
        </form>

        <PwaInstallPanel compact />
      </section>
    </main>
  );
});
