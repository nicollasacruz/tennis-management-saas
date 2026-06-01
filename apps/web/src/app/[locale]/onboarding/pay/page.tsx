'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { API_BASE } from '@/lib/utils';

// Página de pagamento SIMULADA (substitui o Stripe Checkout enquanto não há
// conta Stripe). Quando o Stripe real estiver configurado, o checkout do
// backend devolve a URL do Stripe e esta página não é usada.
function MockCheckout() {
  const params = useSearchParams();
  const session = params.get('session') ?? '';
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
      const qs = new URLSearchParams({
        slug: data.slug,
        host: data.host,
        appUrl: data.appUrl,
      });
      window.location.href = `/onboarding/sucesso?${qs.toString()}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado');
      setPaying(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6 py-12">
      <div className="rounded-xl border border-gray-200 p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-lg font-semibold">Assinatura mensal</span>
          <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
            test mode
          </span>
        </div>
        <p className="text-sm text-gray-500">
          Pagamento simulado (sem Stripe real). Cartão de teste:{' '}
          <code className="rounded bg-gray-100 px-1">4242 4242 4242 4242</code>
        </p>
        <p className="mt-1 break-all text-xs text-gray-400">sessão: {session}</p>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <button
          onClick={pay}
          disabled={!session || paying}
          className="mt-6 w-full rounded-md bg-emerald-600 px-4 py-2.5 font-medium text-white disabled:opacity-50"
        >
          {paying ? 'A processar…' : 'Pagar e criar escola'}
        </button>
      </div>
    </main>
  );
}

export default function PayPage() {
  return (
    <Suspense>
      <MockCheckout />
    </Suspense>
  );
}
