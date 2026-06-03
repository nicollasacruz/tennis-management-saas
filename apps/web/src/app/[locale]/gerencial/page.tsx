'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Building2,
  CheckCircle2,
  PauseCircle,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { getPlatformMetrics } from '@/lib/platform-api';
import type { PlatformMetrics } from '@/types';

function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

export default function GerencialDashboardPage() {
  const { data, isLoading, error } = useQuery<PlatformMetrics>({
    queryKey: ['platform-metrics'],
    queryFn: getPlatformMetrics,
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold text-white">Visão geral</h1>
        <p className="mt-1 text-sm text-white/50">
          Estado das escolas e receita recorrente da plataforma.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-[rgba(244,128,108,0.3)] bg-[rgba(244,128,108,0.12)] px-4 py-3 text-sm font-semibold text-[#f4886c]">
          {error instanceof Error ? error.message : 'Erro ao carregar métricas.'}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          label="Escolas ativas"
          value={isLoading ? '—' : String((data?.active ?? 0) + (data?.trialing ?? 0))}
          icon={CheckCircle2}
          accent
        />
        <MetricCard
          label="Suspensas"
          value={isLoading ? '—' : String(data?.suspended ?? 0)}
          icon={PauseCircle}
        />
        <MetricCard
          label="Total de escolas"
          value={isLoading ? '—' : String(data?.total ?? 0)}
          icon={Building2}
        />
        <MetricCard
          label="Novas este mês"
          value={isLoading ? '—' : String(data?.newThisMonth ?? 0)}
          icon={Sparkles}
        />
        <MetricCard
          label="MRR (receita mensal)"
          value={
            isLoading
              ? '—'
              : data?.mrr
                ? formatMoney(data.mrr.amount, data.mrr.currency)
                : 'Indisponível'
          }
          icon={TrendingUp}
          accent
        />
        <MetricCard
          label="Arquivadas"
          value={isLoading ? '—' : String(data?.archived ?? 0)}
          icon={Building2}
        />
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#13251a] p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-white/50">{label}</p>
        <Icon
          className={`h-5 w-5 ${accent ? 'text-[#c6f05c]' : 'text-white/30'}`}
        />
      </div>
      <p className="mt-3 text-3xl font-extrabold text-white">{value}</p>
    </div>
  );
}
