'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addEnrollment,
  createClassException,
  deleteClassException,
  getEnrollments,
  markClassAttendance,
  removeEnrollment,
} from '@/lib/api';
import type { ClassException, ClassSlot, Court, Student } from '@/types';
import { hhmmToMinutes, minutesToHHMM } from '@/lib/utils';
import { Ban, Check, Move, Pencil, UserMinus, X } from 'lucide-react';

const inputClass =
  'border border-[#d9e5c1] bg-white px-3 py-2 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c6f05c]';

type Props = {
  slot: ClassSlot;
  dateIso: string;
  courts: Court[];
  students: Student[];
  exception?: ClassException;
  onEditSlot: () => void;
  onClose: () => void;
  onChanged: () => void;
};

export function ClassOccurrenceModal({
  slot,
  dateIso,
  courts,
  students,
  exception,
  onEditSlot,
  onClose,
  onChanged,
}: Props) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [attendanceDone, setAttendanceDone] = useState(false);
  const [moving, setMoving] = useState(false);
  const [moveCourt, setMoveCourt] = useState(slot.courtId);
  const [moveStart, setMoveStart] = useState(minutesToHHMM(slot.startMin));
  const [moveEnd, setMoveEnd] = useState(minutesToHHMM(slot.endMin));

  useEffect(() => {
    const scrollY = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      window.scrollTo(0, scrollY);
    };
  }, []);

  const { data: enrollments = [] } = useQuery({
    queryKey: ['enrollments', slot.id],
    queryFn: () => getEnrollments(slot.id),
  });

  // Inicializa checkboxes de presença com todos os inscritos ativos.
  useEffect(() => {
    setChecked(new Set(enrollments.filter((e) => e.student.isActive).map((e) => e.studentId)));
  }, [enrollments]);

  const enrolledIds = useMemo(
    () => new Set(enrollments.map((e) => e.studentId)),
    [enrollments],
  );
  const availableStudents = students.filter((s) => s.isActive && !enrolledIds.has(s.id));

  function invalidateRoster() {
    queryClient.invalidateQueries({ queryKey: ['enrollments', slot.id] });
    onChanged();
  }

  const addMutation = useMutation({
    mutationFn: (studentId: string) => addEnrollment(slot.id, studentId),
    onSuccess: invalidateRoster,
    onError: (e: Error) => setError(e.message),
  });
  const removeMutation = useMutation({
    mutationFn: (studentId: string) => removeEnrollment(slot.id, studentId),
    onSuccess: invalidateRoster,
    onError: (e: Error) => setError(e.message),
  });
  const attendanceMutation = useMutation({
    mutationFn: () =>
      markClassAttendance(slot.id, { date: dateIso, studentIds: [...checked] }),
    onSuccess: () => setAttendanceDone(true),
    onError: (e: Error) => setError(e.message),
  });
  const exceptionMutation = useMutation({
    mutationFn: (payload: Parameters<typeof createClassException>[1]) =>
      createClassException(slot.id, payload),
    onSuccess: () => onChanged(),
    onError: (e: Error) => setError(e.message),
  });
  const undoExceptionMutation = useMutation({
    mutationFn: () => deleteClassException(exception!.id),
    onSuccess: () => onChanged(),
    onError: (e: Error) => setError(e.message),
  });

  function toggleCheck(studentId: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
    setAttendanceDone(false);
  }

  const dateLabel = new Date(dateIso).toLocaleDateString('pt-PT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <div className="fixed inset-0 z-[500] flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-t-2xl bg-[var(--paper)] p-6 shadow-2xl sm:mx-4 sm:rounded-2xl max-h-[90vh] overflow-y-auto">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-[17px] font-bold tracking-[-0.01em] text-[var(--ink)]">{slot.title}</h2>
            <p className="text-[13px] text-[var(--muted)]">
              {slot.court.name} · {minutesToHHMM(slot.startMin)}–{minutesToHHMM(slot.endMin)}
              {slot.coach ? ` · ${slot.coach.fullName}` : ''}
            </p>
            <p className="text-[13px] text-[var(--muted)] capitalize">{dateLabel}</p>
          </div>
          <button
            type="button"
            onClick={onEditSlot}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border)] text-[13px] font-semibold text-[var(--muted)] hover:text-[var(--ink)] hover:border-[var(--ink)] transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
            Editar
          </button>
        </div>

        {exception ? (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-[#fde68a] bg-[#fef3c7] px-3 py-2">
            <span className="text-[13px] font-semibold text-[#92400e]">
              {exception.type === 'CANCELLED'
                ? 'Ocorrência cancelada nesta data'
                : 'Ocorrência movida nesta data'}
            </span>
            <button
              type="button"
              onClick={() => undoExceptionMutation.mutate()}
              disabled={undoExceptionMutation.isPending}
              className="text-[13px] font-semibold text-[#24410b] underline disabled:opacity-50"
            >
              Repor
            </button>
          </div>
        ) : (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => exceptionMutation.mutate({ date: dateIso, type: 'CANCELLED' })}
              disabled={exceptionMutation.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border)] text-[13px] font-semibold text-[#914a39] hover:border-[#914a39] transition-colors disabled:opacity-50"
            >
              <Ban className="w-3.5 h-3.5" />
              Cancelar ocorrência
            </button>
            <button
              type="button"
              onClick={() => setMoving((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border)] text-[13px] font-semibold text-[var(--muted)] hover:text-[var(--ink)] hover:border-[var(--ink)] transition-colors"
            >
              <Move className="w-3.5 h-3.5" />
              Mover
            </button>
          </div>
        )}

        {moving && !exception && (
          <div className="mb-4 flex flex-col gap-3 rounded-xl border border-[#d9e5c1] bg-white/60 p-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-[#566857]">Novo court</label>
              <select value={moveCourt} onChange={(e) => setMoveCourt(e.target.value)} className={inputClass}>
                {courts.filter((c) => c.isActive).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-3">
              <div className="flex flex-col gap-1 flex-1">
                <label className="text-xs font-semibold text-[#566857]">Início</label>
                <input type="time" value={moveStart} onChange={(e) => setMoveStart(e.target.value)} className={inputClass} />
              </div>
              <div className="flex flex-col gap-1 flex-1">
                <label className="text-xs font-semibold text-[#566857]">Fim</label>
                <input type="time" value={moveEnd} onChange={(e) => setMoveEnd(e.target.value)} className={inputClass} />
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                exceptionMutation.mutate({
                  date: dateIso,
                  type: 'MOVED',
                  newCourtId: moveCourt !== slot.courtId ? moveCourt : undefined,
                  newStartMin: hhmmToMinutes(moveStart),
                  newEndMin: hhmmToMinutes(moveEnd),
                })
              }
              disabled={exceptionMutation.isPending || hhmmToMinutes(moveEnd) <= hhmmToMinutes(moveStart)}
              className="px-4 py-2 bg-[#183223] text-white text-sm font-semibold rounded-lg hover:bg-[#24410b] transition-colors disabled:opacity-50"
            >
              Confirmar mudança
            </button>
          </div>
        )}

        {/* Roster */}
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-[14px] font-bold text-[var(--ink)]">
            Inscritos {slot.capacity ? `(${enrollments.length}/${slot.capacity})` : `(${enrollments.length})`}
          </h3>
        </div>

        {availableStudents.length > 0 && (
          <select
            value=""
            onChange={(e) => e.target.value && addMutation.mutate(e.target.value)}
            disabled={addMutation.isPending}
            className={`${inputClass} mb-3 w-full`}
          >
            <option value="">+ Inscrever aluno…</option>
            {availableStudents.map((s) => (
              <option key={s.id} value={s.id}>{s.fullName}</option>
            ))}
          </select>
        )}

        <div className="flex flex-col gap-1.5 mb-5">
          {enrollments.length === 0 ? (
            <p className="text-[13px] text-[var(--muted)]">Nenhum aluno inscrito.</p>
          ) : (
            enrollments.map((e) => (
              <label
                key={e.id}
                className="flex items-center gap-3 rounded-lg border border-[#d9e5c1] bg-white/60 px-3 py-2"
              >
                <input
                  type="checkbox"
                  checked={checked.has(e.studentId)}
                  onChange={() => toggleCheck(e.studentId)}
                  disabled={!e.student.isActive}
                  className="h-4 w-4 rounded border-[var(--border)] accent-[#183223]"
                />
                <span className="flex-1 text-[14px] text-[var(--ink)]">
                  {e.student.fullName}
                  {!e.student.isActive && (
                    <span className="ml-2 text-[11px] text-[#914a39]">inativo</span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => removeMutation.mutate(e.studentId)}
                  disabled={removeMutation.isPending}
                  className="text-[var(--muted)] hover:text-[#914a39] transition-colors disabled:opacity-50"
                  title="Remover da aula"
                >
                  <UserMinus className="w-4 h-4" />
                </button>
              </label>
            ))
          )}
        </div>

        {error && (
          <p className="mb-3 text-[13px] text-[#914a39] bg-[#fde8e3] border border-[#f3c5b8] rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center w-11 h-11 rounded-xl border border-[var(--border)] text-[var(--muted)] hover:bg-black/[0.03] transition-colors"
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => attendanceMutation.mutate()}
            disabled={attendanceMutation.isPending || checked.size === 0}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[var(--ink)] text-white rounded-xl text-[15px] font-semibold hover:bg-[var(--ink-soft)] transition-colors disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            {attendanceDone ? 'Presenças registadas' : `Marcar presenças (${checked.size})`}
          </button>
        </div>
      </div>
    </div>
  );
}
