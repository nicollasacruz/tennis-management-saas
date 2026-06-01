'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  CheckCircle2,
  Link2Off,
  Loader2,
  QrCode,
  RefreshCw,
  Send,
  Smartphone,
} from 'lucide-react';
import {
  changeWhatsappPhone,
  connectWhatsappInstance,
  getWhatsappConfig,
  sendWhatsappTest,
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

  const [feedback, setFeedback] = useState<string | null>(null);
  const [testNumber, setTestNumber] = useState('');
  const [qrCodeBase64, setQrCodeBase64] = useState<string | null>(null);
  const [qrCodeText, setQrCodeText] = useState<string | null>(null);

  const connectMutation = useMutation({
    mutationFn: connectWhatsappInstance,
    onSuccess: (result) => {
      setQrCodeBase64(result.qrCodeBase64);
      setQrCodeText(result.qrCodeText);
      queryClient.setQueryData(['whatsapp-config'], result.config);
      queryClient.invalidateQueries({ queryKey: ['whatsapp-config'] });
      setFeedback(
        result.qrCodeBase64 || result.qrCodeText
          ? 'QR code gerado. Leia-o no WhatsApp para concluir a ligação.'
          : 'Instância criada/atualizada. A Evolution ainda não devolveu QR code; tente atualizar dentro de alguns segundos.',
      );
    },
    onError: (error: unknown) => {
      setFeedback(
        error instanceof Error ? error.message : 'Não foi possível criar o QR code.',
      );
    },
  });

  const changePhoneMutation = useMutation({
    mutationFn: changeWhatsappPhone,
    onSuccess: (result) => {
      setQrCodeBase64(result.qrCodeBase64);
      setQrCodeText(result.qrCodeText);
      queryClient.setQueryData(['whatsapp-config'], result.config);
      queryClient.invalidateQueries({ queryKey: ['whatsapp-config'] });
      setFeedback(
        result.qrCodeBase64 || result.qrCodeText
          ? 'Sessão anterior desligada. Leia o novo QR code no telemóvel que pretende ligar.'
          : 'Sessão anterior desligada. A Evolution ainda não devolveu QR code; tente atualizar dentro de alguns segundos.',
      );
    },
    onError: (error: unknown) => {
      setFeedback(
        error instanceof Error ? error.message : 'Não foi possível trocar o número.',
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
  const qrActionPending = connectMutation.isPending || changePhoneMutation.isPending;

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
          Apenas administradores podem criar ou atualizar a ligação.
        </div>
      )}

      {isLoading ? (
        <div className="rounded-lg border border-[#d9e5c1] bg-white/85 p-6 text-sm font-semibold text-[#566857]">
          A carregar configuração...
        </div>
      ) : (
        <section className="overflow-hidden rounded-lg border border-[#d9e5c1] bg-white/85">
          <div className="grid min-h-[520px] lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="flex min-w-0 flex-col border-b border-[#d9e5c1] lg:border-b-0 lg:border-r">
              <div className="flex flex-col gap-3 border-b border-[#d9e5c1] p-5 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-[#183223]">Instância Evolution</h2>
                  <p className="mt-1 text-sm text-[#566857]">
                    Servidor partilhado; cada organização mantém a sua própria instância.
                  </p>
                </div>
                {config?.configured ? (
                  <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-[#edf7d5] px-3 py-1 text-xs font-bold text-[#31501a]">
                    <CheckCircle2 className="h-4 w-4" /> Configurada
                  </span>
                ) : (
                  <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-[#fcebe7] px-3 py-1 text-xs font-bold text-[#914a39]">
                    <AlertCircle className="h-4 w-4" /> Por configurar
                  </span>
                )}
              </div>

              <div className="grid border-b border-[#d9e5c1] md:grid-cols-2 xl:grid-cols-4">
                <InfoCell label="Telefone" value={config?.phoneNumber ?? 'Será identificado após a ligação'} />
              </div>

              <div className="grid flex-1 gap-0 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div className="flex min-h-[300px] items-center justify-center p-5">
                  {qrCodeBase64 ? (
                    <img
                      src={qrCodeBase64}
                      alt="QR code de ligação WhatsApp"
                      className="h-64 w-64 rounded-lg border border-[#d9e5c1] bg-white p-3"
                    />
                  ) : (
                    <div className="flex max-w-md flex-col items-center gap-3 text-center text-sm font-semibold text-[#566857]">
                      <QrCode className="h-12 w-12 text-[#7a8b79]" />
                      <span>
                        {connectMutation.isPending
                          ? 'A pedir QR code à Evolution API...'
                          : qrCodeText
                            ? 'QR code recebido em formato texto.'
                            : 'Ainda não há QR code ativo.'}
                      </span>
                      {qrCodeText && (
                        <code className="max-w-full break-all rounded bg-[#f8fbf2] px-2 py-1 text-xs text-[#183223]">
                          {qrCodeText}
                        </code>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex flex-col justify-between border-t border-[#d9e5c1] bg-[#f8fbf2] p-5 lg:border-l lg:border-t-0">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-[#566857]">
                      Ligação por QR code
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-[#566857]">
                      Cria ou reutiliza a instância desta organização na Evolution API. As credenciais ficam guardadas pela aplicação.
                    </p>
                    <div className="mt-4 rounded-lg border border-[#d9e5c1] bg-white px-3 py-3 text-sm text-[#183223]">
                      <p className="font-bold">Como ligar pelo telemóvel</p>
                      <ol className="mt-2 list-decimal space-y-1 pl-4 text-[#566857]">
                        <li>Abra o WhatsApp no telemóvel que vai enviar as mensagens.</li>
                        <li>Entre em Definições ou Menu e escolha Dispositivos ligados.</li>
                        <li>Toque em Ligar dispositivo e leia o QR code desta página.</li>
                      </ol>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-col gap-3">
                    {isAdmin && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setFeedback(null);
                            setQrCodeBase64(null);
                            setQrCodeText(null);
                            connectMutation.mutate();
                          }}
                          disabled={qrActionPending}
                          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#183223] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#24410b] disabled:opacity-50"
                        >
                          {connectMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : config?.configured ? (
                            <RefreshCw className="h-4 w-4" />
                          ) : (
                            <QrCode className="h-4 w-4" />
                          )}
                          {config?.configured ? 'Atualizar QR code' : 'Criar QR code'}
                        </button>
                        {config?.configured && (
                          <button
                            type="button"
                            onClick={() => {
                              const confirmed = window.confirm(
                                'Vai desligar o telefone atual desta instância. Depois terá de ler um novo QR code para ligar outro telemóvel. Continuar?',
                              );

                              if (!confirmed) return;

                              setFeedback(null);
                              setQrCodeBase64(null);
                              setQrCodeText(null);
                              changePhoneMutation.mutate();
                            }}
                            disabled={qrActionPending}
                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#d9e5c1] px-4 py-2 text-sm font-semibold text-[#183223] transition-colors hover:border-[#bdd383] hover:bg-white disabled:opacity-50"
                          >
                            {changePhoneMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Link2Off className="h-4 w-4" />
                            )}
                            Trocar número
                          </button>
                        )}
                      </>
                    )}
                    <p className="text-xs font-semibold text-[#7a8b79]">
                      Última atualização: {formatDateTime(config?.updatedAt ?? null)}.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <aside className="flex flex-col p-5">
              <h2 className="text-lg font-bold text-[#183223]">Enviar teste</h2>
              <p className="mt-1 text-sm text-[#566857]">
                Envia um documento de teste pela instância configurada.
              </p>

              <div className="mt-5 flex flex-col gap-3">
                <input
                  value={testNumber}
                  onChange={(event) => setTestNumber(event.target.value)}
                  placeholder="ex.: +351910000001"
                  className={inputClass}
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
                <p className="mt-3 text-xs font-semibold text-[#914a39]">
                  Configure a instância antes de enviar testes.
                </p>
              )}
              {!isAdmin && (
                <p className="mt-3 text-xs font-semibold text-[#8d5c10]">
                  Apenas administradores podem criar ou atualizar o QR code.
                </p>
              )}
            </aside>
          </div>
        </section>
      )}
    </div>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 border-b border-[#d9e5c1] px-4 py-3 last:border-b-0 md:border-r md:last:border-r-0 xl:border-b-0">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7a8b79]">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-[#183223]" title={value}>
        {value}
      </p>
    </div>
  );
}
