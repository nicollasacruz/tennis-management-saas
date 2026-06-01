'use client';

import { useEffect, useState } from 'react';
import { API_BASE } from '@/lib/utils';

type SlugState = { available: boolean; reason?: string } | null;

export default function OnboardingPage() {
  const [schoolName, setSchoolName] = useState('');
  const [slug, setSlug] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [password, setPassword] = useState('');
  const [slugState, setSlugState] = useState<SlugState>(null);
  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sugere slug a partir do nome da escola.
  useEffect(() => {
    if (!slug && schoolName) {
      setSlug(
        schoolName
          .toLowerCase()
          .normalize('NFD')
          .replace(/[̀-ͯ]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
          .slice(0, 40),
      );
    }
  }, [schoolName, slug]);

  // Checagem de disponibilidade do slug (debounce).
  useEffect(() => {
    if (!slug) {
      setSlugState(null);
      return;
    }
    setChecking(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `${API_BASE}/onboarding/slug?slug=${encodeURIComponent(slug)}`,
        );
        const data = await res.json();
        setSlugState({ available: data.available, reason: data.reason });
      } catch {
        setSlugState(null);
      } finally {
        setChecking(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [slug]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/onboarding/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolName,
          slug,
          adminName,
          adminEmail,
          password,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message ?? 'Falha ao iniciar o checkout');
      }
      // Redireciona para o checkout (Stripe real ou página de pagamento mock).
      window.location.href = data.checkoutUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado');
      setSubmitting(false);
    }
  }

  const canSubmit =
    schoolName &&
    slug &&
    adminName &&
    adminEmail &&
    password.length >= 8 &&
    slugState?.available &&
    !submitting;

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-6 px-6 py-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Crie a sua escola</h1>
        <p className="mt-2 text-sm text-gray-500">
          Escolha o seu endereço, faça a assinatura e comece a usar em segundos.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Nome da escola
          <input
            className="rounded-md border border-gray-300 px-3 py-2"
            value={schoolName}
            onChange={(e) => setSchoolName(e.target.value)}
            placeholder="Academia Lisboa"
            required
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Endereço (subdomínio)
          <div className="flex items-center gap-1">
            <input
              className="w-40 rounded-md border border-gray-300 px-3 py-2"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase())}
              placeholder="academia-lisboa"
              required
            />
            <span className="text-gray-500">.clubtenispro.com</span>
          </div>
          {slug && (
            <span
              className={`text-xs ${
                checking
                  ? 'text-gray-400'
                  : slugState?.available
                    ? 'text-green-600'
                    : 'text-red-600'
              }`}
            >
              {checking
                ? 'a verificar…'
                : slugState?.available
                  ? '✓ disponível'
                  : `✗ ${slugState?.reason ?? 'indisponível'}`}
            </span>
          )}
        </label>

        <label className="flex flex-col gap-1 text-sm">
          O seu nome
          <input
            className="rounded-md border border-gray-300 px-3 py-2"
            value={adminName}
            onChange={(e) => setAdminName(e.target.value)}
            required
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Email de administrador
          <input
            type="email"
            className="rounded-md border border-gray-300 px-3 py-2"
            value={adminEmail}
            onChange={(e) => setAdminEmail(e.target.value)}
            required
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Palavra-passe (mín. 8)
          <input
            type="password"
            className="rounded-md border border-gray-300 px-3 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={!canSubmit}
          className="mt-2 rounded-md bg-emerald-600 px-4 py-2.5 font-medium text-white disabled:opacity-50"
        >
          {submitting ? 'A redirecionar…' : 'Avançar para o pagamento'}
        </button>
      </form>
    </main>
  );
}
