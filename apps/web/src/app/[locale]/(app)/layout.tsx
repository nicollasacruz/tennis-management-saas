'use client';

import React, { useState } from 'react';
import { Link } from '@/i18n/navigation';
import { usePathname, useRouter } from '@/i18n/navigation';
import { useAuth } from '@/components/auth-provider';
import { ESAF_LOGO } from '@/lib/utils';
import {
  Building2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  Settings,
  Smartphone,
  Trophy,
  UserCog,
  Users,
  Wallet,
  X,
} from 'lucide-react';

const navGroups = [
  {
    label: 'Operação',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/presencas', label: 'Presenças', icon: CalendarDays },
      { href: '/alunos', label: 'Alunos', icon: Users },
      { href: '/planos', label: 'Planos', icon: ClipboardList },
      { href: '/atividades', label: 'Atividades', icon: Trophy },
      { href: '/pagamentos', label: 'Pagamentos', icon: CreditCard },
    ],
  },
  {
    label: 'Administração',
    items: [
      { href: '/comunicacoes', label: 'Comunicações', icon: MessageCircle },
      { href: '/whatsapp', label: 'WhatsApp', icon: Smartphone },
      { href: '/equipa', label: 'Equipa', icon: UserCog },
      { href: '/conta', label: 'Conta', icon: Wallet },
      { href: '/definicoes', label: 'Definições', icon: Settings },
    ],
  },
];

const navItems = navGroups.flatMap((group) => group.items);

function SidebarContent({
  collapsed,
  onNavigate,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-1 flex-col gap-5 overflow-y-auto px-3 py-4">
      {navGroups.map((group) => (
        <div key={group.label} className="flex flex-col gap-1.5">
          {!collapsed && (
            <p className="px-3 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-[#7a8b79]">
              {group.label}
            </p>
          )}

          {group.items.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                onClick={onNavigate}
                className={`flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-semibold transition-colors ${
                  isActive
                    ? 'bg-[rgba(198,240,92,0.34)] text-[#24410b]'
                    : 'text-[#566857] hover:bg-black/[0.035] hover:text-[#183223]'
                } ${collapsed ? 'justify-center' : ''}`}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4f7ed]">
        <div className="rounded-lg border border-[#d9e5c1] bg-white/80 px-6 py-4 font-semibold text-[#566857]">
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
  const tenantName = user.tenant?.name ?? 'ESAF';

  return (
    <div className="min-h-screen bg-[#f4f7ed] text-[#183223]">
      <header className="sticky top-0 z-[250] border-b border-[#d9e5c1] bg-[rgba(252,253,247,0.95)] px-4 backdrop-blur-xl lg:hidden">
        <div className="flex h-14 items-center justify-between gap-3">
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#d9e5c1] bg-white/70"
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">{activeRoute?.label ?? tenantName}</p>
            <p className="truncate text-xs font-semibold text-[#566857]">{tenantName}</p>
          </div>
          <img src={ESAF_LOGO} alt="ESAF" className="h-9 w-9 rounded-lg border border-[#d9e5c1]" />
        </div>
      </header>

      <div className="flex min-h-screen">
        <aside
          className={`sticky top-0 hidden h-screen flex-shrink-0 flex-col border-r border-[#d9e5c1] bg-[rgba(252,253,247,0.92)] backdrop-blur-xl transition-[width] duration-150 lg:flex ${
            collapsed ? 'w-[76px]' : 'w-[268px]'
          }`}
        >
          <div className="flex h-16 items-center gap-3 border-b border-[#d9e5c1] px-4">
            <img
              src={ESAF_LOGO}
              alt="ESAF"
              className="h-10 w-10 rounded-lg border border-[rgba(74,104,16,0.12)] bg-[rgba(198,240,92,0.25)] p-1"
            />
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-extrabold">{tenantName}</p>
                <p className="truncate text-xs font-semibold text-[#566857]">Gestão Financeira</p>
              </div>
            )}
          </div>

          <SidebarContent collapsed={collapsed} />

          <div className="border-t border-[#d9e5c1] p-3">
            <div
              className={`mb-3 flex items-center gap-3 rounded-lg border border-[#e3edcf] bg-[#f8fbf2] p-3 ${
                collapsed ? 'justify-center' : ''
              }`}
            >
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[rgba(198,240,92,0.34)]">
                <Building2 className="h-4 w-4 text-[#24410b]" />
              </div>
              {!collapsed && (
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{user.fullName}</p>
                  <p className="truncate text-xs font-semibold uppercase tracking-[0.08em] text-[#566857]">
                    {user.role}
                  </p>
                </div>
              )}
            </div>

            <div className={`flex gap-2 ${collapsed ? 'flex-col' : ''}`}>
              <button
                type="button"
                onClick={() => setCollapsed((value) => !value)}
                className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-[#d9e5c1] bg-white/60 text-sm font-semibold text-[#566857] transition-colors hover:bg-[rgba(198,240,92,0.18)] hover:text-[#183223]"
                aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
                title={collapsed ? 'Expandir menu' : 'Recolher menu'}
              >
                {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                {!collapsed && 'Recolher'}
              </button>
              <button
                type="button"
                onClick={logout}
                className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-[#d9e5c1] bg-white/60 text-sm font-semibold text-[#914a39] transition-colors hover:border-[#914a39] hover:bg-[#fcebe7]"
                aria-label="Sair"
                title="Sair"
              >
                <LogOut className="h-4 w-4" />
                {!collapsed && 'Sair'}
              </button>
            </div>
          </div>
        </aside>

        {mobileOpen && (
          <>
            <div
              className="fixed inset-0 z-[350] bg-black/35 backdrop-blur-sm lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <aside className="fixed inset-y-0 left-0 z-[400] flex w-[292px] flex-col border-r border-[#d9e5c1] bg-[#fcfdf7] shadow-xl lg:hidden">
              <div className="flex h-16 items-center justify-between border-b border-[#d9e5c1] px-4">
                <div className="flex min-w-0 items-center gap-3">
                  <img src={ESAF_LOGO} alt="ESAF" className="h-10 w-10 rounded-lg" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-extrabold">{tenantName}</p>
                    <p className="truncate text-xs font-semibold text-[#566857]">{user.fullName}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#d9e5c1] bg-white/70"
                  aria-label="Fechar menu"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <SidebarContent collapsed={false} onNavigate={() => setMobileOpen(false)} />

              <div className="border-t border-[#d9e5c1] p-4">
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    logout();
                  }}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-[#d9e5c1] bg-white/70 text-sm font-semibold text-[#914a39]"
                >
                  <LogOut className="h-4 w-4" />
                  Sair
                </button>
              </div>
            </aside>
          </>
        )}

        <main className="flex min-w-0 flex-1 flex-col">
          <div className="w-full max-w-[1440px] px-4 py-5 sm:px-5 lg:px-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
