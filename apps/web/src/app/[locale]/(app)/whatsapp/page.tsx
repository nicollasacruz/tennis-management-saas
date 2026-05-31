'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Send,
  Smartphone,
} from 'lucide-react';
import {
  getWhatsappConfig,
  sendWhatsappTest,
  updateWhatsappConfig,
} from '@/lib/api';
import { useAuth } from '@/components/auth-provider';
import { WhatsappConfig, WhatsappConnectionStatus } from '@/types';

const statusLabels: Record<WhatsappConnectionStatus, string> = {
  DISCONNECTED: 'Desconectado',
  CONNECTING: 'A ligar',
  CONNECTED: 'Conectado',
};

const statusStyles: Record<WhatsappConnectionStatus, string> = {
  DISCONNECTED: 'bg-[#fcebe7] text-[#914a39]',
  CONNECTING: 'bg-[#fff3dd] text-[#8d5c10]',
  CONNECTED: 'bg-[#edf7d5] text-[#31501a]',
};

function formatDateTime(value: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('pt-PT', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

const inputClass =
  'w-full rounded-lg border border-[#d9e5c1] bg-white px-3 py-2 text-sm text-[#183223] outline-none transition-colors focus:border-[#bdd383] disabled:bg-[#f4f7ed] disabled:text-[#9aa795]';

export default function WhatsappPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const { data: config, isLoading } = useQuery<WhatsappConfig>({
    queryKey: ['whatsapp-config'],
    queryFn: getWhatsappConfig,
  });

  const [instanceName, setInstanceName] = useState('');
  const [instanceId, setInstanceId] = useState('');
  const [instanceToken, setInstanceToken] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [testNumber, setTestNumber] = useState('');

  useEffect(() => {
    if (config) {
      setInstanceName(config.instanceName ?? '');
      setInstanceId(config.instanceId ?? '');
      setPhoneNumber(config.phoneNumber ?? '');
    }
  }, [config]);

  const saveMutation = useMutation({
    mutationFn: () =>
      updateWhatsappConfig({
        instanceName,
        instanceId,
        phoneNumber,
        ...(instanceToken.trim() ? { instanceToken: instanceToken.trim() } : {}),
      }),
    onSuccess: () => {
      setInstanceToken('');
      setFeedback('Configuração guardada.');
      queryClient.invalidateQueries({ queryKey: ['whatsapp-config'] });
    },
    onError: (error: unknown) => {
      setFeedback(
        error instanceof Error ? error.message : 'Não foi possível guardar.',
      );
    },
  });

  const testMutation = useMutation({
    mutationFn: () => sendWhatsappTest(testNumber.trim()),
    onSuccess: (result) => {
      setFeedback(`Teste colocado na fila para ${result.number}.`);
    },
    onError: (error: unknown) => {
      setFeedback(
        error instanceof Error ? error.message : 'Não foi possível enviar o teste.',
      );
    },
  });

  const status = config?.status ?? 'DISCONNECTED';

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#566857]">
          Operação
        </p>
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-[#183223]">WhatsApp</h1>
            <p className="mt-1 text-sm text-[#566857]">
              Configure a instância Evolution desta organização para envio de recibos por WhatsApp.
            </p>
          </div>
          <span
            className={`inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${statusStyles[status]}`}
          >
            <Smartphone className="h-3.5 w-3.5" />
            {statusLabels[status]}
          </span>
        </div>
      </div>

      {feedback && (
        <div className="rounded-lg border border-[#d9e5c1] bg-white/85 px-4 py-3 text-sm font-semibold text-[#31501a]">
          {feedback}
        </div>
      )}

      {!isAdmin && (
        <div className="flex items-center gap-2 rounded-lg border border-[#f0d9c1] bg-[#fff3dd] px-4 py-3 text-sm font-semibold text-[#8d5c10]">
          <AlertCircle className="h-4 w-4" />
          Apenas administradores podem alterar a configuração.
        </div>
      )}

      {isLoading ? (
        <div className="rounded-lg border border-[#d9e5c1] bg-white/85 p-6 text-sm font-semibold text-[#566857]">
          A carregar configuração...
        </div>
      ) : (
        <>
          <div className="rounded-lg border border-[#d9e5c1] bg-white/85 p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-[#183223]">Instância Evolution</h2>
              {config?.configured ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#31501a]">
                  <CheckCircle2 className="h-4 w-4" /> Configurada
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#914a39]">
                  <AlertCircle className="h-4 w-4" /> Por configurar
                </span>
              )}
            </div>

            <form
              className="grid gap-4 md:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault();
                setFeedback(null);
                saveMutation.mutate();
              }}
            >
              <label className="flex flex-col gap-1.5 text-sm font-semibold text-[#183223]">
                Nome da instância
                <input
                  value={instanceName}
                  onChange={(event) => setInstanceName(event.target.value)}
                  disabled={!isAdmin}
                  placeholder="ex.: esaf"
                  className={inputClass}
                />
              </label>

              <label className="flex flex-col gap-1.5 text-sm font-semibold text-[#183223]">
                Telefone
                <input
                  value={phoneNumber}
                  onChange={(event) => setPhoneNumber(event.target.value)}
                  disabled={!isAdmin}
                  placeholder="ex.: +351910000000"
                  className={inputClass}
                />
              </label>

              <label className="flex flex-col gap-1.5 text-sm font-semibold text-[#183223]">
                Instance ID
                <input
                  value={instanceId}
                  onChange={(event) => setInstanceId(event.target.value)}
                  disabled={!isAdmin}
                  placeholder="ID da instância na Evolution"
                  className={inputClass}
                />
              </label>

              <label className="flex flex-col gap-1.5 text-sm font-semibold text-[#183223]">
                Instance Token
                <input
                  type="password"
                  value={instanceToken}
                  onChange={(event) => setInstanceToken(event.target.value)}
                  disabled={!isAdmin}
                  placeholder={
                    config?.hasToken
                      ? '•••••••• (deixe vazio para manter)'
                      : 'Token da instância'
                  }
                  className={inputClass}
                />
              </label>

              {isAdmin && (
                <div className="md:col-span-2">
                  <button
                    type="submit"
                    disabled={saveMutation.isPending}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#183223] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#24410b] disabled:opacity-50"
                  >
                    {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                    Guardar configuração
                  </button>
                </div>
              )}
            </form>

            <p className="mt-4 text-xs text-[#7a8b79]">
              Servidor Evolution partilhado; cada organização usa a sua própria instância.
              Última atualização: {formatDateTime(config?.updatedAt ?? null)}.
            </p>
          </div>

          <div className="rounded-lg border border-[#d9e5c1] bg-white/85 p-5">
            <h2 className="mb-1 text-lg font-bold text-[#183223]">Enviar teste</h2>
            <p className="mb-4 text-sm text-[#566857]">
              Envia um documento de teste pela instância configurada.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <input
                value={testNumber}
                onChange={(event) => setTestNumber(event.target.value)}
                placeholder="ex.: 910000001 ou +351910000001"
                className={`${inputClass} sm:max-w-xs`}
              />
              <button
                type="button"
                onClick={() => {
                  setFeedback(null);
                  testMutation.mutate();
                }}
                disabled={testMutation.isPending || !testNumber.trim() || !config?.configured}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#d9e5c1] px-4 py-2 text-sm font-semibold text-[#183223] transition-colors hover:border-[#bdd383] hover:bg-[rgba(198,240,92,0.2)] disabled:opacity-50"
              >
                {testMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Enviar teste
              </button>
            </div>
            {!config?.configured && (
              <p className="mt-3 text-xs text-[#914a39]">
                Configure a instância antes de enviar testes.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
