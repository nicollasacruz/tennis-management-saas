'use client';

import React, { useState, FormEvent, useEffect } from 'react';
import { Link } from '@/i18n/navigation';
import { useParams } from 'next/navigation';
import { useRouter } from '@/i18n/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import { Plan, Student, Payment, PaymentMethod, PaymentStatus } from '@/types';
import { getCurrentMonthValue, parseEuroToCents, centsToEuroInput } from '@/lib/utils';
import { ArrowLeft, Save } from 'lucide-react';

export default function EditarPagamentoPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const queryClient = useQueryClient();

  const { data: payment, isLoading } = useQuery<Payment>({
    queryKey: ['payment', id],
    queryFn: () => apiRequest(`/payments/${id}`),
    enabled: !!id,
  });

  const { data: students = [] } = useQuery<Student[]>({
    queryKey: ['students'],
    queryFn: () => apiRequest('/students'),
  });

  const { data: plans = [] } = useQuery<Plan[]>({
    queryKey: ['plans'],
    queryFn: () => apiRequest('/plans'),
  });

  const [studentId, setStudentId] = useState('');
  const [planId, setPlanId] = useState('');
  const [amount, setAmount] = useState('');
  const [competencyMonth, setCompetencyMonth] = useState(getCurrentMonthValue());
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState<PaymentStatus>('PENDING');
  const [method, setMethod] = useState<PaymentMethod>('BANK_TRANSFER');

  useEffect(() => {
    if (payment) {
      setStudentId(payment.studentId);
      setPlanId(payment.planId ?? '');
      setAmount(centsToEuroInput(payment.amountCents));
      setCompetencyMonth(payment.competencyMonth.slice(0, 7));
      setDueDate(payment.dueDate.slice(0, 10));
      setStatus(payment.status);
      setMethod(payment.method ?? 'BANK_TRANSFER');
    }
  }, [payment]);

  const updateMutation = useMutation({
    mutationFn: () =>
      apiRequest(`/payments/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          studentId,
          planId: planId || null,
          amountCents: parseEuroToCents(amount),
          competencyMonth: `${competencyMonth}-01`,
          dueDate,
          status,
          method: status === 'PAID' ? method : undefined,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['payment', id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      router.push('/pagamentos');
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    updateMutation.mutate();
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="text-[#566857] font-semibold">A carregar pagamento...</span>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-5">
      <div className="flex items-center gap-3">
        <Link
          href="/pagamentos"
          className="flex items-center gap-1 text-sm font-semibold text-[#566857] hover:text-[#183223] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Link>
      </div>

      <div className="flex flex-col gap-4 p-5 rounded-2xl bg-[rgba(252,253,247,0.98)] border border-[#d9e5c1]">
        <div className="flex flex-col gap-1.5">
          <h2 className="text-[clamp(1.25rem,2vw,1.5rem)] leading-tight m-0">Editar Pagamento</h2>
          <p className="text-[#566857] m-0">{payment?.student.fullName}</p>
        </div>

        {updateMutation.isError && (
          <div className="px-4 py-3 bg-[#fcebe7] border border-[rgba(160,74,55,0.2)] rounded-lg text-[#914a39] text-sm font-semibold">
            {updateMutation.error instanceof Error ? updateMutation.error.message : 'Erro ao atualizar pagamento'}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-[#183223]">Aluno *</label>
            <select
              required
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="w-full px-3 py-2 border border-[#d9e5c1] rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#c6f05c] focus:border-[#97ce2a]"
            >
              <option value="">Selecionar aluno...</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.fullName}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold text-[#183223]">Plano</label>
              <select
                value={planId}
                onChange={(e) => setPlanId(e.target.value)}
                className="w-full px-3 py-2 border border-[#d9e5c1] rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#c6f05c] focus:border-[#97ce2a]"
              >
                <option value="">Sem plano</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold text-[#183223]">Valor (€) *</label>
              <input
                required
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 border border-[#d9e5c1] rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#c6f05c] focus:border-[#97ce2a]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold text-[#183223]">Mês de competência *</label>
              <input
                required
                type="month"
                value={competencyMonth}
                onChange={(e) => setCompetencyMonth(e.target.value)}
                className="w-full px-3 py-2 border border-[#d9e5c1] rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#c6f05c] focus:border-[#97ce2a]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold text-[#183223]">Data de vencimento *</label>
              <input
                required
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-[#d9e5c1] rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#c6f05c] focus:border-[#97ce2a]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold text-[#183223]">Estado *</label>
              <select
                required
                value={status}
                onChange={(e) => setStatus(e.target.value as PaymentStatus)}
                className="w-full px-3 py-2 border border-[#d9e5c1] rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#c6f05c] focus:border-[#97ce2a]"
              >
                <option value="PENDING">Pendente</option>
                <option value="PAID">Pago</option>
                <option value="OVERDUE">Em atraso</option>
              </select>
            </div>
            {status === 'PAID' && (
              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold text-[#183223]">Método *</label>
                <select
                  required
                  value={method}
                  onChange={(e) => setMethod(e.target.value as PaymentMethod)}
                  className="w-full px-3 py-2 border border-[#d9e5c1] rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#c6f05c] focus:border-[#97ce2a]"
                >
                  <option value="MBWAY">MBWAY</option>
                  <option value="CASH">Dinheiro</option>
                  <option value="BANK_TRANSFER">Transferência</option>
                  <option value="CARD">Cartão</option>
                </select>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Link
              href="/pagamentos"
              className="px-4 py-2 border border-[#d9e5c1] rounded-lg text-sm font-semibold text-[#566857] hover:bg-black/[0.03] transition-colors"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-[#183223] text-white text-sm font-semibold rounded-lg hover:bg-[#24410b] transition-colors disabled:opacity-60"
            >
              <Save className="w-4 h-4" />
              {updateMutation.isPending ? 'A guardar...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
