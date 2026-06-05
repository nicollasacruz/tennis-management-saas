'use client';

import React, { useState } from 'react';
import { Link } from '@/i18n/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createCourt,
  deleteCourt,
  getCourtLimits,
  getCourts,
  updateCourt,
} from '@/lib/api';
import type { Court, CourtLimits } from '@/types';
import { ArrowLeft, LandPlot, Plus, Power, Trash2 } from 'lucide-react';

const inputClass =
  'border border-[#d9e5c1] bg-white px-3 py-2 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c6f05c]';

export default function CourtsPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [surface, setSurface] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data: courts = [], isLoading } = useQuery<Court[]>({
    queryKey: ['courts'],
    queryFn: getCourts,
  });
  const { data: limits } = useQuery<CourtLimits>({
    queryKey: ['courtLimits'],
    queryFn: getCourtLimits,
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['courts'] });
    queryClient.invalidateQueries({ queryKey: ['courtLimits'] });
  }

  const createMutation = useMutation({
    mutationFn: () =>
      createCourt({ name: name.trim(), surface: surface.trim() || undefined }),
    onSuccess: () => {
      setName('');
      setSurface('');
      setError(null);
      invalidate();
    },
    onError: (e: Error) => setError(e.message),
  });

  const toggleMutation = useMutation({
    mutationFn: (court: Court) =>
      updateCourt(court.id, { isActive: !court.isActive }),
    onSuccess: invalidate,
    onError: (e: Error) => setError(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCourt(id),
    onSuccess: invalidate,
    onError: (e: Error) => setError(e.message),
  });

  function handleDelete(court: Court) {
    if (!window.confirm(`Remover o court "${court.name}"?`)) return;
    deleteMutation.mutate(court.id);
  }

  const atLimit = limits ? limits.activeCourts >= limits.maxCourts : false;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex flex-col gap-1.5">
          <Link
            href="/horarios"
            className="flex items-center gap-1.5 text-sm text-[#566857] hover:text-[#183223] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Horários
          </Link>
          <h2 className="text-[clamp(1.25rem,2vw,1.5rem)] leading-tight m-0">Courts</h2>
          {limits && (
            <p className="text-[#566857] m-0">
              {limits.activeCourts} de {limits.maxCourts} courts ativos no plano
            </p>
          )}
        </div>
      </div>

      {/* Form de criação */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          createMutation.mutate();
        }}
        className="flex flex-col gap-3 p-4 rounded-xl bg-white/60 border border-[#d9e5c1] sm:flex-row sm:items-end"
      >
        <div className="flex flex-col gap-1 flex-1">
          <label className="text-xs font-semibold text-[#566857]">Nome</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Court 1"
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1 flex-1">
          <label className="text-xs font-semibold text-[#566857]">Piso (opcional)</label>
          <input
            value={surface}
            onChange={(e) => setSurface(e.target.value)}
            placeholder="Terra batida, rápido…"
            className={inputClass}
          />
        </div>
        <button
          type="submit"
          disabled={createMutation.isPending || atLimit || !name.trim()}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-[#183223] text-white text-sm font-semibold rounded-lg hover:bg-[#24410b] transition-colors disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          Adicionar
        </button>
      </form>

      {atLimit && (
        <p className="text-[13px] text-[#92400e] bg-[#fef3c7] border border-[#fde68a] rounded-lg px-3 py-2">
          Limite de courts do plano atingido. Desativa um court ou faz upgrade do plano.
        </p>
      )}
      {error && (
        <p className="text-[13px] text-[#914a39] bg-[#fde8e3] border border-[#f3c5b8] rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {/* Lista */}
      <div className="flex flex-col gap-3">
        {isLoading ? (
          <p className="text-[#566857]">A carregar courts...</p>
        ) : courts.length === 0 ? (
          <div className="p-8 text-center text-[#566857] border border-dashed border-[#d9e5c1] rounded-xl">
            Nenhum court criado.
          </div>
        ) : (
          courts.map((court) => (
            <div
              key={court.id}
              className="flex items-center justify-between gap-3 p-4 rounded-xl bg-white/60 border border-[#d9e5c1]"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-[rgba(198,240,92,0.3)] flex items-center justify-center flex-shrink-0">
                  <LandPlot className="w-5 h-5 text-[#24410b]" />
                </div>
                <div className="flex flex-col gap-0.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-[#183223] truncate">{court.name}</span>
                    {!court.isActive && (
                      <span className="text-[0.65rem] font-bold uppercase tracking-[0.12em] px-2 py-0.5 rounded-full bg-[#f1f1f1] text-[#666] border border-[#ddd]">
                        Inativo
                      </span>
                    )}
                  </div>
                  <span className="text-sm text-[#566857]">
                    {court.surface || 'Sem piso definido'}
                    {court._count ? ` · ${court._count.classSlots} aulas` : ''}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => toggleMutation.mutate(court)}
                  disabled={toggleMutation.isPending}
                  title={court.isActive ? 'Desativar' : 'Ativar'}
                  className="flex items-center justify-center w-9 h-9 rounded-lg border border-[var(--border)] text-[var(--muted)] hover:text-[var(--ink)] hover:border-[var(--ink)] transition-colors disabled:opacity-50"
                >
                  <Power className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(court)}
                  disabled={deleteMutation.isPending}
                  className="flex items-center justify-center w-9 h-9 rounded-lg border border-[var(--border)] text-[var(--muted)] hover:text-[#914a39] hover:border-[#914a39] transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
