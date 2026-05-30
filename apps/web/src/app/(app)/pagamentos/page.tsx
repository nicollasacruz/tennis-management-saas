'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest, emailReceipt, openReceiptPdf } from '@/lib/api';
import { Payment, PaymentStatus } from '@/types';
import { formatCurrency, formatDate, getCurrentMonthValue } from '@/lib/utils';
import { Plus, Search, CreditCard, Trash2, Pencil, CheckCircle, Download, Mail, Zap } from 'lucide-react';

const statusLabels: Record<PaymentStatus, string> = {
  PENDING: 'Pendente',
  PAID: 'Pago',
  OVERDUE: 'Em atraso',
};

const statusStyles: Record<PaymentStatus, string> = {
  PENDING: 'bg-[#fff3dd] text-[#8d5c10]',
  PAID: 'bg-[#edf7d5] text-[#31501a]',
  OVERDUE: 'bg-[#fcebe7] text-[#914a39]',
};

export default function PagamentosPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | PaymentStatus>('ALL');
  const [monthFilter, setMonthFilter] = useState('');

  const { data: payments = [], isLoading } = useQuery<Payment[]>({
    queryKey: ['payments', statusFilter, monthFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (monthFilter) params.set('month', monthFilter);
      const qs = params.toString();
      return apiRequest(qs ? `/payments?${qs}` : '/payments');
    },
  });

  const settleMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/payments/${id}/settle`, { method: 'POST', body: JSON.stringify({}) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/payments/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const generateMutation = useMutation({
    mutationFn: () => apiRequest('/payments/generate-current-month', { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const emailMutation = useMutation({
    mutationFn: ({ id, email }: { id: string; email?: string }) => emailReceipt(id, email),
  });

  function handleEmailReceipt(payment: Payment) {
    const fallback = payment.student.email ?? '';
    const prompt = fallback
      ? `Enviar recibo para ${fallback}?\n\nDeixa em branco para confirmar ou escreve outro endereço:`
      : 'O aluno não tem email registado. Indica o destinatário:';
    const input = window.prompt(prompt, fallback);
    if (input === null) return;
    const email = input.trim() || undefined;
    if (!fallback && !email) {
      window.alert('Email obrigatório.');
      return;
    }
    emailMutation.mutate(
      { id: payment.id, email },
      {
        onSuccess: (result) => {
          window.alert(
            `Recibo colocado na fila de email para ${result.to}. A entrega será repetida automaticamente se falhar.`,
          );
        },
        onError: (error: unknown) => {
          const message = error instanceof Error ? error.message : 'Falha ao colocar recibo na fila.';
          window.alert(message);
        },
      },
    );
  }

  const filteredPayments = useMemo(() => {
    if (!search.trim()) return payments;
    const q = search.toLowerCase();
    return payments.filter(
      (p) =>
        p.student.fullName.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
    );
  }, [payments, search]);

  const pendingTotal = payments
    .filter((p) => p.status === 'PENDING' || p.status === 'OVERDUE')
    .reduce((sum, p) => sum + p.amountCents, 0);

  function handleSettle(payment: Payment) {
    if (!window.confirm(`Liquidar o pagamento de "${payment.student.fullName}" no valor de ${formatCurrency(payment.amountCents)}?`)) {
      return;
    }
    settleMutation.mutate(payment.id, {
      onSuccess: () => {
        void openReceiptPdf(payment.id);
      },
    });
  }

  function handleDelete(payment: Payment) {
    if (!window.confirm(`Apagar o pagamento de "${payment.student.fullName}" no valor de ${formatCurrency(payment.amountCents)}?`)) {
      return;
    }
    deleteMutation.mutate(payment.id);
  }

  function handleGenerate() {
    if (!window.confirm('Gerar cobranças para o mês atual?')) {
      return;
    }
    generateMutation.mutate();
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex flex-col gap-1.5">
          <h2 className="text-[clamp(1.25rem,2vw,1.5rem)] leading-tight m-0">Pagamentos</h2>
          <p className="text-[#566857] m-0">
            {payments.length} pagamentos · Pendente: {formatCurrency(pendingTotal)}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleGenerate}
            disabled={generateMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-[#c6f05c] text-[#24410b] text-sm font-semibold rounded-lg hover:bg-[#97ce2a] transition-colors disabled:opacity-60"
          >
            <Zap className="w-4 h-4" />
            {generateMutation.isPending ? 'A gerar...' : 'Gerar Mês Atual'}
          </button>
          <Link
            href="/pagamentos/novo"
            className="flex items-center gap-2 px-4 py-2 bg-[#183223] text-white text-sm font-semibold rounded-lg hover:bg-[#24410b] transition-colors"
          >
            <Plus className="w-4 h-4" />
            Novo Pagamento
          </Link>
        </div>
      </div>

      {generateMutation.isError && (
        <div className="px-4 py-3 bg-[#fcebe7] border border-[rgba(160,74,55,0.2)] rounded-lg text-[#914a39] text-sm font-semibold">
          {generateMutation.error instanceof Error ? generateMutation.error.message : 'Erro ao gerar cobranças'}
        </div>
      )}
      {generateMutation.isSuccess && (
        <div className="px-4 py-3 bg-[#edf7d5] border border-[rgba(110,170,44,0.2)] rounded-lg text-[#31501a] text-sm font-semibold">
          Cobranças geradas com sucesso.
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#566857]" />
          <input
            type="text"
            placeholder="Pesquisar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-[#d9e5c1] rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#c6f05c] focus:border-[#97ce2a]"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'ALL' | PaymentStatus)}
          className="px-3 py-2.5 border border-[#d9e5c1] rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#c6f05c] focus:border-[#97ce2a]"
        >
          <option value="ALL">Todos os estados</option>
          <option value="PENDING">Pendente</option>
          <option value="PAID">Pago</option>
          <option value="OVERDUE">Em atraso</option>
        </select>
        <input
          type="month"
          value={monthFilter}
          onChange={(e) => setMonthFilter(e.target.value)}
          className="px-3 py-2.5 border border-[#d9e5c1] rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#c6f05c] focus:border-[#97ce2a]"
        />
      </div>

      {/* List */}
      <div className="flex flex-col gap-3">
        {isLoading ? (
          <p className="text-[#566857]">A carregar pagamentos...</p>
        ) : filteredPayments.length === 0 ? (
          <div className="p-8 text-center text-[#566857] border border-dashed border-[#d9e5c1] rounded-xl">
            Nenhum pagamento encontrado.
          </div>
        ) : (
          filteredPayments.map((payment) => (
            <div
              key={payment.id}
              className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-white/60 border border-[#d9e5c1] hover:-translate-y-0.5 hover:border-[#bdd383] hover:shadow-sm transition-all"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-[rgba(198,240,92,0.3)] flex items-center justify-center flex-shrink-0">
                  <CreditCard className="w-5 h-5 text-[#24410b]" />
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-[#183223]">{payment.student.fullName}</span>
                    <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${statusStyles[payment.status]}`}>
                      {statusLabels[payment.status]}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-[#566857]">
                    <span>{payment.description}</span>
                    <span>Vencimento: {formatDate(payment.dueDate)}</span>
                    {payment.receipt && <span>Recibo: {payment.receipt.number}</span>}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono font-semibold text-[#183223]">
                  {formatCurrency(payment.amountCents)}
                </span>
                {payment.status !== 'PAID' && (
                  <button
                    onClick={() => handleSettle(payment)}
                    disabled={settleMutation.isPending && settleMutation.variables === payment.id}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-[#31501a] border border-[#d9e5c1] rounded-lg hover:bg-[#edf7d5] hover:border-[#97ce2a] transition-colors disabled:opacity-50"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    Liquidar
                  </button>
                )}
                {payment.status === 'PAID' && (
                  <>
                    <button
                      type="button"
                      onClick={() => { void openReceiptPdf(payment.id); }}
                      className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-[#183223] border border-[#d9e5c1] rounded-lg hover:bg-[rgba(198,240,92,0.2)] hover:border-[#bdd383] transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Recibo
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEmailReceipt(payment)}
                      disabled={emailMutation.isPending && emailMutation.variables?.id === payment.id}
                      className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-[#183223] border border-[#d9e5c1] rounded-lg hover:bg-[rgba(198,240,92,0.2)] hover:border-[#bdd383] transition-colors disabled:opacity-50"
                      title={payment.student.email ? `Enviar para ${payment.student.email}` : 'Enviar por email'}
                    >
                      <Mail className="w-3.5 h-3.5" />
                      {emailMutation.isPending && emailMutation.variables?.id === payment.id ? 'A agendar…' : 'Email'}
                    </button>
                  </>
                )}
                <Link
                  href={`/pagamentos/${payment.id}/editar`}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-[#183223] border border-[#d9e5c1] rounded-lg hover:bg-[rgba(198,240,92,0.2)] hover:border-[#bdd383] transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </Link>
                <button
                  onClick={() => handleDelete(payment)}
                  disabled={deleteMutation.isPending && deleteMutation.variables === payment.id}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-[#914a39] border border-[#d9e5c1] rounded-lg hover:bg-[#fcebe7] hover:border-[#914a39] transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
