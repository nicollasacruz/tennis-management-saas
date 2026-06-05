'use client';

import React, { useMemo, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest, getClassExceptions, getClassSlots, getCourts } from '@/lib/api';
import type { ClassException, ClassSlot, Court, Student, SystemUser } from '@/types';
import {
  ChevronLeft,
  ChevronRight,
  LandPlot,
  Plus,
  User,
  Users,
} from 'lucide-react';
import {
  dateForWeekday,
  getMondayOf,
  minutesToHHMM,
  shiftIsoDate,
  WEEKDAY_LABELS_LONG,
  WEEK_DAYS_MON_FIRST,
} from '@/lib/utils';
import { ClassSlotModal } from '@/components/class-slot-modal';
import { ClassOccurrenceModal } from '@/components/class-occurrence-modal';

type SlotModalState =
  | { mode: 'create'; defaults?: { courtId?: string; dayOfWeek?: number } }
  | { mode: 'edit'; slot: ClassSlot };

export default function HorariosPage() {
  const queryClient = useQueryClient();
  const [monday, setMonday] = useState(() => getMondayOf(new Date()));
  const [courtFilter, setCourtFilter] = useState<string>('all');
  const [slotModal, setSlotModal] = useState<SlotModalState | null>(null);
  const [occurrence, setOccurrence] = useState<{
    slot: ClassSlot;
    dateIso: string;
    exception?: ClassException;
  } | null>(null);

  const { data: courts = [] } = useQuery<Court[]>({
    queryKey: ['courts'],
    queryFn: getCourts,
  });
  const { data: slots = [], isLoading } = useQuery<ClassSlot[]>({
    queryKey: ['classSlots'],
    queryFn: getClassSlots,
  });
  const { data: students = [] } = useQuery<Student[]>({
    queryKey: ['students'],
    queryFn: () => apiRequest('/students'),
  });
  const { data: systemUsers = [] } = useQuery<SystemUser[]>({
    queryKey: ['systemUsers'],
    queryFn: () => apiRequest('/system-users'),
  });
  const { data: exceptions = [] } = useQuery<ClassException[]>({
    queryKey: ['classExceptions', monday],
    queryFn: () => getClassExceptions(monday),
  });

  const coaches = useMemo(
    () =>
      systemUsers.filter(
        (u) => u.isActive && (u.role === 'COACH' || u.role === 'HEAD_COACH'),
      ),
    [systemUsers],
  );

  // Mapa exceção por `${slotId}|${dateIso}`.
  const exceptionMap = useMemo(() => {
    const map = new Map<string, ClassException>();
    for (const ex of exceptions) {
      const iso = ex.date.split('T')[0];
      map.set(`${ex.classSlotId}|${iso}`, ex);
    }
    return map;
  }, [exceptions]);

  const visibleSlots =
    courtFilter === 'all' ? slots : slots.filter((s) => s.courtId === courtFilter);

  function invalidateAll() {
    queryClient.invalidateQueries({ queryKey: ['classSlots'] });
    queryClient.invalidateQueries({ queryKey: ['classExceptions', monday] });
    queryClient.invalidateQueries({ queryKey: ['courts'] });
  }

  const sunday = shiftIsoDate(monday, 6);
  const weekLabel = `${new Date(monday).toLocaleDateString('pt-PT', {
    day: 'numeric',
    month: 'short',
  })} – ${new Date(sunday).toLocaleDateString('pt-PT', {
    day: 'numeric',
    month: 'short',
  })}`;

  if (courts.length === 0) {
    return (
      <div className="flex flex-col gap-5">
        <h2 className="text-[clamp(1.25rem,2vw,1.5rem)] leading-tight m-0">Horários</h2>
        <div className="flex flex-col items-center gap-3 p-8 text-center border border-dashed border-[#d9e5c1] rounded-xl">
          <LandPlot className="w-8 h-8 text-[#566857]" />
          <p className="text-[#566857] m-0">
            Cria primeiro os teus courts para montar a grade de horários.
          </p>
          <Link
            href="/courts"
            className="flex items-center gap-2 px-4 py-2 bg-[#183223] text-white text-sm font-semibold rounded-lg hover:bg-[#24410b] transition-colors"
          >
            <Plus className="w-4 h-4" />
            Criar courts
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Cabeçalho */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex flex-col gap-1.5">
          <h2 className="text-[clamp(1.25rem,2vw,1.5rem)] leading-tight m-0">Horários</h2>
          <p className="text-[#566857] m-0">Grade semanal de aulas por court</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/courts"
            className="flex items-center gap-2 px-3 py-2 border border-[var(--border)] text-[var(--muted)] text-sm font-semibold rounded-lg hover:text-[var(--ink)] hover:border-[var(--ink)] transition-colors"
          >
            <LandPlot className="w-4 h-4" />
            Courts
          </Link>
          <button
            type="button"
            onClick={() => setSlotModal({ mode: 'create' })}
            className="flex items-center gap-2 px-4 py-2 bg-[#183223] text-white text-sm font-semibold rounded-lg hover:bg-[#24410b] transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nova aula
          </button>
        </div>
      </div>

      {/* Navegação de semana + tabs de court */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMonday(shiftIsoDate(monday, -7))}
            className="flex items-center justify-center w-9 h-9 rounded-lg border border-[var(--border)] text-[var(--muted)] hover:text-[var(--ink)] hover:border-[var(--ink)] transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-semibold text-[var(--ink)] min-w-[120px] text-center">
            {weekLabel}
          </span>
          <button
            type="button"
            onClick={() => setMonday(shiftIsoDate(monday, 7))}
            className="flex items-center justify-center w-9 h-9 rounded-lg border border-[var(--border)] text-[var(--muted)] hover:text-[var(--ink)] hover:border-[var(--ink)] transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setMonday(getMondayOf(new Date()))}
            className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-[13px] font-semibold text-[var(--muted)] hover:text-[var(--ink)] hover:border-[var(--ink)] transition-colors"
          >
            Hoje
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <CourtTab label="Todos" active={courtFilter === 'all'} onClick={() => setCourtFilter('all')} />
          {courts.map((c) => (
            <CourtTab
              key={c.id}
              label={c.name}
              active={courtFilter === c.id}
              onClick={() => setCourtFilter(c.id)}
            />
          ))}
        </div>
      </div>

      {/* Grade semanal (board por dia) */}
      {isLoading ? (
        <p className="text-[#566857]">A carregar horários...</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-7">
          {WEEK_DAYS_MON_FIRST.map((day) => {
            const dateIso = dateForWeekday(monday, day);
            const daySlots = visibleSlots
              .filter((s) => s.dayOfWeek === day)
              .sort((a, b) => a.startMin - b.startMin);
            return (
              <div key={day} className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-bold uppercase tracking-[0.1em] text-[#7a8b79]">
                    {WEEKDAY_LABELS_LONG[day]}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setSlotModal({
                        mode: 'create',
                        defaults: {
                          dayOfWeek: day,
                          courtId: courtFilter !== 'all' ? courtFilter : undefined,
                        },
                      })
                    }
                    className="text-[var(--muted)] hover:text-[var(--ink)] transition-colors"
                    title="Nova aula neste dia"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex flex-col gap-2 min-h-[40px]">
                  {daySlots.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-[#e7eed3] py-3 text-center text-[11px] text-[#a7b3a0]">
                      —
                    </div>
                  ) : (
                    daySlots.map((slot) => {
                      const ex = exceptionMap.get(`${slot.id}|${dateIso}`);
                      const cancelled = ex?.type === 'CANCELLED';
                      const moved = ex?.type === 'MOVED';
                      return (
                        <button
                          key={slot.id}
                          type="button"
                          onClick={() => setOccurrence({ slot, dateIso, exception: ex })}
                          className={`flex flex-col gap-1 rounded-lg border p-2.5 text-left transition-all hover:-translate-y-0.5 hover:shadow-sm ${
                            cancelled
                              ? 'border-[#e3d5d0] bg-[#f7efec] opacity-70'
                              : 'border-[#d9e5c1] bg-white/70 hover:border-[#bdd383]'
                          }`}
                        >
                          <span
                            className={`text-[12px] font-bold ${
                              cancelled ? 'text-[#914a39] line-through' : 'text-[#24410b]'
                            }`}
                          >
                            {minutesToHHMM(slot.startMin)}–{minutesToHHMM(slot.endMin)}
                          </span>
                          <span
                            className={`text-[13px] font-semibold leading-tight ${
                              cancelled ? 'text-[#566857] line-through' : 'text-[#183223]'
                            }`}
                          >
                            {slot.title}
                          </span>
                          <span className="flex items-center gap-1 text-[11px] text-[#566857]">
                            <LandPlot className="w-3 h-3" />
                            {slot.court.name}
                          </span>
                          {slot.coach && (
                            <span className="flex items-center gap-1 text-[11px] text-[#566857]">
                              <User className="w-3 h-3" />
                              {slot.coach.fullName}
                            </span>
                          )}
                          <span className="flex items-center gap-1 text-[11px] text-[#566857]">
                            <Users className="w-3 h-3" />
                            {slot._count.enrollments}
                            {slot.capacity ? `/${slot.capacity}` : ''}
                          </span>
                          {cancelled && (
                            <span className="text-[10px] font-bold uppercase tracking-wide text-[#914a39]">
                              Cancelada
                            </span>
                          )}
                          {moved && (
                            <span className="text-[10px] font-bold uppercase tracking-wide text-[#92400e]">
                              Movida
                            </span>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {slotModal && (
        <ClassSlotModal
          courts={courts}
          coaches={coaches}
          slot={slotModal.mode === 'edit' ? slotModal.slot : null}
          defaults={slotModal.mode === 'create' ? slotModal.defaults : undefined}
          onClose={() => setSlotModal(null)}
          onSaved={() => {
            setSlotModal(null);
            invalidateAll();
          }}
        />
      )}

      {occurrence && (
        <ClassOccurrenceModal
          slot={occurrence.slot}
          dateIso={occurrence.dateIso}
          courts={courts}
          students={students}
          exception={occurrence.exception}
          onEditSlot={() => {
            setSlotModal({ mode: 'edit', slot: occurrence.slot });
            setOccurrence(null);
          }}
          onClose={() => setOccurrence(null)}
          onChanged={() => {
            invalidateAll();
            setOccurrence(null);
          }}
        />
      )}
    </div>
  );
}

function CourtTab({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-[13px] font-semibold transition-colors ${
        active
          ? 'bg-[var(--ink)] text-white'
          : 'bg-[var(--cream)] text-[var(--muted)] border border-[var(--border)] hover:text-[var(--ink)]'
      }`}
    >
      {label}
    </button>
  );
}
