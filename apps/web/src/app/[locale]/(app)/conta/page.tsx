'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  CreditCard,
  ExternalLink,
  Loader2,
  Wallet,
} from 'lucide-react';
import { getTenantSubscription, openBillingPortal } from '@/lib/api';
import { useAuth } from '@/components/auth-provider';
import type { TenantSubscription } from '@/types';

const statusLabels: Record<string, string> = {
  active: 'Ativa',
  trialing: 'Em período de demonstração',
  past_due: 'Pagamento em atraso',
  canceled: 'Cancelada',
  unpaid: 'Por pagar',
  incomplete: 'Incompleta',
  incomplete_expired: 'Expirada',
  paused: 'Pausada',
};

function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

function formatDate(value: string | null): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat('pt-PT', { dateStyle: 'long' }).format(
    new Date(value),
  );
}

export default function ContaPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [feedback, setFeedback] = useState<string | null>(null);

  const { data, isLoading } = useQuery<TenantSubscription>({
    queryKey: ['tenant-subscription'],
    queryFn: getTenantSubscription,
  });

  const portalMutation = useMutation({
    mutationFn: () =>
      openBillingPortal(
        typeof window !== 'undefined' ? window.location.href : undefined,
      ),
    onSuccess: ({ url }) => {
      window.location.href = url;
    },
    onError: (error: unknown) => {
      setFeedback(
        error instanceof Error
          ? error.message
          : 'Não foi possível abrir a gestão de faturação.',
      );
    },
  });

  const subscription = data?.subscription;
  const interval =
    subscription?.interval === 'month'
      ? '/mês'
      : subscription?.interval === 'year'
        ? '/ano'
        : '';

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#566857]">
          Administração
        </p>
        <h1 className="mt-1 text-3xl font-extrabold text-[#183223]">Conta</h1>
        <p className="mt-1 text-sm text-[#566857]">
          Subscrição da escola e gestão de faturação.
        </p>
      </div>

      {feedback && (
        <div className="rounded-lg border border-[#f0d9c1] bg-[#fff3dd] px-4 py-3 text-sm font-semibold text-[#8d5c10]">
          {feedback}
        </div>
      )}

      {isLoading ? (
        <div className="rounded-lg border border-[#d9e5c1] bg-white/85 p-6 text-sm font-semibold text-[#566857]">
          A carregar subscrição...
        </div>
      ) : (
        <section className="overflow-hidden rounded-lg border border-[#d9e5c1] bg-white/85">
          <div className="flex items-center gap-3 border-b border-[#d9e5c1] p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[rgba(198,240,92,0.34)]">
              <Wallet className="h-5 w-5 text-[#24410b]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#183223]">Subscrição</h2>
              <p className="text-sm text-[#566857]">
                {data?.configured
                  ? 'Dados da assinatura ativa da escola.'
                  : 'Sem assinatura ativa associada.'}
              </p>
            </div>
          </div>

          {data?.configured && subscription ? (
            <div className="grid border-b border-[#d9e5c1] md:grid-cols-3">
              <InfoCell
                label="Plano"
                value={subscription.productName ?? 'Subscrição mensal'}
              />
              <InfoCell
                label="Estado"
                value={statusLabels[subscription.status] ?? subscription.status}
              />
              <InfoCell
                label="Valor"
                value={
                  subscription.amount != null && subscription.currency
                    ? `${formatMoney(subscription.amount, subscription.currency)}${interval}`
                    : '—'
                }
              />
              <InfoCell
                label="Próxima renovação"
                value={formatDate(subscription.currentPeriodEnd)}
              />
            </div>
          ) : (
            <div className="flex items-center gap-2 border-b border-[#d9e5c1] px-5 py-4 text-sm font-semibold text-[#566857]">
              <AlertCircle className="h-4 w-4" />
              A faturação ainda não está configurada para esta escola.
            </div>
          )}

          <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-[#566857]">
              {isAdmin
                ? 'Gerir método de pagamento, faturas e cancelamento no portal seguro do Stripe.'
                : 'Apenas administradores podem gerir a faturação.'}
            </p>
            {isAdmin && (
              <button
                type="button"
                onClick={() => {
                  setFeedback(null);
                  portalMutation.mutate();
                }}
                disabled={portalMutation.isPending || !data?.configured}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#183223] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#24410b] disabled:opacity-50"
              >
                {portalMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CreditCard className="h-4 w-4" />
                )}
                Gerir faturação
                <ExternalLink className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 border-b border-[#d9e5c1] px-4 py-3 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7a8b79]">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-semibold text-[#183223]" title={value}>
        {value}
      </p>
    </div>
  );
}
