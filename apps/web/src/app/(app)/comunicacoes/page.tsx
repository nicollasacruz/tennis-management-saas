'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Mail,
  MessageCircle,
  RefreshCcw,
  Search,
} from 'lucide-react';
import { listCommunicationJobs, retryCommunicationJob } from '@/lib/api';
import { CommunicationChannel, CommunicationJob, CommunicationStatus } from '@/types';
import { formatDate } from '@/lib/utils';

const statusLabels: Record<CommunicationStatus, string> = {
  PENDING: 'Pendente',
  PROCESSING: 'Em processamento',
  SENT: 'Enviado',
  FAILED: 'Falhou',
};

const statusStyles: Record<CommunicationStatus, string> = {
  PENDING: 'bg-[#fff3dd] text-[#8d5c10]',
  PROCESSING: 'bg-[#e8f0ff] text-[#31588a]',
  SENT: 'bg-[#edf7d5] text-[#31501a]',
  FAILED: 'bg-[#fcebe7] text-[#914a39]',
};

const channelLabels: Record<CommunicationChannel, string> = {
  email: 'Email',
  whatsapp: 'WhatsApp',
};

function channelIcon(channel: CommunicationChannel) {
  return channel === 'email'
    ? <Mail className="h-4 w-4" />
    : <MessageCircle className="h-4 w-4" />;
}

function statusIcon(status: CommunicationStatus) {
  if (status === 'SENT') return <CheckCircle2 className="h-4 w-4" />;
  if (status === 'FAILED') return <AlertCircle className="h-4 w-4" />;
  return <Clock className="h-4 w-4" />;
}

function formatDateTime(value: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('pt-PT', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

export default function ComunicacoesPage() {
  const queryClient = useQueryClient();
  const [channelFilter, setChannelFilter] = useState<'ALL' | CommunicationChannel>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | CommunicationStatus>('ALL');
  const [search, setSearch] = useState('');

  const { data: jobs = [], isLoading } = useQuery<CommunicationJob[]>({
    queryKey: ['communications', channelFilter, statusFilter],
    queryFn: () =>
      listCommunicationJobs({
        channel: channelFilter,
        status: statusFilter,
      }),
  });

  const retryMutation = useMutation({
    mutationFn: ({ channel, id }: { channel: CommunicationChannel; id: string }) =>
      retryCommunicationJob(channel, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communications'] });
    },
  });

  const filteredJobs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return jobs;

    return jobs.filter((job) =>
      [
        channelLabels[job.channel],
        statusLabels[job.status],
        job.recipient,
        job.referenceType ?? '',
        job.referenceId ?? '',
        job.lastError ?? '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [jobs, search]);

  const totals = jobs.reduce(
    (acc, job) => {
      acc[job.status] += 1;
      return acc;
    },
    { PENDING: 0, PROCESSING: 0, SENT: 0, FAILED: 0 } as Record<CommunicationStatus, number>,
  );

  function handleRetry(job: CommunicationJob) {
    retryMutation.mutate(
      { channel: job.channel, id: job.id },
      {
        onError: (error: unknown) => {
          const message = error instanceof Error ? error.message : 'Não foi possível repetir o envio.';
          window.alert(message);
        },
      },
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#566857]">
          Operação
        </p>
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-[#183223]">Comunicações</h1>
            <p className="mt-1 text-sm text-[#566857]">
              Acompanhe emails e WhatsApp de recibos, falhas e reenvios.
            </p>
          </div>
          <button
            type="button"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['communications'] })}
            className="flex items-center gap-2 rounded-lg border border-[#d9e5c1] px-4 py-2 text-sm font-semibold text-[#183223] transition-colors hover:border-[#bdd383] hover:bg-[rgba(198,240,92,0.2)]"
          >
            <RefreshCcw className="h-4 w-4" />
            Atualizar
          </button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        {Object.entries(totals).map(([status, total]) => (
          <div key={status} className="rounded-lg border border-[#d9e5c1] bg-white/85 p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-[#566857]">
                {statusLabels[status as CommunicationStatus]}
              </span>
              <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusStyles[status as CommunicationStatus]}`}>
                {total}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-[#d9e5c1] bg-white/85 p-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7a8b79]" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Pesquisar por destinatário, referência ou erro..."
            className="w-full rounded-lg border border-[#d9e5c1] bg-white py-2 pl-9 pr-3 text-sm text-[#183223] outline-none transition-colors focus:border-[#bdd383]"
          />
        </div>
        <select
          value={channelFilter}
          onChange={(event) => setChannelFilter(event.target.value as 'ALL' | CommunicationChannel)}
          className="rounded-lg border border-[#d9e5c1] bg-white px-3 py-2 text-sm font-semibold text-[#183223] outline-none focus:border-[#bdd383]"
        >
          <option value="ALL">Todos os canais</option>
          <option value="email">Email</option>
          <option value="whatsapp">WhatsApp</option>
        </select>
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as 'ALL' | CommunicationStatus)}
          className="rounded-lg border border-[#d9e5c1] bg-white px-3 py-2 text-sm font-semibold text-[#183223] outline-none focus:border-[#bdd383]"
        >
          <option value="ALL">Todos os estados</option>
          <option value="PENDING">Pendente</option>
          <option value="PROCESSING">Em processamento</option>
          <option value="SENT">Enviado</option>
          <option value="FAILED">Falhou</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-lg border border-[#d9e5c1] bg-white/85">
        {isLoading ? (
          <div className="p-6 text-sm font-semibold text-[#566857]">A carregar comunicações...</div>
        ) : filteredJobs.length === 0 ? (
          <div className="p-6 text-sm font-semibold text-[#566857]">Sem comunicações para apresentar.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-[#d9e5c1] bg-[#f8faef] text-xs uppercase tracking-[0.12em] text-[#566857]">
                <tr>
                  <th className="px-4 py-3">Canal</th>
                  <th className="px-4 py-3">Destinatário</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Tentativas</th>
                  <th className="px-4 py-3">Criado</th>
                  <th className="px-4 py-3">Último evento</th>
                  <th className="px-4 py-3">Erro</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf3df]">
                {filteredJobs.map((job) => {
                  const isRetrying =
                    retryMutation.isPending &&
                    retryMutation.variables?.id === job.id &&
                    retryMutation.variables?.channel === job.channel;

                  return (
                    <tr key={`${job.channel}-${job.id}`} className="align-top">
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-2 font-semibold text-[#183223]">
                          {channelIcon(job.channel)}
                          {channelLabels[job.channel]}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-[#183223]">{job.recipient || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${statusStyles[job.status]}`}>
                          {statusIcon(job.status)}
                          {statusLabels[job.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#566857]">
                        {job.attempts}/{job.maxAttempts}
                      </td>
                      <td className="px-4 py-3 text-[#566857]">{formatDate(job.createdAt)}</td>
                      <td className="px-4 py-3 text-[#566857]">
                        {formatDateTime(job.sentAt ?? job.failedAt ?? job.processingStartedAt ?? job.scheduledAt)}
                      </td>
                      <td className="max-w-[360px] px-4 py-3 text-[#914a39]">
                        {job.lastError ? (
                          <span className="line-clamp-3">{job.lastError}</span>
                        ) : (
                          <span className="text-[#9aa795]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {job.status === 'FAILED' ? (
                          <button
                            type="button"
                            onClick={() => handleRetry(job)}
                            disabled={isRetrying}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-[#d9e5c1] px-3 py-2 text-xs font-bold text-[#183223] transition-colors hover:border-[#bdd383] hover:bg-[rgba(198,240,92,0.2)] disabled:opacity-50"
                          >
                            <RefreshCcw className="h-3.5 w-3.5" />
                            {isRetrying ? 'A repetir...' : 'Repetir'}
                          </button>
                        ) : (
                          <span className="text-xs text-[#9aa795]">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
