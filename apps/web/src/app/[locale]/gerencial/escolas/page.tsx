'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ban, Loader2, Play, Archive } from 'lucide-react';
import {
  archiveTenant,
  listPlatformTenants,
  reactivateTenant,
  suspendTenant,
} from '@/lib/platform-api';
import type { PlatformTenant, TenantStatus } from '@/types';

const statusStyles: Record<TenantStatus, { label: string; className: string }> = {
  ACTIVE: { label: 'Ativa', className: 'bg-[rgba(198,240,92,0.18)] text-[#c6f05c]' },
  TRIALING: { label: 'Demonstração', className: 'bg-[rgba(96,165,250,0.18)] text-[#93c5fd]' },
  SUSPENDED: { label: 'Suspensa', className: 'bg-[rgba(251,191,36,0.18)] text-[#fbbf24]' },
  ARCHIVED: { label: 'Arquivada', className: 'bg-white/10 text-white/50' },
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('pt-PT', { dateStyle: 'medium' }).format(
    new Date(value),
  );
}

export default function GerencialEscolasPage() {
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState<string | null>(null);

  const { data: tenants, isLoading, error } = useQuery<PlatformTenant[]>({
    queryKey: ['platform-tenants'],
    queryFn: listPlatformTenants,
  });

  const mutation = useMutation({
    mutationFn: ({
      id,
      action,
    }: {
      id: string;
      action: 'suspend' | 'reactivate' | 'archive';
    }) => {
      if (action === 'suspend') return suspendTenant(id);
      if (action === 'reactivate') return reactivateTenant(id);
      return archiveTenant(id);
    },
    onSuccess: (updated) => {
      setFeedback(`Escola "${updated.name}" atualizada.`);
      queryClient.invalidateQueries({ queryKey: ['platform-tenants'] });
      queryClient.invalidateQueries({ queryKey: ['platform-metrics'] });
    },
    onError: (err: unknown) => {
      setFeedback(err instanceof Error ? err.message : 'Não foi possível atualizar.');
    },
  });

  function act(
    tenant: PlatformTenant,
    action: 'suspend' | 'reactivate' | 'archive',
  ) {
    const verbs = {
      suspend: 'bloquear (suspender)',
      reactivate: 'reativar',
      archive: 'arquivar permanentemente',
    };
    if (
      !window.confirm(
        `Tem a certeza que quer ${verbs[action]} a escola "${tenant.name}"?`,
      )
    ) {
      return;
    }
    setFeedback(null);
    mutation.mutate({ id: tenant.id, action });
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-extrabold text-white">Escolas</h1>
        <p className="mt-1 text-sm text-white/50">
          Bloquear suspende o acesso (login e dados) da escola; reativar repõe.
        </p>
      </div>

      {feedback && (
        <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white/80">
          {feedback}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-[rgba(244,128,108,0.3)] bg-[rgba(244,128,108,0.12)] px-4 py-3 text-sm font-semibold text-[#f4886c]">
          {error instanceof Error ? error.message : 'Erro ao carregar escolas.'}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#13251a]">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-white/40">
              <th className="px-4 py-3 font-bold">Escola</th>
              <th className="px-4 py-3 font-bold">Host</th>
              <th className="px-4 py-3 font-bold">Estado</th>
              <th className="px-4 py-3 font-bold">Criada</th>
              <th className="px-4 py-3 font-bold">Subscrição</th>
              <th className="px-4 py-3 text-right font-bold">Ações</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-white/50">
                  A carregar escolas...
                </td>
              </tr>
            ) : tenants && tenants.length > 0 ? (
              tenants.map((tenant) => {
                const status = statusStyles[tenant.status];
                const isPending =
                  mutation.isPending && mutation.variables?.id === tenant.id;
                return (
                  <tr
                    key={tenant.id}
                    className="border-b border-white/[0.06] last:border-b-0"
                  >
                    <td className="px-4 py-3">
                      <p className="font-bold text-white">{tenant.name}</p>
                      <p className="text-xs text-white/40">{tenant.slug}</p>
                    </td>
                    <td className="px-4 py-3 text-white/70">{tenant.primaryHost}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${status.className}`}
                      >
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white/60">
                      {formatDate(tenant.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-white/60">
                      {tenant.stripeSubscriptionId ? 'Stripe' : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {isPending && (
                          <Loader2 className="h-4 w-4 animate-spin text-white/50" />
                        )}
                        {tenant.status === 'SUSPENDED' ? (
                          <button
                            type="button"
                            onClick={() => act(tenant, 'reactivate')}
                            disabled={mutation.isPending}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-[rgba(198,240,92,0.18)] px-3 py-1.5 text-xs font-bold text-[#c6f05c] transition-colors hover:bg-[rgba(198,240,92,0.28)] disabled:opacity-50"
                          >
                            <Play className="h-3.5 w-3.5" />
                            Reativar
                          </button>
                        ) : tenant.status === 'ARCHIVED' ? (
                          <button
                            type="button"
                            onClick={() => act(tenant, 'reactivate')}
                            disabled={mutation.isPending}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-bold text-white/70 transition-colors hover:bg-white/15 disabled:opacity-50"
                          >
                            <Play className="h-3.5 w-3.5" />
                            Reativar
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => act(tenant, 'suspend')}
                              disabled={mutation.isPending}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-[rgba(251,191,36,0.16)] px-3 py-1.5 text-xs font-bold text-[#fbbf24] transition-colors hover:bg-[rgba(251,191,36,0.26)] disabled:opacity-50"
                            >
                              <Ban className="h-3.5 w-3.5" />
                              Bloquear
                            </button>
                            <button
                              type="button"
                              onClick={() => act(tenant, 'archive')}
                              disabled={mutation.isPending}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-bold text-white/50 transition-colors hover:bg-white/5 disabled:opacity-50"
                            >
                              <Archive className="h-3.5 w-3.5" />
                              Arquivar
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-white/50">
                  Ainda não há escolas registadas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
