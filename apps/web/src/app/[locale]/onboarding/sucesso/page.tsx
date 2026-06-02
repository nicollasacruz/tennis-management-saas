'use client';

import { ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { OnboardingHeader } from '@/components/onboarding-header';
import { API_BASE } from '@/lib/utils';

type CheckoutResult = {
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  slug?: string;
  host?: string;
  appUrl?: string;
  name?: string;
};

function Success() {
  const params = useSearchParams();
  const session = params.get('session') ?? '';
  const hostFromQuery = params.get('host') ?? '';
  const appUrlFromQuery =
    params.get('appUrl') || (hostFromQuery ? `https://${hostFromQuery}` : '');
  const [result, setResult] = useState<CheckoutResult | null>(
    appUrlFromQuery
      ? {
          status: 'COMPLETED',
          host: hostFromQuery,
          appUrl: appUrlFromQuery,
        }
      : null,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session || appUrlFromQuery) return;

    let cancelled = false;
    let attempts = 0;

    async function loadResult() {
      attempts += 1;
      try {
        const res = await fetch(
          `${API_BASE}/onboarding/result?session=${encodeURIComponent(session)}`,
          { cache: 'no-store' },
        );
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.message ?? 'Ainda não foi possível confirmar a conta.');
        }
        if (!cancelled) {
          setResult(data);
          setError(null);
        }
        if (data.status !== 'COMPLETED' && attempts < 20 && !cancelled) {
          window.setTimeout(loadResult, 1500);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Erro inesperado.');
        }
        if (attempts < 8 && !cancelled) {
          window.setTimeout(loadResult, 1500);
        }
      }
    }

    void loadResult();

    return () => {
      cancelled = true;
    };
  }, [appUrlFromQuery, session]);

  const isReady = result?.status === 'COMPLETED' && result.appUrl;
  const host = result?.host ?? hostFromQuery;

  return (
    <div className="min-h-screen text-[var(--ink)]">
      <OnboardingHeader />
      <main className="px-6 py-10 text-center md:py-14">
        <section className="mx-auto w-full max-w-xl rounded-3xl border border-[var(--border)] bg-[var(--cream)] p-6 shadow-[0_24px_60px_-30px_rgba(15,31,21,0.35)] sm:p-8">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent-strong)]">
            {isReady ? (
              <CheckCircle2 size={30} />
            ) : (
              <Loader2 size={28} className="animate-spin" />
            )}
          </div>

          <h1 className="text-[clamp(1.6rem,3.5vw,2.25rem)] font-extrabold tracking-tight">
            {isReady ? 'A sua escola está pronta.' : 'Estamos a activar a sua escola.'}
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-[1.7] text-[var(--muted)]">
            {isReady
              ? 'Faça login com o email e a palavra-passe definidos no onboarding.'
              : 'O pagamento foi concluído. A criação da conta pode demorar alguns segundos enquanto a Stripe confirma a sessão.'}
          </p>

          {error && (
            <p className="mt-5 rounded-xl border border-[rgba(160,74,55,0.2)] bg-[#fcebe7] px-3 py-2 text-sm font-semibold text-[#914a39]">
              {error}
            </p>
          )}

          {isReady ? (
            <a
              href={result.appUrl}
              className="group mt-7 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[var(--ink)] px-5 text-sm font-bold text-white transition-colors hover:bg-[var(--ink-soft)]"
            >
              Entrar em {host}
              <ArrowRight
                size={18}
                className="transition-transform group-hover:translate-x-0.5"
              />
            </a>
          ) : (
            <div className="mt-7 rounded-2xl border border-[var(--border-soft)] bg-[var(--paper)] px-4 py-3 text-sm font-medium text-[var(--muted)]">
              Pode manter esta página aberta. Actualizamos automaticamente.
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense>
      <Success />
    </Suspense>
  );
}
