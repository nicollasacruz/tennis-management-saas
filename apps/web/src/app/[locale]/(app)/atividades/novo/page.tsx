'use client';

import React, { useState, FormEvent } from 'react';
import { Link } from '@/i18n/navigation';
import { useRouter } from '@/i18n/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import { ArrowLeft, Save } from 'lucide-react';

export default function NovaAtividadePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isPublished, setIsPublished] = useState(true);

  const createMutation = useMutation({
    mutationFn: () =>
      apiRequest('/activities', {
        method: 'POST',
        body: JSON.stringify({
          title,
          description,
          category,
          startDate,
          endDate: endDate || undefined,
          isPublished,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      router.push('/atividades');
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    createMutation.mutate();
  }

  return (
    <div className="flex w-full flex-col gap-5">
      <div className="flex items-center gap-3">
        <Link
          href="/atividades"
          className="flex items-center gap-1 text-sm font-semibold text-[#566857] hover:text-[#183223] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Link>
      </div>

      <div className="flex flex-col gap-4 p-5 rounded-2xl bg-[rgba(252,253,247,0.98)] border border-[#d9e5c1]">
        <div className="flex flex-col gap-1.5">
          <h2 className="text-[clamp(1.25rem,2vw,1.5rem)] leading-tight m-0">Nova Atividade</h2>
          <p className="text-[#566857] m-0">Registe uma competição ou evento no calendário.</p>
        </div>

        {createMutation.isError && (
          <div className="px-4 py-3 bg-[#fcebe7] border border-[rgba(160,74,55,0.2)] rounded-lg text-[#914a39] text-sm font-semibold">
            {createMutation.error instanceof Error ? createMutation.error.message : 'Erro ao criar atividade'}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-[#183223]">Título *</label>
            <input
              required
              maxLength={120}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-[#d9e5c1] rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#c6f05c] focus:border-[#97ce2a]"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-[#183223]">Categoria *</label>
            <input
              required
              maxLength={40}
              placeholder="Ex: Juvenil, Nacional, Adaptado"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border border-[#d9e5c1] rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#c6f05c] focus:border-[#97ce2a]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold text-[#183223]">Data de início *</label>
              <input
                required
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-[#d9e5c1] rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#c6f05c] focus:border-[#97ce2a]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold text-[#183223]">Data de fim</label>
              <input
                type="date"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-[#d9e5c1] rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#c6f05c] focus:border-[#97ce2a]"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-[#183223]">Descrição *</label>
            <textarea
              required
              maxLength={500}
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-[#d9e5c1] rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#c6f05c] focus:border-[#97ce2a] resize-y"
            />
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
              className="w-4 h-4 rounded border-[#d9e5c1] text-[#183223] focus:ring-[#c6f05c]"
            />
            <span className="text-sm font-medium text-[#183223]">Publicado</span>
            <span className="text-xs text-[#566857]">
              {isPublished ? 'Visível na landing page' : 'Oculto — guardado como rascunho'}
            </span>
          </label>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Link
              href="/atividades"
              className="px-4 py-2 border border-[#d9e5c1] rounded-lg text-sm font-semibold text-[#566857] hover:bg-black/[0.03] transition-colors"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-[#183223] text-white text-sm font-semibold rounded-lg hover:bg-[#24410b] transition-colors disabled:opacity-60"
            >
              <Save className="w-4 h-4" />
              {createMutation.isPending ? 'A guardar...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
