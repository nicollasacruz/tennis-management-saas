'use client';

import React from 'react';
import { Link } from '@/i18n/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import type { Activity } from '@/types';
import { Plus, CalendarDays, Tag, Pencil, Trash2 } from 'lucide-react';

const MESES_ABREV = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
];

function formatarDataAtividade(a: Activity): string {
  const inicio = new Date(a.startDate);
  const diaInicio = inicio.getUTCDate();
  const mes = MESES_ABREV[inicio.getUTCMonth()];
  const ano = inicio.getUTCFullYear();

  if (a.endDate) {
    const fim = new Date(a.endDate);
    const diaFim = fim.getUTCDate();
    if (diaFim !== diaInicio) {
      return `${diaInicio}–${diaFim} de ${mes} de ${ano}`;
    }
    return `${diaInicio} de ${mes} de ${ano}`;
  }

  return `${mes} de ${ano}`;
}

export default function AtividadesPage() {
  const queryClient = useQueryClient();
  const { data: activities = [], isLoading } = useQuery<Activity[]>({
    queryKey: ['activities'],
    queryFn: () => apiRequest('/activities'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/activities/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
    },
  });

  function handleDelete(activity: Activity) {
    if (!window.confirm(`Remover a atividade "${activity.title}"?`)) return;
    deleteMutation.mutate(activity.id);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex flex-col gap-1.5">
          <h2 className="text-[clamp(1.25rem,2vw,1.5rem)] leading-tight m-0">Atividades</h2>
          <p className="text-[#566857] m-0">{activities.length} atividades registadas</p>
        </div>
        <Link
          href="/atividades/novo"
          className="flex items-center gap-2 px-4 py-2 bg-[#183223] text-white text-sm font-semibold rounded-lg hover:bg-[#24410b] transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nova Atividade
        </Link>
      </div>

      <div className="flex flex-col gap-3">
        {isLoading ? (
          <p className="text-[#566857]">A carregar atividades...</p>
        ) : activities.length === 0 ? (
          <div className="p-8 text-center text-[#566857] border border-dashed border-[#d9e5c1] rounded-xl">
            Nenhuma atividade registada.
          </div>
        ) : (
          activities.map((a) => (
            <div
              key={a.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-white/60 border border-[#d9e5c1] hover:-translate-y-0.5 hover:border-[#bdd383] hover:shadow-sm transition-all"
            >
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-lg bg-[rgba(198,240,92,0.3)] flex items-center justify-center flex-shrink-0">
                  <CalendarDays className="w-5 h-5 text-[#24410b]" />
                </div>
                <div className="flex flex-col gap-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-[#183223] truncate">{a.title}</span>
                    {!a.isPublished && (
                      <span className="text-[0.65rem] font-bold uppercase tracking-[0.12em] px-2 py-0.5 rounded-full bg-[#fef3c7] text-[#92400e] border border-[#fde68a]">
                        Rascunho
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-[#566857] m-0 flex items-center gap-2 flex-wrap">
                    <span className="flex items-center gap-1">
                      <CalendarDays className="w-3.5 h-3.5 flex-shrink-0" />
                      {formatarDataAtividade(a)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Tag className="w-3.5 h-3.5 flex-shrink-0" />
                      {a.category}
                    </span>
                  </p>
                  <p className="text-[13px] text-[#566857]/80 m-0 line-clamp-2 max-w-[60ch]">
                    {a.description}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Link
                  href={`/atividades/${a.id}/editar`}
                  className="flex items-center justify-center w-9 h-9 rounded-lg border border-[var(--border)] text-[var(--muted)] hover:text-[var(--ink)] hover:border-[var(--ink)] transition-colors"
                  aria-label={`Editar ${a.title}`}
                >
                  <Pencil className="w-4 h-4" />
                </Link>
                <button
                  type="button"
                  onClick={() => handleDelete(a)}
                  disabled={deleteMutation.isPending}
                  className="flex items-center justify-center w-9 h-9 rounded-lg border border-[var(--border)] text-[var(--muted)] hover:text-[#914a39] hover:border-[#914a39] transition-colors disabled:opacity-50"
                  aria-label={`Remover ${a.title}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
