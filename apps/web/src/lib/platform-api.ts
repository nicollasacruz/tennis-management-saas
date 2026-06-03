import { API_BASE } from './utils';
import type {
  PlatformMetrics,
  PlatformOwner,
  PlatformTenant,
  PlatformTenantDetail,
} from '@/types';

// Cliente do painel gerencial (dono do SaaS). Token guardado numa chave própria
// para NÃO colidir com a sessão de tenant (`token`).
const KNOWN_LOCALES = ['pt', 'en', 'es'];
export const PLATFORM_TOKEN_KEY = 'platformToken';
export const PLATFORM_OWNER_KEY = 'platformOwner';

function resolveGerencialLoginPath(): string {
  if (typeof window === 'undefined') return '/gerencial/login';
  const segments = window.location.pathname.split('/');
  const candidate = segments[1];
  const locale = KNOWN_LOCALES.includes(candidate) ? candidate : 'pt';
  return `/${locale}/gerencial/login`;
}

function getPlatformToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(PLATFORM_TOKEN_KEY);
}

export function clearPlatformSession(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(PLATFORM_TOKEN_KEY);
  localStorage.removeItem(PLATFORM_OWNER_KEY);
}

export function getStoredOwner(): PlatformOwner | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(PLATFORM_OWNER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PlatformOwner;
  } catch {
    return null;
  }
}

async function platformRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getPlatformToken();
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (response.status === 401) {
    clearPlatformSession();
    if (typeof window !== 'undefined') {
      window.location.href = resolveGerencialLoginPath();
    }
    throw new Error('Sessão expirada. Inicie sessão novamente.');
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      message?: string | string[];
    } | null;
    const message = Array.isArray(payload?.message)
      ? payload.message.join(', ')
      : payload?.message;
    throw new Error(message ?? 'O servidor devolveu um erro.');
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function platformLogin(
  email: string,
  password: string,
): Promise<{ access_token: string; user: PlatformOwner }> {
  const response = await fetch(`${API_BASE}/platform/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: 'Falha no login' }));
    throw new Error(error.message || 'Credenciais inválidas');
  }

  const data = (await response.json()) as {
    access_token: string;
    user: PlatformOwner;
  };

  if (typeof window !== 'undefined') {
    localStorage.setItem(PLATFORM_TOKEN_KEY, data.access_token);
    localStorage.setItem(PLATFORM_OWNER_KEY, JSON.stringify(data.user));
  }

  return data;
}

export function getPlatformMetrics(): Promise<PlatformMetrics> {
  return platformRequest('/platform/metrics');
}

export function listPlatformTenants(): Promise<PlatformTenant[]> {
  return platformRequest('/platform/tenants');
}

export function getPlatformTenant(id: string): Promise<PlatformTenantDetail> {
  return platformRequest(`/platform/tenants/${id}`);
}

export function suspendTenant(id: string): Promise<PlatformTenant> {
  return platformRequest(`/platform/tenants/${id}/suspend`, { method: 'POST' });
}

export function reactivateTenant(id: string): Promise<PlatformTenant> {
  return platformRequest(`/platform/tenants/${id}/reactivate`, {
    method: 'POST',
  });
}

export function archiveTenant(id: string): Promise<PlatformTenant> {
  return platformRequest(`/platform/tenants/${id}/archive`, { method: 'POST' });
}
