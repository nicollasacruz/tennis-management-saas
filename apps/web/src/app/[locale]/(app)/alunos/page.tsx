'use client';

import React, { useState, useMemo } from 'react';
import { Link } from '@/i18n/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import { Student } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { Plus, Search, Pencil, Trash2, User } from 'lucide-react';

export default function AlunosPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

  const { data: students = [], isLoading } = useQuery<Student[]>({
    queryKey: ['students'],
    queryFn: () => apiRequest('/students'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/students/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const filteredStudents = useMemo(() => {
    if (!search.trim()) return students;
    const q = search.toLowerCase();
    return students.filter(
      (s) =>
        s.fullName.toLowerCase().includes(q) ||
        (s.email && s.email.toLowerCase().includes(q)) ||
        (s.phone && s.phone.includes(q))
    );
  }, [students, search]);

  const activeCount = students.filter((s) => s.isActive).length;
  const inactiveCount = students.filter((s) => !s.isActive).length;

  function handleDelete(student: Student) {
    if (
      !window.confirm(`Apagar o aluno "${student.fullName}"? Esta ação é definitiva.`)
    ) {
      return;
    }
    deleteMutation.mutate(student.id);
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex flex-col gap-1.5">
          <h2 className="text-[clamp(1.25rem,2vw,1.5rem)] leading-tight m-0">Alunos</h2>
          <p className="text-[#566857] m-0">
            {activeCount} ativos · {inactiveCount} inativos · {students.length} total
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/alunos/novo"
            className="flex items-center gap-2 px-4 py-2 bg-[#183223] text-white text-sm font-semibold rounded-lg hover:bg-[#24410b] transition-colors"
          >
            <Plus className="w-4 h-4" />
            Novo Aluno
          </Link>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#566857]" />
        <input
          type="text"
          placeholder="Pesquisar por nome, email ou telefone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-[#d9e5c1] rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#c6f05c] focus:border-[#97ce2a]"
        />
      </div>

      {/* List */}
      <div className="flex flex-col gap-3">
        {isLoading ? (
          <p className="text-[#566857]">A carregar alunos...</p>
        ) : filteredStudents.length === 0 ? (
          <div className="p-8 text-center text-[#566857] border border-dashed border-[#d9e5c1] rounded-xl">
            Nenhum aluno encontrado.
          </div>
        ) : (
          filteredStudents.map((student) => (
            <div
              key={student.id}
              className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-white/60 border border-[#d9e5c1] hover:-translate-y-0.5 hover:border-[#bdd383] hover:shadow-sm transition-all"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-[rgba(198,240,92,0.3)] flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-[#24410b]" />
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[#183223]">{student.fullName}</span>
                    {!student.isActive && (
                      <span className="px-2 py-0.5 bg-[#fcebe7] text-[#914a39] text-xs font-bold rounded-full">
                        Inativo
                      </span>
                    )}
                    {student.isMinor && (
                      <span className="px-2 py-0.5 bg-[#fff3dd] text-[#8d5c10] text-xs font-bold rounded-full">
                        Menor
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-[#566857]">
                    {student.phone && <span>{student.phone}</span>}
                    {student.email && <span>{student.email}</span>}
                    {student.currentPlan && (
                      <span className="font-medium text-[#183223]">
                        {student.currentPlan.name} · {formatCurrency(student.currentPlan.monthlyFeeCents)}
                      </span>
                    )}
                    {student.doesPhysicalTraining && (
                      <span className="text-xs bg-[#edf7d5] text-[#31501a] px-1.5 py-0.5 rounded font-semibold">
                        + TF
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href={`/alunos/${student.id}/editar`}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-[#183223] border border-[#d9e5c1] rounded-lg hover:bg-[rgba(198,240,92,0.2)] hover:border-[#bdd383] transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Editar
                </Link>
                <button
                  onClick={() => handleDelete(student)}
                  disabled={deleteMutation.isPending && deleteMutation.variables === student.id}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-[#914a39] border border-[#d9e5c1] rounded-lg hover:bg-[#fcebe7] hover:border-[#914a39] transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Apagar
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
