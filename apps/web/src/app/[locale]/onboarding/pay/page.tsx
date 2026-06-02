'use client';

import { CheckCircle2, CreditCard } from 'lucide-react';
import { useParams, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { OnboardingHeader } from '@/components/onboarding-header';
import { API_BASE, formatCurrency } from '@/lib/utils';

const MONTHLY_PRICE_CENTS = 3990;

function MockCheckout() {
  const params = useParams<{ locale: string }>();
  const searchParams = useSearchParams();
  const locale = params.locale ?? 'pt';
  const session = searchParams.get('session') ?? '';
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pay() {
    setError(null);
    setPaying(true);
    try {
      const res = await fetch(`${API_BASE}/onboarding/mock/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message ?? 'Falha no pagamento');
      window.location.href = `/${locale}/onboarding/sucesso?session=${encodeURIComponent(
        session,
      )}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado');
      setPaying(false);
    }
  }

  return (
    <div className="min-h-screen text-[var(--ink)]">
      <OnboardingHeader />
      <main className="px-6 py-10 md:py-14">
        <section className="mx-auto w-full max-w-lg rounded-3xl border border-[var(--border)] bg-[var(--cream)] p-6 shadow-[0_24px_60px_-30px_rgba(15,31,21,0.35)] sm:p-8">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--accent-strong)]">
                Modo de teste local
              </p>
              <h1 className="mt-1 text-2xl font-extrabold">Pagamento mensal</h1>
            </div>
            <CreditCard className="text-[var(--accent-strong)]" size={28} />
          </div>

          <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--paper)] p-4">
            <div className="flex items-end gap-2">
              <span className="text-3xl font-extrabold tracking-tight">
                {formatCurrency(MONTHLY_PRICE_CENTS)}
              </span>
              <span className="pb-1 text-sm font-semibold text-[var(--muted)]">
                / mês
              </span>
            </div>
            <p className="mt-2 text-sm leading-[1.7] text-[var(--muted)]">
              Esta página só aparece quando a Stripe real não está configurada.
              Em produção, o cliente é enviado para Stripe Checkout.
            </p>
          </div>

          <div className="mt-4 flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--accent-soft)] px-3 py-2 text-sm font-medium text-[var(--accent-strong)]">
            <CheckCircle2 size={17} />
            Cartão de teste: 4242 4242 4242 4242
          </div>

          <p className="mt-3 break-all text-xs text-[var(--muted)]">
            Sessão: {session}
          </p>

          {error && (
            <p className="mt-3 rounded-xl border border-[rgba(160,74,55,0.2)] bg-[#fcebe7] px-3 py-2 text-sm font-semibold text-[#914a39]">
              {error}
            </p>
          )}

          <button
            onClick={pay}
            disabled={!session || paying}
            className="mt-6 flex h-12 w-full items-center justify-center rounded-xl bg-[var(--ink)] px-4 text-sm font-bold text-white transition-colors hover:bg-[var(--ink-soft)] disabled:cursor-not-allowed disabled:opacity-45"
          >
            {paying ? 'A processar pagamento...' : 'Pagar e criar escola'}
          </button>
        </section>
      </main>
    </div>
  );
}

export default function PayPage() {
  return (
    <Suspense>
      <MockCheckout />
    </Suspense>
  );
}
