'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import { Student, Attendance, StudentAgeCategory, AttendanceType } from '@/types';
import { formatDate, getCurrentMonthValue, monthFormatter } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Check, Dumbbell } from 'lucide-react';
import { AttendanceModal } from '@/components/attendance-modal';

const tabs: Array<{ id: StudentAgeCategory | 'UNASSIGNED'; label: string }> = [
  { id: 'SUB-10', label: 'SUB-10' },
  { id: 'SUB-12', label: 'SUB-12' },
  { id: 'SUB-14', label: 'SUB-14' },
  { id: 'SUB-16', label: 'SUB-16' },
  { id: 'SUB-18', label: 'SUB-18' },
  { id: 'SENIOR', label: 'Senior' },
  { id: 'UNASSIGNED', label: 'Por definir' },
];

const WEEKDAY_NARROW = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

export default function PresencasPage() {
  const queryClient = useQueryClient();
  const [month, setMonth] = useState(getCurrentMonthValue());
  const [activeTab, setActiveTab] = useState<StudentAgeCategory | 'UNASSIGNED'>('SUB-10');
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [modalProps, setModalProps] = useState<{
    studentId: string;
    studentName: string;
    date: string;
    existingTypes: AttendanceType[];
  } | null>(null);

  const { data: students = [] } = useQuery<Student[]>({
    queryKey: ['students'],
    queryFn: () => apiRequest('/students'),
  });

  const { data: attendances = [], isLoading } = useQuery<Attendance[]>({
    queryKey: ['attendances', month],
    queryFn: () => apiRequest(`/attendances?month=${month}`),
  });

  const toggleMutation = useMutation({
    mutationFn: ({
      studentId,
      date,
      existingId,
    }: {
      studentId: string;
      date: string;
      existingId?: string;
    }): Promise<Attendance | { id: string }> => {
      if (existingId) {
        return apiRequest<{ id: string }>(`/attendances/${existingId}`, {
          method: 'DELETE',
        }).then(() => ({ id: existingId }));
      }
      return apiRequest<Attendance>('/attendances', {
        method: 'POST',
        body: JSON.stringify({ studentId, attendanceDate: date, type: 'TENNIS' }),
      });
    },
    onMutate: ({ studentId, date }) => {
      setBusyKey(`attendance-${studentId}-${date}`);
    },
    onSuccess: (result, variables) => {
      queryClient.setQueryData<Attendance[]>(['attendances', month], (current = []) => {
        if (variables.existingId) {
          return current.filter((a) => a.id !== variables.existingId);
        }
        const created = result as Attendance;
        if (current.some((a) => a.id === created.id)) return current;
        return [...current, created];
      });
    },
    onSettled: () => {
      setBusyKey(null);
    },
  });

  const tabStudents = useMemo(() => {
    const filtered = students
      .filter((s) => s.isActive)
      .filter((s) =>
        activeTab === 'UNASSIGNED' ? !s.ageCategory : s.ageCategory === activeTab,
      );
    return filtered.sort((a, b) => a.fullName.localeCompare(b.fullName, 'pt'));
  }, [students, activeTab]);

  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const tab of tabs) {
      counts[tab.id] = students.filter((s) =>
        tab.id === 'UNASSIGNED'
          ? s.isActive && !s.ageCategory
          : s.isActive && s.ageCategory === tab.id,
      ).length;
    }
    return counts;
  }, [students]);

  const monthDays = useMemo(() => {
    const [year, mon] = month.split('-').map(Number);
    const total = new Date(year, mon, 0).getDate();
    const days: {
      day: number;
      weekday: string;
      value: string;
      isSunday: boolean;
      isToday: boolean;
    }[] = [];
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    for (let d = 1; d <= total; d++) {
      const date = new Date(year, mon - 1, d);
      const value = `${month}-${String(d).padStart(2, '0')}`;
      days.push({
        day: d,
        weekday: WEEKDAY_NARROW[date.getDay()],
        value,
        isSunday: date.getDay() === 0,
        isToday: value === todayKey,
      });
    }
    return days;
  }, [month]);

  const monthLabel = useMemo(() => {
    const [year, mon] = month.split('-').map(Number);
    return monthFormatter.format(new Date(year, mon - 1, 1));
  }, [month]);

  const attendanceMap = useMemo(() => {
    const map = new Map<string, AttendanceType[]>();
    for (const a of attendances) {
      const dateKey = a.attendanceDate.slice(0, 10);
      const key = `${a.studentId}:${dateKey}`;
      const existing = map.get(key) ?? [];
      existing.push(a.type);
      map.set(key, existing);
    }
    return map;
  }, [attendances]);

  function shiftMonth(delta: number) {
    const [y, m] = month.split('-').map(Number);
    const next = new Date(y, m - 1 + delta, 1);
    setMonth(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`);
  }

  function jumpToCurrentMonth() {
    setMonth(getCurrentMonthValue());
  }

  async function handleModalConfirm(types: AttendanceType[]) {
    if (!modalProps) return;
    setBusyKey(`attendance-${modalProps.studentId}-${modalProps.date}`);
    try {
      await apiRequest('/attendances/batch', {
        method: 'PUT',
        body: JSON.stringify({
          studentId: modalProps.studentId,
          attendanceDate: modalProps.date,
          types,
        }),
      });
      queryClient.invalidateQueries({ queryKey: ['attendances', month] });
    } finally {
      setBusyKey(null);
      setModalProps(null);
    }
  }

  function handleToggle(studentId: string, dateStr: string, isSunday: boolean) {
    if (isSunday) return;

    const student = students.find((s) => s.id === studentId);

    if (student?.doesPhysicalTraining) {
      setModalProps({
        studentId,
        studentName: student.fullName,
        date: dateStr,
        existingTypes: attendanceMap.get(`${studentId}:${dateStr}`) ?? [],
      });
      return;
    }

    const existingTypes = attendanceMap.get(`${studentId}:${dateStr}`);
    if (existingTypes && existingTypes.length > 0) {
      // Aluno sem treino físico com presença — remove
      const existingAttendance = attendances.find(
        (a) => a.studentId === studentId && a.attendanceDate.slice(0, 10) === dateStr,
      );
      if (!existingAttendance) return;
      if (
        !window.confirm(
          `Remover a presença de "${student?.fullName ?? 'aluno'}" em ${formatDate(dateStr)}?`,
        )
      ) {
        return;
      }
      toggleMutation.mutate({ studentId, date: dateStr, existingId: existingAttendance.id });
      return;
    }

    toggleMutation.mutate({ studentId, date: dateStr });
  }

  const totalActiveStudents = students.filter((s) => s.isActive).length;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-2">
          <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
            <span className="h-px w-6 bg-[var(--accent-strong)]" />
            Presenças
          </span>
          <h1 className="text-[28px] font-extrabold leading-[1.1] tracking-[-0.02em] text-[var(--ink)] md:text-[32px]">
            {monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}
          </h1>
          <p className="max-w-[64ch] text-[14px] leading-[1.55] text-[var(--muted)]">
            Matriz mensal para marcar presença por aluno e por dia, organizada por escalão.
            Domingos bloqueados.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={jumpToCurrentMonth}
            className="rounded-lg border border-[var(--border)] bg-[var(--cream)] px-3 py-2 text-[12px] font-semibold text-[var(--ink)] transition-colors hover:border-[var(--ink)]"
          >
            Mês atual
          </button>
          <div className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--cream)] p-1">
            <button
              type="button"
              aria-label="Mês anterior"
              onClick={() => shiftMonth(-1)}
              className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--muted)] transition-colors hover:bg-[var(--accent-soft)] hover:text-[var(--ink)]"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <input
              aria-label="Selecionar mês das presenças"
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="h-8 rounded-md bg-transparent px-2 text-[13px] font-semibold text-[var(--ink)] outline-none focus:ring-2 focus:ring-[var(--accent)]"
            />
            <button
              type="button"
              aria-label="Próximo mês"
              onClick={() => shiftMonth(1)}
              className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--muted)] transition-colors hover:bg-[var(--accent-soft)] hover:text-[var(--ink)]"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Escalão ativo" value={tabs.find((t) => t.id === activeTab)?.label ?? '—'} accent />
        <StatCard label="Jogadores no escalão" value={tabStudents.length} />
        <StatCard label="Presenças no mês" value={attendances.length} />
        <StatCard label="Total ativos" value={totalActiveStudents} />
      </section>

      <div
        role="tablist"
        aria-label="Selecionar escalão"
        className="flex flex-wrap items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--cream)] p-1.5"
      >
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          const count = tabCounts[tab.id] ?? 0;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={active}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`group inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-[13px] font-semibold transition-colors ${
                active
                  ? 'bg-[var(--ink)] text-white'
                  : 'text-[var(--muted)] hover:bg-[var(--accent-soft)] hover:text-[var(--ink)]'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`rounded-md px-1.5 font-mono text-[11px] ${
                  active
                    ? 'bg-white/15 text-white'
                    : 'bg-[var(--accent-soft)] text-[var(--accent-strong)] group-hover:bg-white'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--cream)]">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 p-12 text-[14px] text-[var(--muted)]">
            <span className="inline-block h-3 w-3 animate-pulse rounded-full bg-[var(--accent)]" />
            A carregar presenças…
          </div>
        ) : tabStudents.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-12 text-center">
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">
              Vazio
            </span>
            <p className="text-[14px] text-[var(--muted)]">
              Nenhum aluno ativo encontrado para o escalão selecionado.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto overscroll-x-contain">
            <table className="min-w-max w-full border-separate border-spacing-0 text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--paper)]">
                  <th
                    scope="col"
                    className="sticky left-0 z-30 min-w-[160px] border-r border-[var(--border)] bg-[var(--paper)] px-3 py-3 text-left font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)] shadow-[8px_0_12px_-12px_rgba(15,31,21,0.55)] md:min-w-[240px] md:px-5"
                  >
                    Jogador
                  </th>
                  {monthDays.map((d) => (
                    <th
                      key={d.value}
                      scope="col"
                      className={`min-w-[40px] border-l border-[var(--border-soft)] px-1 py-2 text-center ${
                        d.isSunday ? 'opacity-40' : ''
                      }`}
                    >
                      <div className="flex flex-col items-center gap-0.5">
                        <span
                          className={`font-mono text-[10px] uppercase ${
                            d.isSunday ? 'text-[var(--muted)]' : 'text-[var(--muted)]'
                          }`}
                        >
                          {d.weekday}
                        </span>
                        <span
                          className={`text-[12px] font-semibold tabular-nums ${
                            d.isToday
                              ? 'rounded-md bg-[var(--accent)] px-1.5 text-[var(--ink)]'
                              : 'text-[var(--ink)]'
                          }`}
                        >
                          {d.day}
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tabStudents.map((student, idx) => {
                  const monthlyCount = monthDays.reduce(
                    (sum, d) => {
                      const types = attendanceMap.get(`${student.id}:${d.value}`);
                      return sum + (types && types.length > 0 ? 1 : 0);
                    },
                    0,
                  );
                  const subtitle = student.licenseNumber
                    ? `Licença ${student.licenseNumber}`
                    : student.currentPlan?.name ?? 'Sem plano';
                  const initials = student.fullName
                    .split(/\s+/)
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((p) => p[0]?.toUpperCase() ?? '')
                    .join('');

                  return (
                    <tr
                      key={student.id}
                      className={`group border-b border-[var(--border)] last:border-b-0 transition-colors hover:bg-[var(--accent-soft)]/30 ${
                        idx % 2 === 1 ? 'bg-[var(--paper)]/40' : ''
                      }`}
                    >
                      <th
                        scope="row"
                        className={`sticky left-0 z-20 min-w-[160px] border-r border-[var(--border)] px-3 py-3 text-left shadow-[8px_0_12px_-12px_rgba(15,31,21,0.45)] transition-colors md:min-w-[240px] md:px-5 ${
                          idx % 2 === 1
                            ? 'bg-[#f1f5e6] group-hover:bg-[#edf8d5]'
                            : 'bg-[var(--cream)] group-hover:bg-[#f4fbdf]'
                        }`}
                      >
                        <div className="flex items-center gap-2 md:gap-3">
                          <span className="hidden h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--accent-soft)] font-mono text-[10px] font-semibold text-[var(--accent-strong)] md:flex md:h-9 md:w-9 md:text-[11px]">
                            {initials}
                          </span>
                          <div className="flex min-w-0 flex-col gap-0.5 max-w-[180px] md:max-w-[500px]">
                            <strong className="text-[12px] font-semibold leading-tight break-words text-[var(--ink)] md:text-[14px]">
                              {student.fullName}
                            </strong>
                            <span className="truncate text-[11px] text-[var(--muted)] md:text-[12px]">{subtitle}</span>
                          </div>
                          <span className="ml-auto hidden items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--cream)] px-2 py-0.5 font-mono text-[11px] font-semibold text-[var(--accent-strong)] md:inline-flex">
                            {monthlyCount}
                            <span className="text-[var(--muted)]">/{monthDays.filter((d) => !d.isSunday).length}</span>
                          </span>
                        </div>
                      </th>
                      {monthDays.map((d) => {
                        const types = attendanceMap.get(`${student.id}:${d.value}`);
                        const hasAttendance = types && types.length > 0;
                        const onlyPhysical = types && types.length === 1 && types[0] === 'PHYSICAL';
                        const bothTypes = types && types.length === 2;
                        const cellKey = `attendance-${student.id}-${d.value}`;
                        const isBusy = busyKey === cellKey;
                        const ariaLabel = d.isSunday
                          ? `Domingo bloqueado em ${formatDate(d.value)}`
                          : hasAttendance
                            ? `Remover presença de ${student.fullName} em ${formatDate(d.value)}`
                            : `Marcar presença de ${student.fullName} em ${formatDate(d.value)}`;

                        return (
                          <td
                            key={d.value}
                            className="border-l border-[var(--border-soft)] px-0.5 py-1 text-center md:px-1 md:py-1.5"
                          >
                            <button
                              type="button"
                              disabled={d.isSunday || isBusy}
                              onClick={() => handleToggle(student.id, d.value, d.isSunday)}
                              aria-label={ariaLabel}
                              aria-pressed={hasAttendance}
                              className={`inline-flex h-7 w-7 items-center justify-center rounded-md text-[11px] font-bold transition-all duration-150 md:h-8 md:w-8 ${
                                d.isSunday
                                  ? 'cursor-not-allowed bg-[repeating-linear-gradient(45deg,transparent,transparent_3px,var(--border)_3px,var(--border)_4px)] text-transparent'
                                  : hasAttendance
                                    ? bothTypes
                                      ? 'bg-[linear-gradient(135deg,var(--accent)_50%,#3b82f6_50%)] text-[var(--ink)] shadow-sm shadow-[var(--accent)]/10 hover:scale-110 hover:bg-[linear-gradient(135deg,var(--accent-strong)_50%,#2563eb_50%)] hover:text-white'
                                      : onlyPhysical
                                        ? 'bg-[#3b82f6]/70 text-white shadow-sm hover:scale-110 hover:bg-[#3b82f6]'
                                        : 'bg-[var(--accent)] text-[var(--ink)] shadow-sm shadow-[var(--accent)]/20 hover:scale-110 hover:bg-[var(--accent-strong)] hover:text-white'
                                    : 'border border-dashed border-[var(--border)] bg-transparent text-transparent hover:border-solid hover:border-[var(--accent-strong)] hover:bg-[var(--accent-soft)]'
                              } ${isBusy ? 'animate-pulse opacity-60' : ''}`}
                            >
                              {d.isSunday ? '' : isBusy ? '…' : hasAttendance ? onlyPhysical ? <Dumbbell className="h-3.5 w-3.5" strokeWidth={2.5} /> : <Check className="h-3.5 w-3.5" strokeWidth={3} /> : ''}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {tabStudents.length > 0 ? (
          <div className="flex flex-wrap items-center gap-4 border-t border-[var(--border)] bg-[var(--paper)] px-5 py-3">
            <Legend swatchClass="bg-[var(--accent)]" label="Ténis" />
            <Legend swatchClass="bg-[linear-gradient(135deg,var(--accent)_50%,#3b82f6_50%)]" label="Ténis + Físico" />
            <Legend swatchClass="bg-[#3b82f6]/70" label="Físico" />
            <Legend swatchClass="border border-dashed border-[var(--border)] bg-transparent" label="Por marcar" />
            <Legend
              swatchClass="bg-[repeating-linear-gradient(45deg,transparent,transparent_2px,var(--border)_2px,var(--border)_3px)]"
              label="Domingo (bloqueado)"
            />
            <span className="ml-auto font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]">
              {monthDays.filter((d) => !d.isSunday).length} dias úteis
            </span>
          </div>
        ) : null}
      </div>

      {modalProps && (
        <AttendanceModal
          studentName={modalProps.studentName}
          date={modalProps.date}
          existingTypes={modalProps.existingTypes}
          onConfirm={handleModalConfirm}
          onCancel={() => setModalProps(null)}
        />
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
}) {
  return (
    <div
      className={`flex flex-col gap-1 rounded-xl border p-4 ${
        accent
          ? 'border-[var(--accent-strong)]/30 bg-[var(--accent-soft)]'
          : 'border-[var(--border)] bg-[var(--cream)]'
      }`}
    >
      <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
        {label}
      </span>
      <span className="text-[22px] font-extrabold tracking-[-0.02em] text-[var(--ink)]">
        {value}
      </span>
    </div>
  );
}

function Legend({ swatchClass, label }: { swatchClass: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-[12px] text-[var(--muted)]">
      <span className={`inline-block h-4 w-4 rounded ${swatchClass}`} />
      {label}
    </span>
  );
}
