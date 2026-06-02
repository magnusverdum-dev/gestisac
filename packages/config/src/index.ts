import type { AppContext } from '@gestisac/domain-types';

export type RuntimeEnv = Record<string, string | boolean | undefined>;

export type AppRuntimeConfig = {
  appContext: AppContext;
  appName: string;
  apiBaseUrl: string;
  publicBasePath: string;
  featureFlags: Record<string, boolean>;
};

const APP_LABELS: Record<AppContext, string> = {
  hq: 'GESTISAC HQ',
  client: 'GESTISAC Cliente',
  worker: 'GESTISAC Worker'
};

export const createRuntimeConfig = (
  appContext: AppContext,
  env: RuntimeEnv = {}
): AppRuntimeConfig => ({
  appContext,
  appName: APP_LABELS[appContext],
  apiBaseUrl: normalizeUrl(readEnv(env, 'VITE_API_BASE_URL')),
  publicBasePath: readEnv(env, 'VITE_PUBLIC_BASE_PATH') || '/',
  featureFlags: {
    postgresRelationalReadiness: readBoolean(env, 'VITE_FEATURE_POSTGRES_RELATIONAL_READINESS', true),
    separatedApps: true
  }
});

export const normalizeUrl = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return '';
  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
};

const readEnv = (env: RuntimeEnv, key: string): string => {
  const value = env[key];
  return typeof value === 'string' ? value : '';
};

const readBoolean = (env: RuntimeEnv, key: string, fallback: boolean): boolean => {
  const value = env[key];
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return fallback;
  return ['1', 'true', 'yes', 'sim'].includes(value.toLowerCase());
};
