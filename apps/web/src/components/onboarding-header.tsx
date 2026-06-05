'use client';

import { Link } from '@/i18n/navigation';
import { BRAND } from '@/lib/brand';

export function BrandMark({ className = '' }: { className?: string }) {
  return (
    <img
      src="/brand-logo.png"
      alt={BRAND}
      className={`inline-block h-9 w-9 rounded-xl ${className}`}
    />
  );
}

// Cabeçalho consistente com as páginas públicas (mesmo BrandMark, mesma barra
// fixa translúcida). Onboarding é só pt-PT, por isso não inclui o seletor de
// idioma — a ligação leva ao login da escola.
export function OnboardingHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[rgba(247,249,240,0.85)] backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-6">
        <Link
          href="/"
          className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
        >
          <BrandMark />
          <span className="text-[15px] font-extrabold tracking-tight text-[var(--ink)]">
            {BRAND}
          </span>
        </Link>
        <Link
          href="/login"
          className="rounded-lg px-3 py-2 text-[13px] font-semibold text-[var(--muted)] transition-colors hover:bg-[var(--accent-soft)] hover:text-[var(--ink)]"
        >
          Entrar
        </Link>
      </div>
    </header>
  );
}
