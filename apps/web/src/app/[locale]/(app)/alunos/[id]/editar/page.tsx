'use client';

import React, { useState, FormEvent, useEffect } from 'react';
import { Link } from '@/i18n/navigation';
import { useParams } from 'next/navigation';
import { useRouter } from '@/i18n/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import { Plan, Student, StudentSex } from '@/types';
import { DEFAULT_DDI, joinPhone, splitPhone } from '@/lib/phone';
import { ArrowLeft, Save } from 'lucide-react';

export default function EditarAlunoPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const queryClient = useQueryClient();

  const { data: student, error, isError, isLoading } = useQuery<Student>({
    queryKey: ['student', id],
    queryFn: () => apiRequest(`/students/${id}`),
    enabled: !!id,
  });

  const { data: plans = [] } = useQuery<Plan[]>({
    queryKey: ['plans'],
    queryFn: () => apiRequest('/plans'),
  });

  const [form, setForm] = useState({
    fullName: '',
    birthDate: '',
    sex: '' as StudentSex | '',
    phoneDdi: DEFAULT_DDI,
    phoneNumber: '',
    email: '',
    taxId: '',
    licenseNumber: '',
    isMinor: false,
    responsibleName: '',
    responsiblePhoneDdi: DEFAULT_DDI,
    responsiblePhoneNumber: '',
    responsibleTaxId: '',
    currentPlanId: '',
    enrollmentStartDate: '',
    enrollmentEndDate: '',
    doesPhysicalTraining: false,
    isActive: true,
    notes: '',
    firstMonthBillingPolicy: 'PRORATA' as 'PRORATA' | 'FULL_WITH_MAKEUP',
  });

  useEffect(() => {
    if (student) {
      const phone = splitPhone(student.phone);
      const responsiblePhone = splitPhone(student.responsiblePhone);

      setForm({
        fullName: student.fullName,
        birthDate: toDateInputValue(student.birthDate),
        sex: student.sex ?? '',
        phoneDdi: phone.ddi,
        phoneNumber: phone.number,
        email: student.email ?? '',
        taxId: student.taxId ?? '',
        licenseNumber: student.licenseNumber ?? '',
        isMinor: student.isMinor,
        responsibleName: student.responsibleName ?? '',
        responsiblePhoneDdi: responsiblePhone.ddi,
        responsiblePhoneNumber: responsiblePhone.number,
        responsibleTaxId: student.responsibleTaxId ?? '',
        currentPlanId: student.currentPlanId ?? '',
        enrollmentStartDate: toDateInputValue(student.enrollmentStartDate),
        enrollmentEndDate: toDateInputValue(student.enrollmentEndDate),
        doesPhysicalTraining: student.doesPhysicalTraining,
        isActive: student.isActive,
        notes: student.notes ?? '',
        firstMonthBillingPolicy: student.firstMonthBillingPolicy,
      });
    }
  }, [student]);

  const updateMutation = useMutation({
    mutationFn: (body: unknown) => apiRequest(`/students/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['student', id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      router.push('/alunos');
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const phone = joinPhone(form.phoneDdi, form.phoneNumber);
    const responsiblePhone = joinPhone(
      form.responsiblePhoneDdi,
      form.responsiblePhoneNumber,
    );

    updateMutation.mutate({
      fullName: form.fullName,
      birthDate: form.birthDate || null,
      sex: form.sex || null,
      phone,
      email: form.email || undefined,
      taxId: form.taxId || undefined,
      licenseNumber: form.licenseNumber || null,
      isMinor: form.isMinor,
      responsibleName: form.responsibleName || undefined,
      responsiblePhone: responsiblePhone || undefined,
      responsibleTaxId: form.responsibleTaxId || undefined,
      currentPlanId: form.currentPlanId,
      enrollmentStartDate: form.currentPlanId && form.enrollmentStartDate ? form.enrollmentStartDate : undefined,
      enrollmentEndDate: form.enrollmentEndDate || undefined,
      doesPhysicalTraining: form.doesPhysicalTraining,
      isActive: form.isActive,
      notes: form.notes || undefined,
      firstMonthBillingPolicy: form.firstMonthBillingPolicy,
    });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="text-[#566857] font-semibold">A carregar aluno...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex w-full flex-col gap-4">
        <Link
          href="/alunos"
          className="flex items-center gap-1 text-sm font-semibold text-[#566857] hover:text-[#183223] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Link>
        <div className="px-4 py-3 bg-[#fcebe7] border border-[rgba(160,74,55,0.2)] rounded-lg text-[#914a39] text-sm font-semibold">
          {error instanceof Error ? error.message : 'Não foi possível carregar o aluno.'}
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-5">
      <div className="flex items-center gap-3">
        <Link
          href="/alunos"
          className="flex items-center gap-1 text-sm font-semibold text-[#566857] hover:text-[#183223] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Link>
      </div>

      <div className="flex flex-col gap-4 p-5 rounded-2xl bg-[rgba(252,253,247,0.98)] border border-[#d9e5c1]">
        <div className="flex flex-col gap-1.5">
          <h2 className="text-[clamp(1.25rem,2vw,1.5rem)] leading-tight m-0">Editar Aluno</h2>
          <p className="text-[#566857] m-0">{student?.fullName}</p>
        </div>

        {updateMutation.isError && (
          <div className="px-4 py-3 bg-[#fcebe7] border border-[rgba(160,74,55,0.2)] rounded-lg text-[#914a39] text-sm font-semibold">
            {updateMutation.error instanceof Error ? updateMutation.error.message : 'Erro ao atualizar aluno'}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Nome completo *">
              <input
                required
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                className="w-full px-3 py-2 border border-[#d9e5c1] rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#c6f05c] focus:border-[#97ce2a]"
              />
            </Field>
            <Field label="Data de nascimento">
              <input
                type="date"
                value={form.birthDate}
                onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
                className="w-full px-3 py-2 border border-[#d9e5c1] rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#c6f05c] focus:border-[#97ce2a]"
              />
            </Field>
            <Field label="Sexo">
              <select
                value={form.sex}
                onChange={(e) => setForm({ ...form, sex: e.target.value as StudentSex })}
                className="w-full px-3 py-2 border border-[#d9e5c1] rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#c6f05c] focus:border-[#97ce2a]"
              >
                <option value="">Selecionar...</option>
                <option value="FEMALE">Feminino</option>
                <option value="MALE">Masculino</option>
                <option value="OTHER">Outro</option>
              </select>
            </Field>
            <PhoneField
              label="Telefone *"
              ddi={form.phoneDdi}
              number={form.phoneNumber}
              onDdiChange={(phoneDdi) => setForm({ ...form, phoneDdi })}
              onNumberChange={(phoneNumber) => setForm({ ...form, phoneNumber })}
              required
            />
            <Field label="Email">
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2 border border-[#d9e5c1] rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#c6f05c] focus:border-[#97ce2a]"
              />
            </Field>
            <Field label="NIF">
              <input
                value={form.taxId}
                maxLength={9}
                pattern="\d{9}"
                placeholder="9 dígitos"
                onChange={(e) => setForm({ ...form, taxId: e.target.value })}
                className="w-full px-3 py-2 border border-[#d9e5c1] rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#c6f05c] focus:border-[#97ce2a]"
              />
            </Field>
            <Field label="Nº Licença">
              <input
                value={form.licenseNumber}
                onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })}
                className="w-full px-3 py-2 border border-[#d9e5c1] rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#c6f05c] focus:border-[#97ce2a]"
              />
            </Field>
            <Field label="Plano">
              <select
                value={form.currentPlanId}
                onChange={(e) => setForm({ ...form, currentPlanId: e.target.value })}
                className="w-full px-3 py-2 border border-[#d9e5c1] rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#c6f05c] focus:border-[#97ce2a]"
              >
                <option value="">Sem plano</option>
                {plans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {form.currentPlanId && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Data de início">
                <input
                  type="date"
                  value={form.enrollmentStartDate}
                  onChange={(e) => setForm({ ...form, enrollmentStartDate: e.target.value })}
                  className="w-full px-3 py-2 border border-[#d9e5c1] rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#c6f05c] focus:border-[#97ce2a]"
                />
              </Field>
              <Field label="Data de fim">
                <input
                  type="date"
                  value={form.enrollmentEndDate}
                  onChange={(e) => setForm({ ...form, enrollmentEndDate: e.target.value })}
                  className="w-full px-3 py-2 border border-[#d9e5c1] rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#c6f05c] focus:border-[#97ce2a]"
                />
              </Field>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="flex items-center gap-3 p-3 border border-[#d9e5c1] rounded-lg bg-white cursor-pointer">
              <input
                type="checkbox"
                checked={form.isMinor}
                onChange={(e) => setForm({ ...form, isMinor: e.target.checked })}
                className="w-4 h-4 accent-[#97ce2a]"
              />
              <span className="text-sm font-semibold">Menor de idade</span>
            </label>
            <label className="flex items-center gap-3 p-3 border border-[#d9e5c1] rounded-lg bg-white cursor-pointer">
              <input
                type="checkbox"
                checked={form.doesPhysicalTraining}
                onChange={(e) => setForm({ ...form, doesPhysicalTraining: e.target.checked })}
                className="w-4 h-4 accent-[#97ce2a]"
              />
              <span className="text-sm font-semibold">Faz treino físico (+5€)</span>
            </label>
            <label className="flex items-center gap-3 p-3 border border-[#d9e5c1] rounded-lg bg-white cursor-pointer">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="w-4 h-4 accent-[#97ce2a]"
              />
              <span className="text-sm font-semibold">Ativo</span>
            </label>
          </div>

          {form.isMinor && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl bg-[rgba(255,243,221,0.3)] border border-[#fff3dd]">
              <Field label="Nome do responsável">
                <input
                  value={form.responsibleName}
                  onChange={(e) => setForm({ ...form, responsibleName: e.target.value })}
                  className="w-full px-3 py-2 border border-[#d9e5c1] rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#c6f05c] focus:border-[#97ce2a]"
                />
              </Field>
              <PhoneField
                label="Telefone do responsável"
                ddi={form.responsiblePhoneDdi}
                number={form.responsiblePhoneNumber}
                onDdiChange={(responsiblePhoneDdi) =>
                  setForm({ ...form, responsiblePhoneDdi })
                }
                onNumberChange={(responsiblePhoneNumber) =>
                  setForm({ ...form, responsiblePhoneNumber })
                }
              />
              <Field label="NIF do responsável">
                <input
                  value={form.responsibleTaxId}
                  maxLength={9}
                  pattern="\d{9}"
                  placeholder="9 dígitos"
                  onChange={(e) => setForm({ ...form, responsibleTaxId: e.target.value })}
                  className="w-full px-3 py-2 border border-[#d9e5c1] rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#c6f05c] focus:border-[#97ce2a]"
                />
              </Field>
            </div>
          )}

          <Field label="Notas">
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full px-3 py-2 border border-[#d9e5c1] rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#c6f05c] focus:border-[#97ce2a] resize-y"
            />
          </Field>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Link
              href="/alunos"
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-semibold text-[#183223]">{label}</label>
      {children}
    </div>
  );
}

function PhoneField({
  label,
  ddi,
  number,
  onDdiChange,
  onNumberChange,
  required = false,
}: {
  label: string;
  ddi: string;
  number: string;
  onDdiChange: (value: string) => void;
  onNumberChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-semibold text-[#183223]">{label}</label>
      <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-2">
        <input
          value={ddi}
          onChange={(e) => onDdiChange(e.target.value)}
          placeholder="+351"
          className="w-full px-3 py-2 border border-[#d9e5c1] rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#c6f05c] focus:border-[#97ce2a]"
        />
        <input
          required={required}
          value={number}
          onChange={(e) => onNumberChange(e.target.value)}
          inputMode="tel"
          placeholder="910000001"
          className="w-full px-3 py-2 border border-[#d9e5c1] rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#c6f05c] focus:border-[#97ce2a]"
        />
      </div>
    </div>
  );
}

function toDateInputValue(value: string | null) {
  return value ? value.slice(0, 10) : '';
}
