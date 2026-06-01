'use client';

import React, { useState, FormEvent, useEffect } from 'react';
import { Link } from '@/i18n/navigation';
import { useParams } from 'next/navigation';
import { useRouter } from '@/i18n/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import type { Activity } from '@/types';
import { ArrowLeft, Save } from 'lucide-react';

function toDateInputValue(dateStr: string | null): string {
  if (!dateStr) return '';
  return dateStr.slice(0, 10);
}

export default function EditarAtividadePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const queryClient = useQueryClient();

  const { data: activity, isLoading } = useQuery<Activity>({
    queryKey: ['activity', id],
    queryFn: () => apiRequest(`/activities/${id}`),
    enabled: !!id,
  });

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isPublished, setIsPublished] = useState(true);

  useEffect(() => {
    if (activity) {
      setTitle(activity.title);
      setDescription(activity.description);
      setCategory(activity.category);
      setStartDate(toDateInputValue(activity.startDate));
      setEndDate(toDateInputValue(activity.endDate));
      setIsPublished(activity.isPublished);
    }
  }, [activity]);

  const updateMutation = useMutation({
    mutationFn: () =>
      apiRequest(`/activities/${id}`, {
        method: 'PUT',
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
      queryClient.invalidateQueries({ queryKey: ['activity', id] });
      router.push('/atividades');
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    updateMutation.mutate();
  }

  if (isLoading) {
    return (
      <div className="flex w-full flex-col gap-5">
        <p className="text-[#566857]">A carregar atividade...</p>
      </div>
    );
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
          <h2 className="text-[clamp(1.25rem,2vw,1.5rem)] leading-tight m-0">Editar Atividade</h2>
          <p className="text-[#566857] m-0">Altere os dados da atividade.</p>
        </div>

        {updateMutation.isError && (
          <div className="px-4 py-3 bg-[#fcebe7] border border-[rgba(160,74,55,0.2)] rounded-lg text-[#914a39] text-sm font-semibold">
            {updateMutation.error instanceof Error ? updateMutation.error.message : 'Erro ao atualizar atividade'}
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
