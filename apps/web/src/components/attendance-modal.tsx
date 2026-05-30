'use client';

import { useEffect, useState } from 'react';
import type { AttendanceType } from '@/types';

type AttendanceModalProps = {
  studentName: string;
  date: string;
  existingTypes: AttendanceType[];
  onConfirm: (types: AttendanceType[]) => void;
  onCancel: () => void;
};

export function AttendanceModal({
  studentName,
  date,
  existingTypes,
  onConfirm,
  onCancel,
}: AttendanceModalProps) {
  const [tennis, setTennis] = useState(() =>
    existingTypes.length === 0 ? true : existingTypes.includes('TENNIS'),
  );
  const [physical, setPhysical] = useState(() =>
    existingTypes.length === 0 ? true : existingTypes.includes('PHYSICAL'),
  );

  // Trava scroll do body
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

  function handleConfirm() {
    const types: AttendanceType[] = [];
    if (tennis) types.push('TENNIS');
    if (physical) types.push('PHYSICAL');
    onConfirm(types);
  }

  const dataFormatada = new Date(date).toLocaleDateString('pt-PT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="fixed inset-0 z-[500] flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className="relative z-10 mx-0 w-full max-w-sm rounded-t-2xl bg-[var(--paper)] p-6 shadow-2xl sm:mx-4 sm:rounded-2xl">
        {/* Indicador swipe (mobile) */}
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[var(--border)] sm:hidden" />

        {/* Cabeçalho */}
        <div className="mb-5 flex flex-col gap-1">
          <h2 className="text-[17px] font-bold leading-tight tracking-[-0.01em] text-[var(--ink)]">
            Presença
          </h2>
          <p className="text-[14px] font-semibold text-[var(--ink)]">{studentName}</p>
          <p className="text-[13px] text-[var(--muted)]">{dataFormatada}</p>
        </div>

        {/* Checkboxes */}
        <div className="flex flex-col gap-3 mb-6">
          <label className="flex items-center gap-4 p-3 rounded-xl border border-[var(--border)] active:bg-[var(--accent-soft)]/30 transition-colors cursor-pointer">
            <input
              type="checkbox"
              checked={tennis}
              onChange={(e) => setTennis(e.target.checked)}
              className="h-5 w-5 rounded border-[var(--border)] accent-[#183223]"
            />
            <div className="flex flex-col gap-0.5">
              <span className="text-[15px] font-semibold text-[var(--ink)]">Ténis</span>
              <span className="text-[12px] text-[var(--muted)]">Treino convencional</span>
            </div>
          </label>

          <label className="flex items-center gap-4 p-3 rounded-xl border border-[var(--border)] active:bg-[var(--accent-soft)]/30 transition-colors cursor-pointer">
            <input
              type="checkbox"
              checked={physical}
              onChange={(e) => setPhysical(e.target.checked)}
              className="h-5 w-5 rounded border-[var(--border)] accent-[#183223]"
            />
            <div className="flex flex-col gap-0.5">
              <span className="text-[15px] font-semibold text-[var(--ink)]">Treino Físico</span>
              <span className="text-[12px] text-[var(--muted)]">Preparação física complementar</span>
            </div>
          </label>
        </div>

        {/* Botões */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-3 border border-[var(--border)] rounded-xl text-[15px] font-semibold text-[var(--muted)] hover:bg-black/[0.03] active:bg-black/[0.06] transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 px-4 py-3 bg-[var(--ink)] text-white rounded-xl text-[15px] font-semibold hover:bg-[var(--ink-soft)] active:bg-[var(--ink)] transition-colors"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
