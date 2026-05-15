import { component$, type PropFunction } from '@builder.io/qwik';
import type { ApiStatus } from '../../lib/api';

type LoginPageProps = {
  apiStatus: ApiStatus;
  error: string;
  isLoading: boolean;
  onLogin$: PropFunction<(email: string, password: string) => void>;
};

export const LoginPage = component$((props: LoginPageProps) => {
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
            <small>Gestao de Condominios</small>
          </div>
        </div>

        <div class="login-copy">
          <span class={`system-status ${props.apiStatus}`}>
            {props.apiStatus === 'online' ? 'API Rust online' : 'A ligar ao backend'}
          </span>
          <h1>Entrar na plataforma</h1>
          <p>Usa a conta inicial para gerir condominios, tickets, fornecedores e documentos.</p>
        </div>

        <form
          class="login-form"
          preventdefault:submit
          onSubmit$={(event) => {
            const form = event.target as HTMLFormElement;
            const formData = new FormData(form);
            props.onLogin$(
              String(formData.get('email') ?? ''),
              String(formData.get('password') ?? '')
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
              placeholder="admin@gestisac.pt"
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
              required
            />
          </label>

          {props.error ? <p class="form-error">{props.error}</p> : null}

          <button class="primary-action" type="submit" disabled={props.isLoading}>
            {props.isLoading ? 'A entrar...' : 'Entrar'}
          </button>
        </form>
      </section>
    </main>
  );
});
