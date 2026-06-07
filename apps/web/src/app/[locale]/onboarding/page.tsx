'use client';

import {
  ArrowRight,
  BadgeCheck,
  CreditCard,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { OnboardingHeader } from '@/components/onboarding-header';
import { API_BASE, formatCurrency } from '@/lib/utils';

type SlugState = { available: boolean; reason?: string } | null;

const MONTHLY_PRICE_CENTS = 4990;

function normalizeSlug(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

function Field({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5 text-sm font-semibold text-[var(--ink)]">
      {label}
      {children}
    </label>
  );
}

const INPUT_CLASS =
  'h-11 rounded-xl border border-[var(--border)] bg-[var(--cream)] px-3 text-sm text-[var(--ink)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]';

export default function OnboardingPage() {
  const params = useParams<{ locale: string }>();
  const locale = params.locale ?? 'pt';
  const [schoolName, setSchoolName] = useState('');
  const [slug, setSlug] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [password, setPassword] = useState('');
  const [slugState, setSlugState] = useState<SlugState>(null);
  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug && schoolName) {
      setSlug(normalizeSlug(schoolName));
    }
  }, [schoolName, slug]);

  useEffect(() => {
    if (!slug) {
      setSlugState(null);
      return;
    }

    setChecking(true);
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(
          `${API_BASE}/onboarding/slug?slug=${encodeURIComponent(slug)}`,
        );
        const data = await res.json();
        setSlugState({ available: data.available, reason: data.reason });
      } catch {
        setSlugState(null);
      } finally {
        setChecking(false);
      }
    }, 350);

    return () => clearTimeout(timeout);
  }, [slug]);

  const canSubmit = Boolean(
    schoolName &&
      slug &&
      adminName &&
      adminEmail &&
      password.length >= 8 &&
      slugState?.available &&
      !submitting,
  );

  const slugMessage = useMemo(() => {
    if (!slug) return 'O endereço é sugerido automaticamente.';
    if (checking) return 'A verificar disponibilidade...';
    if (slugState?.available) return 'Endereço disponível.';
    return slugState?.reason ?? 'Endereço indisponível.';
  }, [checking, slug, slugState]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch(`${API_BASE}/onboarding/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolName,
          slug,
          adminName,
          adminEmail,
          password,
          locale,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message ?? 'Não foi possível iniciar o pagamento.');
      }
      window.location.href = data.checkoutUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado.');
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen text-[var(--ink)]">
      <OnboardingHeader />
      <main className="px-6 py-10 md:py-14">
        <div className="mx-auto grid w-full max-w-[1280px] gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
          <section className="rounded-3xl border border-[var(--border)] bg-[var(--cream)] p-6 shadow-[0_24px_60px_-30px_rgba(15,31,21,0.35)] sm:p-8">
            <div className="mb-7 max-w-2xl">
              <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--accent-soft)] px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--accent-strong)]">
                <Sparkles size={13} />
                Activação imediata
              </span>
              <h1 className="text-[clamp(1.9rem,4vw,2.75rem)] font-extrabold leading-[1.05] tracking-tight">
                Crie a conta da sua escola em poucos minutos.
              </h1>
              <p className="mt-3 max-w-xl text-[1.02rem] leading-[1.7] text-[var(--muted)]">
                Preencha os dados essenciais, confirme o plano mensal e conclua
                o pagamento seguro na Stripe.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="grid gap-4">
              <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                <Field label="Nome da escola">
                  <input
                    className={INPUT_CLASS}
                    name="organization"
                    autoComplete="organization"
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    placeholder="Academia Lisboa"
                    required
                  />
                </Field>

                <Field label="Endereço da escola">
                  <div className="flex h-11 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--cream)] transition focus-within:border-[var(--accent)] focus-within:ring-2 focus-within:ring-[var(--accent-soft)]">
                    <input
                      className="min-w-0 flex-1 px-3 text-sm text-[var(--ink)] outline-none"
                      value={slug}
                      onChange={(e) => setSlug(normalizeSlug(e.target.value))}
                      placeholder="academia-lisboa"
                      required
                    />
                    <span className="flex shrink-0 items-center border-l border-[var(--border-soft)] bg-[var(--paper)] px-3 text-xs font-semibold text-[var(--muted)]">
                      .clubtenispro.com
                    </span>
                  </div>
                  <span
                    className={`text-xs ${
                      slugState?.available
                        ? 'text-[var(--accent-strong)]'
                        : slug && !checking
                          ? 'text-[#914a39]'
                          : 'text-[var(--muted)]'
                    }`}
                  >
                    {slugMessage}
                  </span>
                </Field>
              </div>

              <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                <Field label="Nome do administrador">
                  <input
                    className={INPUT_CLASS}
                    name="name"
                    autoComplete="name"
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    placeholder="Ana Silva"
                    required
                  />
                </Field>

                <Field label="Email de acesso">
                  <input
                    type="email"
                    className={INPUT_CLASS}
                    name="email"
                    autoComplete="email"
                    inputMode="email"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="ana@academia.pt"
                    required
                  />
                </Field>
              </div>

              <Field label="Palavra-passe">
                <input
                  type="password"
                  className={INPUT_CLASS}
                  name="new-password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                  placeholder="Mínimo 8 caracteres"
                  required
                />
              </Field>

              {error && (
                <div className="rounded-xl border border-[rgba(160,74,55,0.2)] bg-[#fcebe7] px-3 py-2 text-sm font-semibold text-[#914a39]">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={!canSubmit}
                className="group mt-2 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[var(--ink)] px-5 text-sm font-bold text-white transition-colors hover:bg-[var(--ink-soft)] disabled:cursor-not-allowed disabled:opacity-45"
              >
                {submitting ? 'A abrir pagamento...' : 'Continuar para pagamento'}
                <ArrowRight
                  size={18}
                  className="transition-transform group-hover:translate-x-0.5"
                />
              </button>
            </form>
          </section>

          <aside className="rounded-3xl border border-[var(--border)] bg-[var(--cream)] p-6 shadow-[0_24px_60px_-30px_rgba(15,31,21,0.35)]">
            <div className="flex items-start justify-between gap-4 border-b border-[var(--border-soft)] pb-5">
              <div>
                <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--accent-strong)]">
                  Plano escolhido
                </p>
                <h2 className="mt-1 text-2xl font-extrabold">Mensal</h2>
              </div>
              <BadgeCheck className="text-[var(--accent-strong)]" size={28} />
            </div>

            <div className="py-6">
              <div className="flex items-end gap-2">
                <span className="text-[2.5rem] font-extrabold leading-none tracking-tight">
                  {formatCurrency(MONTHLY_PRICE_CENTS)}
                </span>
                <span className="pb-1 text-sm font-semibold text-[var(--muted)]">
                  / mês
                </span>
              </div>
              <p className="mt-2 text-sm leading-[1.7] text-[var(--muted)]">
                Cobrança imediata no checkout. A assinatura é criada na Stripe e
                a escola fica activa após confirmação do pagamento.
              </p>
            </div>

            <div className="grid gap-3 border-t border-[var(--border-soft)] pt-5 text-sm">
              <div className="flex items-center gap-3">
                <CreditCard size={18} className="text-[var(--accent-strong)]" />
                Pagamento seguro por Stripe
              </div>
              <div className="flex items-center gap-3">
                <ShieldCheck size={18} className="text-[var(--accent-strong)]" />
                Sem teste grátis e sem custos escondidos
              </div>
              <div className="flex items-center gap-3">
                <LockKeyhole size={18} className="text-[var(--accent-strong)]" />
                Os dados do cartão não passam pela aplicação
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
