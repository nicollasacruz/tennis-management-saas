'use client';

import React from 'react';
import { Link } from '@/i18n/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import { Plan } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { Plus, ClipboardList } from 'lucide-react';

export default function PlanosPage() {
  const { data: plans = [], isLoading } = useQuery<Plan[]>({
    queryKey: ['plans'],
    queryFn: () => apiRequest('/plans'),
  });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex flex-col gap-1.5">
          <h2 className="text-[clamp(1.25rem,2vw,1.5rem)] leading-tight m-0">Planos</h2>
          <p className="text-[#566857] m-0">{plans.length} planos registados</p>
        </div>
        <Link
          href="/planos/novo"
          className="flex items-center gap-2 px-4 py-2 bg-[#183223] text-white text-sm font-semibold rounded-lg hover:bg-[#24410b] transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo Plano
        </Link>
      </div>

      <div className="flex flex-col gap-3">
        {isLoading ? (
          <p className="text-[#566857]">A carregar planos...</p>
        ) : plans.length === 0 ? (
          <div className="p-8 text-center text-[#566857] border border-dashed border-[#d9e5c1] rounded-xl">
            Nenhum plano registado.
          </div>
        ) : (
          plans.map((plan) => (
            <div
              key={plan.id}
              className="flex items-center justify-between p-4 rounded-xl bg-white/60 border border-[#d9e5c1] hover:-translate-y-0.5 hover:border-[#bdd383] hover:shadow-sm transition-all"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-[rgba(198,240,92,0.3)] flex items-center justify-center flex-shrink-0">
                  <ClipboardList className="w-5 h-5 text-[#24410b]" />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="font-semibold text-[#183223]">{plan.name}</span>
                  <p className="text-sm text-[#566857] m-0">
                    {plan.sessionCount ? `${plan.sessionCount} sessões/semana` : 'Sem limite de sessões'}
                    {plan.description ? ` · ${plan.description}` : ''}
                  </p>
                </div>
              </div>
              <span className="font-mono font-semibold text-[#183223]">
                {formatCurrency(plan.monthlyFeeCents)}/mês
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
