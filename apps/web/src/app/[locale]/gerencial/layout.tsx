'use client';

import React, { useEffect, useState } from 'react';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { Building2, Gauge, LogOut, ShieldCheck } from 'lucide-react';
import {
  PLATFORM_TOKEN_KEY,
  clearPlatformSession,
  getStoredOwner,
} from '@/lib/platform-api';
import type { PlatformOwner } from '@/types';

const navItems = [
  { href: '/gerencial', label: 'Visão geral', icon: Gauge },
  { href: '/gerencial/escolas', label: 'Escolas', icon: Building2 },
];

export default function GerencialLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginRoute = pathname.startsWith('/gerencial/login');
  const [ready, setReady] = useState(false);
  const [owner, setOwner] = useState<PlatformOwner | null>(null);

  useEffect(() => {
    if (isLoginRoute) {
      setReady(true);
      return;
    }

    const token = localStorage.getItem(PLATFORM_TOKEN_KEY);
    if (!token) {
      router.replace('/gerencial/login');
      return;
    }

    setOwner(getStoredOwner());
    setReady(true);
  }, [isLoginRoute, router]);

  if (isLoginRoute) {
    return <>{children}</>;
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0f1c14]">
        <div className="rounded-lg border border-white/10 bg-white/5 px-6 py-4 font-semibold text-white/70">
          A carregar...
        </div>
      </div>
    );
  }

  function logout() {
    clearPlatformSession();
    router.replace('/gerencial/login');
  }

  return (
    <div className="min-h-screen bg-[#0f1c14] text-white">
      <header className="border-b border-white/10 bg-[#13251a]">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[rgba(198,240,92,0.18)]">
              <ShieldCheck className="h-5 w-5 text-[#c6f05c]" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-extrabold leading-tight">Painel Gerencial</p>
              <p className="truncate text-xs font-semibold text-white/50">
                {owner?.email ?? 'Dono da plataforma'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 text-sm font-semibold text-white/80 transition-colors hover:bg-white/10"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </header>

      <nav className="border-b border-white/10 bg-[#13251a]">
        <div className="mx-auto flex max-w-[1200px] gap-1 px-4 sm:px-6">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === '/gerencial'
                ? pathname === '/gerencial'
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex h-12 items-center gap-2 border-b-2 px-4 text-sm font-semibold transition-colors ${
                  isActive
                    ? 'border-[#c6f05c] text-white'
                    : 'border-transparent text-white/55 hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      <main className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
