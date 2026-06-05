import { component$, type PropFunction } from '@builder.io/qwik';
import type { ApiStatus, AppContext } from '../../lib/api';
import { PwaInstallPanel } from '../dashboard/PwaInstallPanel';

type LoginPageProps = {
  apiStatus: ApiStatus;
  error: string;
  isLoading: boolean;
  appContext: AppContext;
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
          <p>Acede com a conta fornecida pela administracao.</p>
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

          {props.error ? <p class="form-error">{props.error}</p> : null}

          <button class="primary-action" type="submit" disabled={props.isLoading}>
            {props.isLoading ? 'A entrar...' : 'Entrar'}
          </button>
          <button
            class="secondary-action"
            type="button"
            disabled={props.isLoading || !props.onBrowserSession$}
            onClick$={props.onBrowserSession$}
          >
            Sessão de browser
          </button>
          <button
            class="secondary-action"
            type="button"
            disabled={props.isLoading}
            onClick$={props.onBackToEntry$}
          >
            Voltar ao menu das apps
          </button>
          {props.isLoading ? (
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
