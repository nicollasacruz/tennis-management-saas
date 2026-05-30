import { API_BASE } from './utils';
import type { CommunicationJob } from '@/types';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

export async function apiRequest<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const token = getToken();
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (response.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('authExpiresAt');
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    throw new Error('Sessão expirada. Por favor, faça login novamente.');
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

export async function openReceiptPdf(paymentId: string): Promise<void> {
  const token = getToken();
  const response = await fetch(`${API_BASE}/payments/${paymentId}/receipt.pdf`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (response.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('authExpiresAt');
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    throw new Error('Sessão expirada. Por favor, faça login novamente.');
  }

  if (!response.ok) {
    throw new Error('Não foi possível abrir o recibo.');
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank', 'noopener,noreferrer');
  if (!win) {
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export async function emailReceipt(
  paymentId: string,
  email?: string,
): Promise<{
  queued: boolean;
  jobId: string;
  status: string;
  to: string;
  filename: string;
}> {
  return apiRequest(`/payments/${paymentId}/email-receipt`, {
    method: 'POST',
    body: JSON.stringify(email ? { email } : {}),
  });
}

export async function listCommunicationJobs(filters: {
  channel?: string;
  status?: string;
} = {}): Promise<CommunicationJob[]> {
  const params = new URLSearchParams();
  if (filters.channel && filters.channel !== 'ALL') {
    params.set('channel', filters.channel);
  }
  if (filters.status && filters.status !== 'ALL') {
    params.set('status', filters.status);
  }

  const qs = params.toString();
  return apiRequest(qs ? `/communications/jobs?${qs}` : '/communications/jobs');
}

export async function retryCommunicationJob(
  channel: string,
  id: string,
): Promise<unknown> {
  return apiRequest(`/communications/jobs/${channel}/${id}/retry`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function login(email: string, password: string) {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Login failed' }));
    throw new Error(error.message || 'Credenciais inválidas');
  }

  return response.json();
}
