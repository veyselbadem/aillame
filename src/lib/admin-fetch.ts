import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

export const ADMIN_TOKEN_KEY = 'aillame_admin_token';

export function getAdminToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ADMIN_TOKEN_KEY)?.trim() || null;
}

export function getAdminAuthHeaders(): Record<string, string> | null {
  const token = getAdminToken();
  if (!token) return null;
  return { 'x-aillame-admin-token': token };
}

export function redirectToAdminLogin(router: AppRouterInstance): void {
  router.push('/admin/login');
}

export function requireAdminTokenOrRedirect(
  router: AppRouterInstance
): string | null {
  const token = getAdminToken();
  if (!token) {
    redirectToAdminLogin(router);
    return null;
  }
  return token;
}

export async function adminFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const authHeaders = getAdminAuthHeaders() ?? {};
  const existingHeaders = (options.headers as Record<string, string>) ?? {};
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...existingHeaders,
    },
  });
}
