'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { ESAF_LOGO } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  CreditCard,
  Settings,
  Menu,
  X,
  CalendarDays,
  Trophy,
  MessageCircle,
  Smartphone,
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/presencas', label: 'Presenças', icon: CalendarDays },
  { href: '/alunos', label: 'Alunos', icon: Users },
  { href: '/planos', label: 'Planos', icon: ClipboardList },
  { href: '/atividades', label: 'Atividades', icon: Trophy },
  { href: '/equipa', label: 'Equipa', icon: Settings },
  { href: '/pagamentos', label: 'Pagamentos', icon: CreditCard },
  { href: '/comunicacoes', label: 'Comunicações', icon: MessageCircle },
  { href: '/whatsapp', label: 'WhatsApp', icon: Smartphone },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4f7ed]">
        <div className="px-6 py-4 bg-white/80 border border-[#d9e5c1] rounded-lg shadow-md text-[#566857] font-semibold">
          A carregar...
        </div>
      </div>
    );
  }

  if (!user) {
    router.replace('/login');
    return null;
  }

  const activeRoute = navItems.find((item) => pathname.startsWith(item.href));

  return (
    <div className="min-h-screen flex flex-col bg-[#f4f7ed]">
      {/* Ambient background */}
      <div className="fixed w-[400px] h-[400px] rounded-full border border-white/30 bg-[rgba(198,240,92,0.08)] pointer-events-none -z-10 -top-[150px] -left-[100px]" />
      <div className="fixed w-[400px] h-[400px] rounded-full border border-white/30 bg-[rgba(198,240,92,0.08)] pointer-events-none -z-10 -right-[150px] bottom-[200px]" />

      {/* Top Nav */}
      <header className="sticky top-0 z-[300] bg-[rgba(252,253,247,0.95)] backdrop-blur-xl border-b border-[#d9e5c1]">
        <div className="flex items-center justify-between h-16 max-w-[1400px] mx-auto px-5 gap-4">
          {/* Brand */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <img
              src={ESAF_LOGO}
              alt="ESAF"
              className="w-10 h-10 rounded-lg bg-gradient-to-br from-[rgba(198,240,92,0.9)] to-[rgba(239,246,193,0.9)] border border-[rgba(74,104,16,0.12)] p-1"
            />
            <div className="flex flex-col leading-tight">
              <span className="font-extrabold text-[1.1rem] text-[#183223]">ESAF</span>
              <span className="text-xs text-[#566857] font-medium">Gestão Financeira</span>
            </div>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-150 ${
                    isActive
                      ? 'text-[#24410b] bg-[rgba(198,240,92,0.35)]'
                      : 'text-[#566857] hover:text-[#183223] hover:bg-black/[0.03]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-4 flex-shrink-0">
            <div className="hidden md:flex flex-col items-end gap-0.5">
              <span className="font-semibold text-sm text-[#183223]">{user.fullName}</span>
              <span className="text-[0.7rem] text-[#566857] uppercase tracking-wider">
                {user.role}
              </span>
            </div>
            <button
              onClick={logout}
              className="hidden md:block px-3 py-2 border border-[#d9e5c1] rounded-lg bg-transparent text-[#566857] text-sm font-semibold hover:bg-[#fcebe7] hover:border-[#914a39] hover:text-[#914a39] transition-all"
            >
              Sair
            </button>

            {/* Mobile toggle */}
            <button
              className="md:hidden w-11 h-11 flex items-center justify-center rounded-lg hover:bg-black/[0.04]"
              onClick={() => setSidebarOpen(true)}
              aria-label="Abrir menu"
            >
              <Menu className="w-5 h-5 text-[#183223]" />
            </button>
          </div>
        </div>

      </header>

      {/* Mobile Drawer */}
      {sidebarOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[350] animate-[fadeIn_200ms_ease]"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="fixed top-0 right-0 w-[280px] h-screen bg-white z-[400] shadow-xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-[#d9e5c1]">
              <div className="flex items-center gap-3 font-extrabold text-lg">
                <img src={ESAF_LOGO} alt="ESAF" className="w-9 h-9 rounded-lg" />
                ESAF
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="w-9 h-9 flex items-center justify-center rounded-lg bg-black/5 hover:bg-black/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex flex-col p-3 gap-1 flex-1 overflow-y-auto">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-base font-semibold transition-colors ${
                      isActive
                        ? 'bg-[rgba(198,240,92,0.3)] text-[#24410b]'
                        : 'hover:bg-black/[0.04]'
                    }`}
                  >
                    <span className="w-8 h-8 flex items-center justify-center rounded-md bg-black/5">
                      <Icon className="w-4 h-4" />
                    </span>
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="p-4 border-t border-[#d9e5c1] bg-black/[0.02]">
              <div className="flex flex-col gap-2 mb-4 pb-4 border-b border-[#d9e5c1]">
                <span className="font-bold">{user.fullName}</span>
                <span className="text-sm text-[#566857]">{user.email}</span>
              </div>
              <button
                onClick={() => {
                  setSidebarOpen(false);
                  logout();
                }}
                className="w-full p-3 border border-[#d9e5c1] rounded-lg bg-transparent text-[#914a39] font-semibold hover:bg-[#fcebe7] transition-colors"
              >
                Sair
              </button>
            </div>
          </div>
        </>
      )}

      {/* Main Content */}
      <main className="flex-1 max-w-[1400px] mx-auto p-5 w-full flex flex-col gap-5">
        {children}
      </main>
    </div>
  );
}
