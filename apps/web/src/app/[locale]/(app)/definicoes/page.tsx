'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Building2, CheckCircle2, Loader2, Save } from 'lucide-react';
import { getTenantSettings, updateTenantSettings } from '@/lib/api';
import { useAuth } from '@/components/auth-provider';
import type { TenantSettings } from '@/types';

const inputClass =
  'w-full rounded-lg border border-[#d9e5c1] bg-white px-3 py-2 text-sm text-[#183223] outline-none transition-colors focus:border-[#bdd383] disabled:bg-[#f4f7ed] disabled:text-[#7a8b79]';

const statusLabels: Record<TenantSettings['status'], string> = {
  ACTIVE: 'Ativa',
  TRIALING: 'Em demonstração',
  SUSPENDED: 'Suspensa',
  ARCHIVED: 'Arquivada',
};

function formatDateTime(value: string | null | undefined) {
  if (!value) return '—';

  return new Intl.DateTimeFormat('pt-PT', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

export default function DefinicoesPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [feedback, setFeedback] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    logoUrl: '',
    receiptIssuer: '',
    receiptSignatureLabel: '',
  });

  const { data: settings, isLoading } = useQuery<TenantSettings>({
    queryKey: ['tenant-settings'],
    queryFn: getTenantSettings,
  });

  useEffect(() => {
    if (!settings) return;

    setForm({
      name: settings.name,
      logoUrl: settings.logoUrl ?? '',
      receiptIssuer: settings.receiptIssuer ?? '',
      receiptSignatureLabel: settings.receiptSignatureLabel ?? '',
    });
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: () => updateTenantSettings(form),
    onSuccess: (result) => {
      setFeedback('Definições guardadas.');
      queryClient.setQueryData(['tenant-settings'], result);
      queryClient.invalidateQueries({ queryKey: ['tenant-settings'] });
    },
    onError: (error: unknown) => {
      setFeedback(
        error instanceof Error ? error.message : 'Não foi possível guardar as definições.',
      );
    },
  });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#566857]">
            Administração
          </p>
          <h1 className="mt-1 text-3xl font-extrabold text-[#183223]">Definições</h1>
          <p className="mt-1 text-sm text-[#566857]">
            Dados da organização usados no ambiente, recibos e comunicações.
          </p>
        </div>
        {settings && (
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-[#edf7d5] px-3 py-1 text-xs font-bold text-[#31501a]">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {statusLabels[settings.status]}
          </span>
        )}
      </div>

      {feedback && (
        <div className="rounded-lg border border-[#d9e5c1] bg-white/85 px-4 py-3 text-sm font-semibold text-[#31501a]">
          {feedback}
        </div>
      )}

      {!isAdmin && (
        <div className="flex items-center gap-2 rounded-lg border border-[#f0d9c1] bg-[#fff3dd] px-4 py-3 text-sm font-semibold text-[#8d5c10]">
          <AlertCircle className="h-4 w-4" />
          Apenas administradores podem alterar as definições.
        </div>
      )}

      {isLoading ? (
        <div className="rounded-lg border border-[#d9e5c1] bg-white/85 p-6 text-sm font-semibold text-[#566857]">
          A carregar definições...
        </div>
      ) : (
        <section className="overflow-hidden rounded-lg border border-[#d9e5c1] bg-white/85">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              setFeedback(null);
              saveMutation.mutate();
            }}
          >
            <div className="grid min-h-[520px] xl:grid-cols-[minmax(0,1fr)_360px]">
              <div className="flex min-w-0 flex-col border-b border-[#d9e5c1] xl:border-b-0 xl:border-r">
                <div className="flex items-center gap-3 border-b border-[#d9e5c1] p-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[rgba(198,240,92,0.34)]">
                    <Building2 className="h-5 w-5 text-[#24410b]" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-[#183223]">Organização</h2>
                    <p className="text-sm text-[#566857]">Campos configuráveis por tenant.</p>
                  </div>
                </div>

                <div className="grid border-b border-[#d9e5c1] md:grid-cols-3">
                  <InfoCell label="Slug" value={settings?.slug ?? '—'} />
                  <InfoCell label="Host" value={settings?.primaryHost ?? '—'} />
                  <InfoCell label="Última atualização" value={formatDateTime(settings?.updatedAt)} />
                </div>

                <div className="grid gap-5 p-5 md:grid-cols-2">
                  <label className="flex flex-col gap-1.5 text-sm font-semibold text-[#183223]">
                    Nome da organização
                    <input
                      value={form.name}
                      onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                      disabled={!isAdmin}
                      className={inputClass}
                      maxLength={120}
                      required
                    />
                  </label>

                  <label className="flex flex-col gap-1.5 text-sm font-semibold text-[#183223]">
                    URL do logótipo
                    <input
                      value={form.logoUrl}
                      onChange={(event) => setForm((prev) => ({ ...prev, logoUrl: event.target.value }))}
                      disabled={!isAdmin}
                      className={inputClass}
                      placeholder="https://..."
                      maxLength={500}
                    />
                  </label>

                  <label className="flex flex-col gap-1.5 text-sm font-semibold text-[#183223]">
                    Entidade emissora dos recibos
                    <input
                      value={form.receiptIssuer}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, receiptIssuer: event.target.value }))
                      }
                      disabled={!isAdmin}
                      className={inputClass}
                      placeholder="ex.: Clube de Ténis Demo"
                      maxLength={160}
                    />
                  </label>

                  <label className="flex flex-col gap-1.5 text-sm font-semibold text-[#183223]">
                    Assinatura dos recibos
                    <input
                      value={form.receiptSignatureLabel}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, receiptSignatureLabel: event.target.value }))
                      }
                      disabled={!isAdmin}
                      className={inputClass}
                      placeholder="ex.: Direção do clube"
                      maxLength={120}
                    />
                  </label>
                </div>

                {isAdmin && (
                  <div className="mt-auto flex justify-end border-t border-[#d9e5c1] bg-[#f8fbf2] p-4">
                    <button
                      type="submit"
                      disabled={saveMutation.isPending}
                      className="inline-flex items-center gap-2 rounded-lg bg-[#183223] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#24410b] disabled:opacity-50"
                    >
                      {saveMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      Guardar definições
                    </button>
                  </div>
                )}
              </div>

              <aside className="flex flex-col bg-[#f8fbf2] p-5">
                <h2 className="text-lg font-bold text-[#183223]">Pré-visualização</h2>
                <p className="mt-1 text-sm text-[#566857]">
                  Reflexo visual dos dados usados em recibos e comunicações.
                </p>

                <div className="mt-5 rounded-lg border border-[#e3edcf] bg-white p-4">
                  <div className="flex items-center gap-3">
                    {form.logoUrl ? (
                      <img
                        src={form.logoUrl}
                        alt="Logótipo da organização"
                        className="h-12 w-12 rounded-lg border border-[#d9e5c1] bg-white object-contain p-1"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[rgba(198,240,92,0.34)]">
                        <Building2 className="h-5 w-5 text-[#24410b]" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="truncate font-bold text-[#183223]">
                        {form.name || settings?.name}
                      </p>
                      <p className="truncate text-sm font-semibold text-[#566857]">
                        {form.receiptIssuer || 'Entidade emissora por definir'}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 border-t border-[#d9e5c1] pt-3 text-sm text-[#566857]">
                    Assinatura: {form.receiptSignatureLabel || 'Direção por definir'}
                  </div>
                </div>

                <div className="mt-auto pt-5 text-xs font-semibold leading-5 text-[#7a8b79]">
                  Slug e host são apenas leitura nesta fase porque alterá-los impacta
                  roteamento, DNS e emissão TLS.
                </div>
              </aside>
            </div>
          </form>
        </section>
      )}
    </div>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 border-b border-[#d9e5c1] px-4 py-3 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7a8b79]">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-[#183223]" title={value}>
        {value}
      </p>
    </div>
  );
}
