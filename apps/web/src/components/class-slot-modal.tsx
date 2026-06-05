'use client';

import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  createClassSlot,
  deleteClassSlot,
  updateClassSlot,
  type ClassSlotInput,
} from '@/lib/api';
import type { ClassSlot, Court, SystemUser } from '@/types';
import {
  hhmmToMinutes,
  minutesToHHMM,
  WEEKDAY_LABELS_LONG,
  WEEK_DAYS_MON_FIRST,
} from '@/lib/utils';
import { Trash2 } from 'lucide-react';

const inputClass =
  'border border-[#d9e5c1] bg-white px-3 py-2 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c6f05c]';

type Props = {
  courts: Court[];
  coaches: SystemUser[];
  slot?: ClassSlot | null;
  // valores pré-preenchidos ao criar a partir de uma célula
  defaults?: { courtId?: string; dayOfWeek?: number; startMin?: number };
  onClose: () => void;
  onSaved: () => void;
};

export function ClassSlotModal({ courts, coaches, slot, defaults, onClose, onSaved }: Props) {
  const isEdit = !!slot;
  const activeCourts = courts.filter((c) => c.isActive || c.id === slot?.courtId);

  const [courtId, setCourtId] = useState(
    slot?.courtId ?? defaults?.courtId ?? activeCourts[0]?.id ?? '',
  );
  const [title, setTitle] = useState(slot?.title ?? '');
  const [dayOfWeek, setDayOfWeek] = useState<number>(
    slot?.dayOfWeek ?? defaults?.dayOfWeek ?? 1,
  );
  const [start, setStart] = useState(
    minutesToHHMM(slot?.startMin ?? defaults?.startMin ?? 17 * 60),
  );
  const [end, setEnd] = useState(
    minutesToHHMM(slot?.endMin ?? (defaults?.startMin ?? 17 * 60) + 60),
  );
  const [coachId, setCoachId] = useState(slot?.coachId ?? '');
  const [capacity, setCapacity] = useState(
    slot?.capacity != null ? String(slot.capacity) : '',
  );
  const [error, setError] = useState<string | null>(null);

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

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload: ClassSlotInput = {
        courtId,
        title: title.trim(),
        dayOfWeek,
        startMin: hhmmToMinutes(start),
        endMin: hhmmToMinutes(end),
        coachId: coachId || null,
        capacity: capacity ? Number(capacity) : null,
      };
      return isEdit ? updateClassSlot(slot!.id, payload) : createClassSlot(payload);
    },
    onSuccess: () => onSaved(),
    onError: (e: Error) => setError(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteClassSlot(slot!.id),
    onSuccess: () => onSaved(),
    onError: (e: Error) => setError(e.message),
  });

  function handleDelete() {
    if (!window.confirm('Eliminar esta aula e todas as inscrições/exceções?')) return;
    deleteMutation.mutate();
  }

  const canSave =
    courtId && title.trim() && hhmmToMinutes(end) > hhmmToMinutes(start);

  return (
    <div className="fixed inset-0 z-[500] flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-t-2xl bg-[var(--paper)] p-6 shadow-2xl sm:mx-4 sm:rounded-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="mb-5 text-[17px] font-bold tracking-[-0.01em] text-[var(--ink)]">
          {isEdit ? 'Editar aula' : 'Nova aula'}
        </h2>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-[#566857]">Título</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="SUB-10 Iniciação"
              className={inputClass}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-[#566857]">Court</label>
            <select value={courtId} onChange={(e) => setCourtId(e.target.value)} className={inputClass}>
              {activeCourts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-[#566857]">Dia da semana</label>
            <select
              value={dayOfWeek}
              onChange={(e) => setDayOfWeek(Number(e.target.value))}
              className={inputClass}
            >
              {WEEK_DAYS_MON_FIRST.map((d) => (
                <option key={d} value={d}>
                  {WEEKDAY_LABELS_LONG[d]}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3">
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-xs font-semibold text-[#566857]">Início</label>
              <input type="time" value={start} onChange={(e) => setStart(e.target.value)} className={inputClass} />
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-xs font-semibold text-[#566857]">Fim</label>
              <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className={inputClass} />
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-xs font-semibold text-[#566857]">Treinador</label>
              <select value={coachId} onChange={(e) => setCoachId(e.target.value)} className={inputClass}>
                <option value="">Sem treinador</option>
                {coaches.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.fullName}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1 w-28">
              <label className="text-xs font-semibold text-[#566857]">Vagas</label>
              <input
                type="number"
                min={1}
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                placeholder="—"
                className={inputClass}
              />
            </div>
          </div>

          {error && (
            <p className="text-[13px] text-[#914a39] bg-[#fde8e3] border border-[#f3c5b8] rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>

        <div className="mt-6 flex items-center gap-3">
          {isEdit && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="flex items-center justify-center w-11 h-11 rounded-xl border border-[var(--border)] text-[var(--muted)] hover:text-[#914a39] hover:border-[#914a39] transition-colors disabled:opacity-50"
              title="Eliminar aula"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-3 border border-[var(--border)] rounded-xl text-[15px] font-semibold text-[var(--muted)] hover:bg-black/[0.03] transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => canSave && saveMutation.mutate()}
            disabled={!canSave || saveMutation.isPending}
            className="flex-1 px-4 py-3 bg-[var(--ink)] text-white rounded-xl text-[15px] font-semibold hover:bg-[var(--ink-soft)] transition-colors disabled:opacity-50"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
