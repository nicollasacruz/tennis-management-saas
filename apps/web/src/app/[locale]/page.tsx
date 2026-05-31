import type { Metadata } from 'next';
import { Link } from '@/i18n/navigation';
import { getTranslations } from 'next-intl/server';
import { localeHref, localeToBcp47, SITE_URL, type Locale } from '@/i18n/config';
import {
  Accessibility,
  ArrowRight,
  Building2,
  CalendarCheck,
  Check,
  CreditCard,
  FileText,
  GraduationCap,
  LayoutDashboard,
  MessageCircle,
  Trophy,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { ContactForm } from '@/components/contact-form';
import { LanguageSwitcher } from '@/components/language-switcher';
import { Reveal } from '@/components/reveal';
import { BRAND } from '@/lib/brand';

type TextItem = { titulo: string; texto: string };
type StatItem = { numero: string; texto: string };
type PlanItem = {
  nome: string;
  preco: string;
  periodo: string;
  descricao: string;
  cta: string;
  inclui: string[];
};

const categoriaIcons: LucideIcon[] = [GraduationCap, Building2, Users, Accessibility, Trophy];
const funcIcons: LucideIcon[] = [
  Users,
  CreditCard,
  FileText,
  CalendarCheck,
  MessageCircle,
  LayoutDashboard,
];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });
  const href = localeHref[locale as Locale] ?? '/';
  const canonical = `${SITE_URL}${href === '/' ? '' : href}` || SITE_URL;
  const title = `${BRAND} — ${t('tagline')}`;
  const description = t('description');

  return {
    title,
    description,
    alternates: {
      canonical,
      languages: {
        'pt-PT': `${SITE_URL}/pt`,
        'en-GB': `${SITE_URL}/en`,
        'es-ES': `${SITE_URL}/es`,
        'x-default': `${SITE_URL}/pt`,
      },
    },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: BRAND,
      locale: localeToBcp47[locale as Locale] ?? 'pt-PT',
      type: 'website',
    },
  };
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--ink)]">
      <SiteHeader />
      <main>
        <Hero />
        <StatsStrip />
        <Categorias />
        <Funcionalidades />
        <Precos />
        <DemoCTA />
      </main>
      <SiteFooter />
    </div>
  );
}

function BrandMark({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--accent)] to-[#7fb80a] text-[var(--ink)] shadow-[0_2px_10px_rgba(63,102,7,0.25)] ${className}`}
    >
      <span className="text-[15px] font-black leading-none">TC</span>
    </span>
  );
}

async function SiteHeader() {
  const t = await getTranslations('nav');
  const links = [
    { href: '#categorias', label: t('categorias') },
    { href: '#funcionalidades', label: t('funcionalidades') },
    { href: '#precos', label: t('precos') },
    { href: '#demo', label: t('demo') },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[rgba(247,249,240,0.85)] backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-6">
        <a href="#inicio" className="flex items-center gap-2.5 transition-opacity hover:opacity-80">
          <BrandMark />
          <span className="text-[15px] font-extrabold tracking-tight text-[var(--ink)]">{BRAND}</span>
        </a>
        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-md px-3 py-1.5 text-[13px] font-semibold text-[var(--muted)] transition-colors hover:bg-[var(--accent-soft)] hover:text-[var(--ink)]"
            >
              {l.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <Link
            href="/login"
            className="hidden rounded-lg px-3 py-2 text-[13px] font-semibold text-[var(--muted)] transition-colors hover:bg-[var(--accent-soft)] hover:text-[var(--ink)] sm:inline-flex"
          >
            {t('entrar')}
          </Link>
          <a
            href="#demo"
            className="group inline-flex items-center gap-2 rounded-lg bg-[var(--ink)] px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-[var(--ink-soft)]"
          >
            {t('pedirDemo')}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </a>
        </div>
      </div>
    </header>
  );
}

async function Hero() {
  const t = await getTranslations('hero');
  return (
    <section id="inicio" className="relative overflow-hidden px-6 pt-16 pb-12 md:pt-24 md:pb-20">
      <div className="mx-auto grid max-w-[1280px] items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
        <Reveal className="flex flex-col items-start gap-7">
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--cream)] px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--accent-strong)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
            {t('badge')}
          </span>
          <h1 className="text-[clamp(2.25rem,5vw,3.75rem)] font-extrabold leading-[1.04] tracking-tight text-[var(--ink)]">
            {t('titlePre')}{' '}
            <span className="relative whitespace-nowrap">
              {t('titleHighlight')}
              <span className="absolute -bottom-1 left-0 -z-10 h-3 w-full bg-[var(--accent-soft)]" />
            </span>
            {t('titlePost')}
          </h1>
          <p className="max-w-[52ch] text-[1.05rem] leading-[1.7] text-[var(--muted)]">{t('subtitle')}</p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <a
              href="#demo"
              className="group inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--ink)] px-6 py-3.5 text-[15px] font-bold text-white transition-colors hover:bg-[var(--ink-soft)]"
            >
              {t('ctaPrimary')}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </a>
            <a
              href="#precos"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--cream)] px-6 py-3.5 text-[15px] font-bold text-[var(--ink)] transition-colors hover:border-[#bdd383] hover:bg-[var(--accent-soft)]"
            >
              {t('ctaSecondary')}
            </a>
          </div>
          <p className="font-mono text-[12px] uppercase tracking-[0.12em] text-[var(--muted)]">{t('fineprint')}</p>
        </Reveal>

        <Reveal delay={1}>
          <HeroDashboard />
        </Reveal>
      </div>
    </section>
  );
}

async function HeroDashboard() {
  const t = await getTranslations('dashboard');
  const tiles = [
    { label: t('recebido'), valor: '€4.820' },
    { label: t('alunosAtivos'), valor: '128' },
    { label: t('cobranca'), valor: '94%' },
  ];
  return (
    <div className="relative">
      <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-[radial-gradient(circle_at_70%_20%,rgba(168,226,32,0.22),transparent_60%)]" />
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--cream)] p-5 shadow-[0_24px_60px_-30px_rgba(15,31,21,0.35)]">
        <div className="flex items-center justify-between border-b border-[var(--border-soft)] pb-4">
          <div className="flex items-center gap-2.5">
            <BrandMark className="h-8 w-8" />
            <div className="flex flex-col leading-tight">
              <span className="text-[13px] font-bold text-[var(--ink)]">{t('org')}</span>
              <span className="text-[11px] text-[var(--muted)]">{t('label')}</span>
            </div>
          </div>
          <span className="rounded-full bg-[var(--accent-soft)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[var(--accent-strong)]">
            {t('live')}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3">
          {tiles.map((s) => (
            <div key={s.label} className="rounded-xl border border-[var(--border-soft)] bg-[var(--paper)] p-3">
              <div className="text-[11px] font-semibold text-[var(--muted)]">{s.label}</div>
              <div className="mt-1 text-[18px] font-extrabold text-[var(--ink)]">{s.valor}</div>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-xl border border-[var(--border-soft)] bg-[var(--paper)] p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[12px] font-semibold text-[var(--ink)]">{t('receitaMensal')}</span>
            <span className="font-mono text-[11px] text-[var(--muted)]">2026</span>
          </div>
          <div className="flex h-24 items-end gap-2">
            {[42, 55, 48, 67, 60, 80, 72, 90].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-t-md bg-gradient-to-t from-[#bfe46a] to-[var(--accent)]"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </div>

        <div className="mt-3 flex items-center gap-3 rounded-xl border border-[var(--border-soft)] bg-white p-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent-strong)]">
            <MessageCircle className="h-4 w-4" />
          </span>
          <div className="flex flex-col leading-tight">
            <span className="text-[12px] font-semibold text-[var(--ink)]">{t('toastTitle')}</span>
            <span className="text-[11px] text-[var(--muted)]">{t('toastSub')}</span>
          </div>
          <Check className="ml-auto h-4 w-4 text-[var(--accent-strong)]" />
        </div>
      </div>
    </div>
  );
}

async function StatsStrip() {
  const t = await getTranslations('stats');
  const items = t.raw('items') as StatItem[];
  return (
    <section className="px-6 pb-4">
      <Reveal className="mx-auto grid max-w-[1280px] gap-4 rounded-2xl border border-[var(--border)] bg-[var(--cream)] p-6 sm:grid-cols-3">
        {items.map((s) => (
          <div key={s.texto} className="flex flex-col items-center gap-1 text-center">
            <span className="text-[1.75rem] font-extrabold tracking-tight text-[var(--ink)]">{s.numero}</span>
            <span className="text-[13px] text-[var(--muted)]">{s.texto}</span>
          </div>
        ))}
      </Reveal>
    </section>
  );
}

function SectionHeading({ eyebrow, titulo, texto }: { eyebrow: string; titulo: string; texto?: string }) {
  return (
    <Reveal className="mx-auto flex max-w-[680px] flex-col items-center gap-3 text-center">
      <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
        {eyebrow}
      </span>
      <h2 className="text-[clamp(1.75rem,3.5vw,2.5rem)] font-extrabold leading-tight tracking-tight text-[var(--ink)]">
        {titulo}
      </h2>
      {texto && <p className="text-[1.02rem] leading-[1.7] text-[var(--muted)]">{texto}</p>}
    </Reveal>
  );
}

async function Categorias() {
  const t = await getTranslations('categorias');
  const items = t.raw('items') as TextItem[];
  return (
    <section id="categorias" className="scroll-mt-20 px-6 py-16 md:py-24">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-12">
        <SectionHeading eyebrow={t('eyebrow')} titulo={t('titulo')} texto={t('texto')} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((c, i) => {
            const Icon = categoriaIcons[i] ?? GraduationCap;
            return (
              <Reveal
                key={c.titulo}
                delay={(i % 3) as 0 | 1 | 2}
                className="group flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--cream)] p-6 transition-all hover:-translate-y-1 hover:border-[#bdd383] hover:shadow-[0_18px_40px_-28px_rgba(15,31,21,0.4)]"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent-strong)] transition-colors group-hover:bg-[var(--accent)] group-hover:text-[var(--ink)]">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="text-[1.05rem] font-bold text-[var(--ink)]">{c.titulo}</h3>
                <p className="text-[14px] leading-[1.6] text-[var(--muted)]">{c.texto}</p>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

async function Funcionalidades() {
  const t = await getTranslations('funcionalidades');
  const items = t.raw('items') as TextItem[];
  return (
    <section id="funcionalidades" className="scroll-mt-20 bg-[var(--paper)] px-6 py-16 md:py-24">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-12">
        <SectionHeading eyebrow={t('eyebrow')} titulo={t('titulo')} texto={t('texto')} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((f, i) => {
            const Icon = funcIcons[i] ?? Users;
            return (
              <Reveal
                key={f.titulo}
                delay={(i % 3) as 0 | 1 | 2}
                className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--cream)] p-6"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--ink)] text-[var(--accent)]">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="text-[1.05rem] font-bold text-[var(--ink)]">{f.titulo}</h3>
                <p className="text-[14px] leading-[1.6] text-[var(--muted)]">{f.texto}</p>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

async function Precos() {
  const t = await getTranslations('precos');
  const planos = t.raw('items') as PlanItem[];
  return (
    <section id="precos" className="scroll-mt-20 px-6 py-16 md:py-24">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-12">
        <SectionHeading eyebrow={t('eyebrow')} titulo={t('titulo')} texto={t('texto')} />
        <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-3">
          {planos.map((p, i) => {
            const destaque = i === 1;
            return (
              <Reveal
                key={p.nome}
                delay={(i % 3) as 0 | 1 | 2}
                className={`relative flex flex-col gap-6 rounded-3xl border p-7 ${
                  destaque
                    ? 'border-transparent bg-[var(--ink)] text-white shadow-[0_28px_60px_-30px_rgba(15,31,21,0.6)] ring-2 ring-[var(--accent)] lg:-mt-3 lg:mb-3'
                    : 'border-[var(--border)] bg-[var(--cream)] text-[var(--ink)]'
                }`}
              >
                {destaque && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[var(--accent)] px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-[var(--ink)]">
                    {t('popular')}
                  </span>
                )}
                <div className="flex flex-col gap-2">
                  <span className={`text-[13px] font-bold uppercase tracking-[0.14em] ${destaque ? 'text-[var(--accent)]' : 'text-[var(--accent-strong)]'}`}>
                    {p.nome}
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-[2.5rem] font-extrabold leading-none tracking-tight">{p.preco}</span>
                    {p.periodo && (
                      <span className={`text-[14px] font-semibold ${destaque ? 'text-white/60' : 'text-[var(--muted)]'}`}>
                        {p.periodo}
                      </span>
                    )}
                  </div>
                  <p className={`text-[14px] ${destaque ? 'text-white/70' : 'text-[var(--muted)]'}`}>{p.descricao}</p>
                </div>

                <ul className="flex flex-col gap-3">
                  {p.inclui.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-[14px]">
                      <Check className={`mt-0.5 h-4 w-4 flex-shrink-0 ${destaque ? 'text-[var(--accent)]' : 'text-[var(--accent-strong)]'}`} />
                      <span className={destaque ? 'text-white/90' : 'text-[var(--ink)]'}>{item}</span>
                    </li>
                  ))}
                </ul>

                <a
                  href="#demo"
                  className={`mt-auto inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-[14px] font-bold transition-colors ${
                    destaque
                      ? 'bg-[var(--accent)] text-[var(--ink)] hover:bg-[#bfe46a]'
                      : 'bg-[var(--ink)] text-white hover:bg-[var(--ink-soft)]'
                  }`}
                >
                  {p.cta}
                  <ArrowRight className="h-4 w-4" />
                </a>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

async function DemoCTA() {
  const t = await getTranslations('demo');
  const bullets = t.raw('bullets') as string[];
  return (
    <section id="demo" className="scroll-mt-20 bg-[var(--paper)] px-6 py-16 md:py-24">
      <div className="mx-auto grid max-w-[1280px] items-start gap-12 lg:grid-cols-[1fr_1.1fr]">
        <Reveal className="flex flex-col gap-5">
          <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
            {t('eyebrow')}
          </span>
          <h2 className="text-[clamp(1.75rem,3.5vw,2.5rem)] font-extrabold leading-tight tracking-tight text-[var(--ink)]">
            {t('titulo', { brand: BRAND })}
          </h2>
          <p className="max-w-[46ch] text-[1.02rem] leading-[1.7] text-[var(--muted)]">{t('texto')}</p>
          <ul className="flex flex-col gap-3 pt-2">
            {bullets.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-[14px] text-[var(--ink)]">
                <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--accent-strong)]" />
                {item}
              </li>
            ))}
          </ul>
        </Reveal>
        <Reveal delay={1}>
          <ContactForm />
        </Reveal>
      </div>
    </section>
  );
}

async function SiteFooter() {
  const tn = await getTranslations('nav');
  const t = await getTranslations('footer');
  const links = [
    { href: '#categorias', label: tn('categorias') },
    { href: '#funcionalidades', label: tn('funcionalidades') },
    { href: '#precos', label: tn('precos') },
    { href: '#demo', label: tn('demo') },
  ];

  return (
    <footer className="border-t border-[var(--border)] bg-[var(--ink)] px-6 py-16 text-white/80">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-12">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-[1.5fr_1fr_1fr]">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2.5">
              <BrandMark />
              <span className="text-[15px] font-extrabold tracking-tight text-white">{BRAND}</span>
            </div>
            <p className="max-w-[42ch] text-[14px] leading-[1.6] text-white/60">{t('desc')}</p>
          </div>
          <div className="flex flex-col gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">{t('produto')}</span>
            <ul className="flex flex-col gap-2 text-[14px]">
              {links.map((l) => (
                <li key={l.href}>
                  <a href={l.href} className="transition-colors hover:text-[var(--accent)]">
                    {l.label}
                  </a>
                </li>
              ))}
              <li>
                <Link href="/login" className="transition-colors hover:text-[var(--accent)]">
                  {tn('entrar')}
                </Link>
              </li>
            </ul>
          </div>
          <div className="flex flex-col gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">{t('contacto')}</span>
            <ul className="flex flex-col gap-2 text-[14px]">
              <li>
                <a href="mailto:ola@tenisclubepro.com" className="hover:text-[var(--accent)]">
                  ola@tenisclubepro.com
                </a>
              </li>
              <li className="text-white/60">{t('resposta')}</li>
            </ul>
          </div>
        </div>
        <div className="flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 text-[12px] text-white/60 md:flex-row">
          <span>
            © {new Date().getFullYear()} {BRAND}. {t('rights')}
          </span>
          <div className="flex items-center gap-4">
            <span className="font-mono uppercase tracking-[0.12em]">{t('slogan')}</span>
            <LanguageSwitcher />
          </div>
        </div>
      </div>
    </footer>
  );
}
