'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import { SystemUser } from '@/types';
import { Plus, Settings } from 'lucide-react';

const roleLabels: Record<string, string> = {
  ADMIN: 'Administrador',
  HEAD_COACH: 'Treinador Chefe',
  COACH: 'Treinador',
  FINANCE: 'Financeiro',
  DESK: 'Secretaria',
};

export default function EquipaPage() {
  const { data: users = [], isLoading } = useQuery<SystemUser[]>({
    queryKey: ['system-users'],
    queryFn: () => apiRequest('/system-users'),
  });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex flex-col gap-1.5">
          <h2 className="text-[clamp(1.25rem,2vw,1.5rem)] leading-tight m-0">Equipa</h2>
          <p className="text-[#566857] m-0">{users.length} utilizadores internos</p>
        </div>
        <Link
          href="/equipa/novo"
          className="flex items-center gap-2 px-4 py-2 bg-[#183223] text-white text-sm font-semibold rounded-lg hover:bg-[#24410b] transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo Utilizador
        </Link>
      </div>

      <div className="flex flex-col gap-3">
        {isLoading ? (
          <p className="text-[#566857]">A carregar equipa...</p>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-[#566857] border border-dashed border-[#d9e5c1] rounded-xl">
            Nenhum utilizador registado.
          </div>
        ) : (
          users.map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between p-4 rounded-xl bg-white/60 border border-[#d9e5c1] hover:-translate-y-0.5 hover:border-[#bdd383] hover:shadow-sm transition-all"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-[rgba(198,240,92,0.3)] flex items-center justify-center flex-shrink-0">
                  <Settings className="w-5 h-5 text-[#24410b]" />
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[#183223]">{user.fullName}</span>
                    {!user.isActive && (
                      <span className="px-2 py-0.5 bg-[#fcebe7] text-[#914a39] text-xs font-bold rounded-full">
                        Inativo
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-[#566857]">
                    <span>{user.email}</span>
                    {user.phone && <span>{user.phone}</span>}
                    <span className="font-medium text-[#183223]">
                      {roleLabels[user.role] ?? user.role}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
