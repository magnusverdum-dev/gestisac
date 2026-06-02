import type { AppContext, PermissionModule, PublicUser } from '@gestisac/domain-types';

export type AppSessionKeys = {
  token: string;
  refreshToken: string;
  expiresAt: string;
  appContext: string;
};

export type AppSession = {
  token: string;
  refreshToken: string;
  expiresAt: string;
  user: PublicUser;
  appContext: AppContext;
};

export const appSessionKeys = (appContext: AppContext): AppSessionKeys => ({
  token: `gestisac.${appContext}.token`,
  refreshToken: `gestisac.${appContext}.refreshToken`,
  expiresAt: `gestisac.${appContext}.expiresAt`,
  appContext: `gestisac.${appContext}.context`
});

export const isAppContext = (value: string): value is AppContext =>
  value === 'hq' || value === 'client' || value === 'worker';

export const canOpenApp = (
  appContext: AppContext,
  permissions: PermissionModule[],
  role: string
): boolean => {
  const normalizedRole = role.toLowerCase();
  if (normalizedRole.includes('administrador')) return true;
  if (appContext === 'client') return true;
  if (appContext === 'worker') {
    return permissions.some((permission) => permission.module === 'operations' && permission.canRead);
  }
  return permissions.some((permission) => permission.canRead);
};

export const appLoginPath = (appContext: AppContext): string => `/${appContext}/login`;
