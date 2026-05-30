import type { Metadata } from 'next';
import Link from 'next/link';
import { ContactForm } from '@/components/contact-form';
import { Reveal } from '@/components/reveal';
import { ESAF_LOGO } from '@/lib/utils';
import type { Activity } from '@/types';

export const metadata: Metadata = {
  title: 'Clube de Ténis ESAF — Raízes na escola. Futuro no ténis.',
  description:
    'Clube de Ténis ESAF, em Barcelos. Desde 2016, formação, competição e ténis adaptado para toda a comunidade.',
};

const valores = [
  {
    titulo: 'Inclusão',
    texto:
      'Acreditamos que o ténis é para todos. Desde o ténis convencional até às modalidades adaptadas — incluindo o ténis em cadeira de rodas — trabalhamos todos os dias para eliminar barreiras e criar oportunidades.',
  },
  {
    titulo: 'Formação',
    texto:
      'A formação de base é a nossa identidade. Com escolinhas para os mais novos e programas de desenvolvimento juvenil, preparamos os atletas do futuro com rigor técnico e valores humanos.',
  },
  {
    titulo: 'Competição',
    texto:
      'Organizamos e participamos em competições de referência, como o Barcelos Open e os Torneios Juvenis ESAF, proporcionando aos nossos atletas o palco para crescer.',
  },
  {
    titulo: 'Comunidade',
    texto:
      'Estamos enraizados em Barcelos. A parceria com a Escola Secundária Alcaides de Faria e o Município de Barcelos fortalece uma rede desportiva que beneficia toda a região.',
  },
];

const estatisticas = [
  { numero: '4', texto: 'courts de ténis' },
  { numero: '+10', texto: 'torneios por ano' },
  { numero: 'N° 1', texto: 'referência em ténis adaptado em Barcelos' },
];

const modalidades = [
  {
    eyebrow: '01 · Adultos & jovens',
    titulo: 'Ténis Convencional',
    descricao:
      'Para todos os níveis — desde a iniciação absoluta até à competição federada. Aulas que privilegiam a técnica individual, a tática de jogo e o condicionamento físico, num ambiente descontraído mas exigente.',
    tags: ['Aulas individuais', 'Grupo', 'Competição'],
    imagem: '/images/jogador.jpg',
  },
  {
    eyebrow: '02 · Inclusão desportiva',
    titulo: 'Ténis Adaptado e Cadeira de Rodas',
    descricao:
      'Pioneiros em Barcelos. Programa para atletas com deficiência motriz, com treinos especializados e integração em competições paralímpicas. Atletas como Nuno Vale e Alexandrino “Alex” Silva representam o orgulho desta modalidade.',
    tags: ['Sem barreiras', 'Treinos regulares', 'Competição'],
    imagem: '/images/adaptado-courts.jpg',
  },
  {
    eyebrow: '03 · Crianças',
    titulo: 'Escolinhas e Formação Juvenil',
    descricao:
      'A base do nosso clube. Recebemos crianças e jovens desde tenra idade, ensinando os fundamentos do ténis através de métodos lúdicos e progressivos. Despertar o gosto pelo desporto enquanto se constroem bases técnicas sólidas.',
    tags: ['Iniciação', 'Desenvolvimento', 'Torneios internos'],
    imagem: '/images/escolinhas-1.jpg',
  },
];

const galeria = [
  { src: '/images/escolinhas-2.jpg', legenda: 'Vista geral dos courts', span: 'col-span-2 row-span-2' },
  { src: '/images/jogador.jpg', legenda: 'Treino convencional', span: 'col-span-1 row-span-1' },
  { src: '/images/adaptado-courts.jpg', legenda: 'Equipa adaptada', span: 'col-span-1 row-span-1' },
  { src: '/images/escolinhas-1.jpg', legenda: 'Atletas juvenis', span: 'col-span-2 row-span-1' },
  { src: '/images/adaptado-torneio.jpg', legenda: 'Torneio nacional indoor', span: 'col-span-2 row-span-1' },
];

const navLinks = [
  { href: '#clube', label: 'O Clube' },
  { href: '#modalidades', label: 'Modalidades' },
  { href: '#instalacoes', label: 'Instalações' },
  { href: '#competicoes', label: 'Competições' },
  { href: '#contactos', label: 'Contactos' },
];

const API_URL = process.env.API_BASE_URL || 'http://localhost:3000';

const MESES_ABREV = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
];

type EventoUI = {
  dia: string;
  mes: string;
  titulo: string;
  categoria: string;
  descricao: string;
};

function atividadeParaEvento(a: Activity): EventoUI {
  const inicio = new Date(a.startDate);
  const diaInicio = inicio.getUTCDate();
  const mesAbrev = MESES_ABREV[inicio.getUTCMonth()];

  if (a.endDate) {
    const fim = new Date(a.endDate);
    const diaFim = fim.getUTCDate();
    if (diaFim !== diaInicio) {
      return {
        dia: `${diaInicio}–${diaFim}`,
        mes: mesAbrev,
        titulo: a.title,
        categoria: a.category,
        descricao: a.description,
      };
    }
  }

  return {
    dia: mesAbrev,
    mes: String(inicio.getUTCFullYear()),
    titulo: a.title,
    categoria: a.category,
    descricao: a.description,
  };
}

export default async function HomePage() {
  let atividades: Activity[] = [];
  try {
    const res = await fetch(`${API_URL}/api/activities/public`, {
      cache: 'no-store',
    });
    if (res.ok) {
      atividades = await res.json();
    }
  } catch {
    // API indisponível — secção de competições fica vazia
  }

  const eventos = atividades.map(atividadeParaEvento);
  return (
    <div className="flex min-h-screen flex-col bg-[var(--paper)] text-[var(--ink)]">
      <SiteHeader />

      <main className="flex-1">
        <Hero />
        <Stats />
        <SobreOClube />
        <Modalidades />
        <Instalacoes />
        <Competicoes eventos={eventos} />
        <Contactos />
      </main>

      <SiteFooter />
    </div>
  );
}

function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[rgba(247,249,240,0.85)] backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-6">
        <Link href="#inicio" className="flex items-center gap-3 transition-opacity hover:opacity-80">
          <img
            src={ESAF_LOGO}
            alt="Clube de Ténis ESAF"
            className="h-9 w-9 rounded-lg border border-[var(--border)] bg-white/70 p-0.5"
          />
          <span className="text-[15px] font-extrabold tracking-tight text-[var(--ink)]">
            Clube de Ténis ESAF
          </span>
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-md px-3 py-1.5 text-[13px] font-semibold text-[var(--muted)] transition-colors hover:bg-[var(--accent-soft)] hover:text-[var(--ink)]"
            >
              {l.label}
            </a>
          ))}
        </nav>
        <Link
          href="/login"
          className="group inline-flex items-center gap-2 rounded-lg bg-[var(--ink)] px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-[var(--ink-soft)]"
        >
          Área Reservada
          <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
            →
          </span>
        </Link>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section
      id="inicio"
      className="relative isolate overflow-hidden px-6 pt-24 pb-32 md:pt-32 md:pb-40"
    >
      <div
        className="absolute inset-0 -z-20 bg-cover bg-center"
        style={{ backgroundImage: 'url(/images/escolinhas-2.jpg)' }}
        aria-hidden
      />
      <div
        className="absolute inset-0 -z-10"
        style={{
          background:
            'linear-gradient(180deg, rgba(15,31,21,0.55) 0%, rgba(15,31,21,0.78) 60%, rgba(15,31,21,0.92) 100%)',
        }}
        aria-hidden
      />

      <div className="mx-auto max-w-[1100px]">
        <Reveal className="flex flex-col items-start gap-8 text-white">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)] backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
            Barcelos · desde 2016
          </span>
          <h1 className="max-w-[18ch] text-[44px] font-extrabold leading-[1.02] tracking-[-0.02em] md:text-[80px]">
            Raízes na escola.
            <br />
            <span className="text-[var(--accent)]">Futuro no ténis.</span>
          </h1>
          <p className="max-w-[58ch] text-[17px] leading-[1.55] text-white/80 md:text-[20px]">
            No coração de Barcelos, o Clube de Ténis ESAF é mais do que uma escola: uma comunidade
            onde tradição encontra inovação, e onde cada raquete carrega o sonho de quem a segura.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <a
              href="#contactos"
              className="group inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-6 py-3.5 text-[15px] font-bold text-[var(--ink)] transition-all duration-150 hover:bg-white hover:shadow-lg hover:shadow-[var(--accent)]/20"
            >
              Inscreve-te agora
              <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
                →
              </span>
            </a>
            <a
              href="#clube"
              className="inline-flex items-center gap-2 rounded-xl border border-white/30 px-6 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-white/10"
            >
              Conhece o clube
            </a>
          </div>
        </Reveal>
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/80">
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em]">Scroll ↓</span>
      </div>
    </section>
  );
}

function Stats() {
  return (
    <section className="border-y border-[var(--border)] bg-[var(--cream)]">
      <div className="mx-auto grid max-w-[1280px] grid-cols-1 divide-y divide-[var(--border)] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {estatisticas.map((s, i) => (
          <Reveal
            key={s.texto}
            delay={(i + 1) as 1 | 2 | 3}
            className="flex items-baseline gap-4 px-8 py-10"
          >
            <span className="font-mono text-[13px] font-medium text-[var(--muted)]">
              0{i + 1}
            </span>
            <div className="flex flex-col gap-1">
              <span className="text-[44px] font-extrabold leading-none tracking-[-0.02em] text-[var(--ink)]">
                {s.numero}
              </span>
              <span className="text-[14px] text-[var(--muted)]">{s.texto}</span>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function SectionHeading({
  eyebrow,
  titulo,
  descricao,
  align = 'left',
}: {
  eyebrow: string;
  titulo: string;
  descricao?: string;
  align?: 'left' | 'center';
}) {
  return (
    <Reveal
      className={`flex max-w-[720px] flex-col gap-4 ${align === 'center' ? 'mx-auto items-center text-center' : ''}`}
    >
      <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
        <span className="h-px w-8 bg-[var(--accent-strong)]" />
        {eyebrow}
      </span>
      <h2 className="text-[36px] font-extrabold leading-[1.05] tracking-[-0.02em] text-[var(--ink)] md:text-[52px]">
        {titulo}
      </h2>
      {descricao ? (
        <p className="text-[17px] leading-[1.55] text-[var(--muted)]">{descricao}</p>
      ) : null}
    </Reveal>
  );
}

function SobreOClube() {
  return (
    <section id="clube" className="px-6 py-24 md:py-32">
      <div className="mx-auto flex max-w-[1100px] flex-col gap-16">
        <SectionHeading
          eyebrow="O Clube"
          titulo="Uma história ligada à Escola Secundária Alcaides de Faria"
          descricao="Nascemos no seio da escola, em Barcelos, fruto de uma visão partilhada entre educação e desporto. Hoje, somos uma associação reconhecida pelo Município de Barcelos, com contrato-programa que consolida a missão de levar o ténis a toda a comunidade."
        />

        <Reveal delay={1} className="rounded-3xl border border-[var(--border)] bg-[var(--cream)] p-10 md:p-14">
          <span className="font-mono text-[12px] font-medium uppercase tracking-[0.16em] text-[var(--accent-strong)]">
            Missão
          </span>
          <blockquote className="mt-4 text-[24px] font-semibold leading-[1.35] tracking-[-0.01em] text-[var(--ink)] md:text-[32px]">
            “Promover o ténis como ferramenta de desenvolvimento pessoal, inclusão social e
            excelência desportiva — formando atletas responsáveis, cidadãos ativos e apaixonados
            pelo jogo.”
          </blockquote>
        </Reveal>

        <div>
          <Reveal className="mb-8 flex items-baseline justify-between gap-4">
            <h3 className="text-[22px] font-bold tracking-[-0.01em]">Os nossos valores</h3>
            <span className="font-mono text-[12px] text-[var(--muted)]">04 / pilares</span>
          </Reveal>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {valores.map((v, i) => (
              <Reveal
                key={v.titulo}
                delay={((i % 4) + 1) as 1 | 2 | 3 | 4}
                className="group flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--cream)] p-6 transition-all duration-150 hover:-translate-y-0.5 hover:border-[var(--accent-strong)]/40 hover:shadow-md hover:shadow-[var(--ink)]/5"
              >
                <span className="font-mono text-[11px] font-medium text-[var(--muted)]">
                  0{i + 1}
                </span>
                <h4 className="text-[18px] font-bold tracking-[-0.01em] text-[var(--ink)]">
                  {v.titulo}
                </h4>
                <p className="text-[14px] leading-[1.55] text-[var(--muted)]">{v.texto}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Modalidades() {
  return (
    <section id="modalidades" className="bg-[var(--ink)] px-6 py-24 text-white md:py-32">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-16">
        <Reveal className="flex max-w-[720px] flex-col gap-4">
          <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
            <span className="h-px w-8 bg-[var(--accent)]" />
            Modalidades
          </span>
          <h2 className="text-[36px] font-extrabold leading-[1.05] tracking-[-0.02em] md:text-[52px]">
            Ténis para todos.
            <br />
            Em todos os formatos.
          </h2>
        </Reveal>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {modalidades.map((m, i) => (
            <Reveal
              key={m.titulo}
              delay={((i % 3) + 1) as 1 | 2 | 3}
              className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/5 transition-all duration-150 hover:-translate-y-1 hover:border-[var(--accent)]/40 hover:bg-white/[0.07]"
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden">
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                  style={{ backgroundImage: `url(${m.imagem})` }}
                  aria-hidden
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--ink)]/60 via-transparent to-transparent" />
                <span className="absolute left-4 top-4 rounded-full bg-[var(--ink)]/80 px-3 py-1 font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--accent)] backdrop-blur">
                  {m.eyebrow}
                </span>
              </div>
              <div className="flex flex-1 flex-col gap-4 p-7">
                <h3 className="text-[22px] font-bold tracking-[-0.01em]">{m.titulo}</h3>
                <p className="text-[14px] leading-[1.6] text-white/70">{m.descricao}</p>
                <ul className="mt-auto flex flex-wrap gap-1.5 pt-2">
                  {m.tags.map((tag) => (
                    <li
                      key={tag}
                      className="rounded-full border border-white/15 px-3 py-1 text-[11px] font-medium text-white/80"
                    >
                      {tag}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal className="flex justify-center">
          <a
            href="#contactos"
            className="group inline-flex items-center gap-2 rounded-xl border border-[var(--accent)]/40 px-6 py-3.5 text-[15px] font-semibold text-[var(--accent)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--ink)]"
          >
            Consulta horários das escolinhas
            <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
              →
            </span>
          </a>
        </Reveal>
      </div>
    </section>
  );
}

function Instalacoes() {
  const features = [
    { titulo: 'Courts ao ar livre', texto: 'Superfície dura, condições de competição.' },
    { titulo: 'Apoio integrado', texto: 'Balneários e zona de convívio na escola.' },
    { titulo: 'Acessibilidade', texto: 'Para atletas de mobilidade condicionada.' },
    { titulo: 'Base formativa', texto: 'Classificação municipal IDBF.' },
  ];

  return (
    <section id="instalacoes" className="px-6 py-24 md:py-32">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-16">
        <SectionHeading
          eyebrow="Instalações"
          titulo="Courts ao ar livre, no coração da ESAF"
          descricao="Localização central em Barcelos, no recinto da Escola Secundária Alcaides de Faria. Um ambiente onde o verde das árvores se cruza com a energia desportiva da escola."
        />

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_1.4fr]">
          <Reveal className="flex flex-col gap-3">
            {features.map((f, i) => (
              <div
                key={f.titulo}
                className="flex items-start gap-4 rounded-xl border border-[var(--border)] bg-[var(--cream)] p-5 transition-colors hover:border-[var(--accent-strong)]/40"
              >
                <span className="font-mono text-[12px] font-medium text-[var(--accent-strong)]">
                  0{i + 1}
                </span>
                <div className="flex flex-col gap-1">
                  <h4 className="text-[15px] font-bold tracking-[-0.01em]">{f.titulo}</h4>
                  <p className="text-[13px] text-[var(--muted)]">{f.texto}</p>
                </div>
              </div>
            ))}
          </Reveal>

          <Reveal delay={1} className="grid grid-cols-3 grid-rows-3 gap-3 [grid-auto-flow:dense]">
            {galeria.map((g) => (
              <figure
                key={g.src}
                className={`group relative overflow-hidden rounded-xl border border-[var(--border)] ${g.span}`}
              >
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                  style={{ backgroundImage: `url(${g.src})` }}
                  aria-hidden
                />
                <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[var(--ink)]/85 via-[var(--ink)]/40 to-transparent p-4 text-[12px] font-medium text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  {g.legenda}
                </figcaption>
              </figure>
            ))}
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function Competicoes({ eventos }: { eventos: EventoUI[] }) {
  return (
    <section id="competicoes" className="border-t border-[var(--border)] bg-[var(--cream)] px-6 py-24 md:py-32">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-16">
        <SectionHeading
          eyebrow="Competições"
          titulo="O palco do ténis barcelense"
          descricao="Não formamos apenas atletas — criamos oportunidades para que brilhem. Promovemos e acolhemos competições que movimentam o ténis regional e nacional."
        />

        <div className="flex flex-col divide-y divide-[var(--border)] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--paper)]">
          {eventos.map((e, i) => (
            <Reveal
              key={e.titulo}
              delay={((i % 3) + 1) as 1 | 2 | 3}
              className="group grid grid-cols-1 items-center gap-6 px-6 py-8 transition-colors hover:bg-[var(--accent-soft)]/50 md:grid-cols-[160px_1fr_120px_auto] md:px-10"
            >
              <div className="flex items-baseline gap-2">
                <span className="text-[28px] font-extrabold leading-none tracking-[-0.02em] text-[var(--ink)]">
                  {e.dia}
                </span>
                <span className="font-mono text-[12px] font-medium uppercase tracking-[0.12em] text-[var(--muted)]">
                  {e.mes}
                </span>
              </div>
              <div className="flex flex-col gap-1.5">
                <h3 className="text-[18px] font-bold tracking-[-0.01em] text-[var(--ink)]">
                  {e.titulo}
                </h3>
                <p className="max-w-[60ch] text-[14px] leading-[1.5] text-[var(--muted)]">
                  {e.descricao}
                </p>
              </div>
              <span className="inline-flex w-fit items-center rounded-full border border-[var(--border)] bg-[var(--cream)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--accent-strong)]">
                {e.categoria}
              </span>
              <span
                aria-hidden
                className="text-[20px] text-[var(--muted)] transition-all group-hover:translate-x-1 group-hover:text-[var(--ink)]"
              >
                →
              </span>
            </Reveal>
          ))}
        </div>

        <Reveal className="flex flex-wrap items-center justify-center gap-3">
          <a
            href="#contactos"
            className="group inline-flex items-center gap-2 rounded-xl bg-[var(--ink)] px-6 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-[var(--ink-soft)]"
          >
            Inscreve-te num evento
            <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
              →
            </span>
          </a>
          <a
            href="#contactos"
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-6 py-3.5 text-[15px] font-semibold text-[var(--ink)] transition-colors hover:border-[var(--ink)]"
          >
            Consulta o regulamento
          </a>
        </Reveal>
      </div>
    </section>
  );
}

function Contactos() {
  return (
    <section id="contactos" className="px-6 py-24 md:py-32">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-16">
        <SectionHeading
          eyebrow="Contactos"
          titulo="Junta-te à família ESAF"
          descricao="Estamos à tua espera — principiante curioso, competidor experiente, ou um familiar à procura da melhor atividade para o teu filho."
        />

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_1.3fr]">
          <Reveal className="flex flex-col gap-4">
            <InfoCard
              eyebrow="01 · Localização"
              titulo="Escola Secundária Alcaides de Faria"
            >
              Av. João Duarte, 405
              <br />
              4750-175 Barcelos, Portugal
              <br />
              <span className="mt-2 inline-block text-[12px] italic text-[var(--muted)]">
                Courts no interior do recinto, acesso pela entrada principal.
              </span>
            </InfoCard>
            <InfoCard eyebrow="02 · Horário de Secretaria" titulo="Quando estamos abertos">
              Seg–Sex · 18h00 – 21h00
              <br />
              Sábado · 09h00 – 13h00
              <br />
              Domingo · Encerrado
            </InfoCard>
            <InfoCard eyebrow="03 · Contactos diretos" titulo="Fala connosco">
              <a
                href="tel:+351919519732"
                className="flex items-center justify-between border-b border-[var(--border)] py-2 transition-colors hover:text-[var(--accent-strong)]"
              >
                <span className="text-[12px] uppercase tracking-[0.1em] text-[var(--muted)]">
                  Telemóvel
                </span>
                <span className="font-mono text-[14px] font-semibold">919 519 732</span>
              </a>
              <a
                href="https://wa.me/351919519732"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between border-b border-[var(--border)] py-2 transition-colors hover:text-[var(--accent-strong)]"
              >
                <span className="text-[12px] uppercase tracking-[0.1em] text-[var(--muted)]">
                  WhatsApp
                </span>
                <span className="font-mono text-[14px] font-semibold">+351 919 519 732</span>
              </a>
              <a
                href="mailto:clubetenisesaf@gmail.com"
                className="flex items-center justify-between py-2 transition-colors hover:text-[var(--accent-strong)]"
              >
                <span className="text-[12px] uppercase tracking-[0.1em] text-[var(--muted)]">
                  Email
                </span>
                <span className="font-mono text-[13px] font-semibold">clubetenisesaf@gmail.com</span>
              </a>
            </InfoCard>
          </Reveal>

          <Reveal delay={1} className="flex flex-col gap-4">
            <div className="flex items-baseline justify-between">
              <h3 className="text-[22px] font-bold tracking-[-0.01em]">Pedido de inscrição</h3>
              <span className="font-mono text-[12px] text-[var(--muted)]">resposta &lt; 48h</span>
            </div>
            <ContactForm />
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function InfoCard({
  eyebrow,
  titulo,
  children,
}: {
  eyebrow: string;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-[var(--border)] bg-[var(--cream)] p-6 transition-colors hover:border-[var(--accent-strong)]/40">
      <span className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--accent-strong)]">
        {eyebrow}
      </span>
      <h4 className="text-[16px] font-bold tracking-[-0.01em] text-[var(--ink)]">{titulo}</h4>
      <div className="text-[14px] leading-[1.6] text-[var(--muted)]">{children}</div>
    </div>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-[var(--border)] bg-[var(--ink)] px-6 py-16 text-white/80">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-12">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-[1.5fr_1fr_1fr]">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <img
                src={ESAF_LOGO}
                alt=""
                className="h-9 w-9 rounded-lg border border-white/10 bg-white/5 p-0.5"
              />
              <span className="text-[15px] font-extrabold tracking-tight text-white">
                Clube de Ténis ESAF
              </span>
            </div>
            <p className="max-w-[40ch] text-[14px] leading-[1.6] text-white/60">
              Desde 2016, em Barcelos. Formação, competição e ténis adaptado para toda a comunidade.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">
              Navegação
            </span>
            <ul className="flex flex-col gap-2 text-[14px]">
              {navLinks.map((l) => (
                <li key={l.href}>
                  <a href={l.href} className="transition-colors hover:text-[var(--accent)]">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">
              Contacto
            </span>
            <ul className="flex flex-col gap-2 text-[14px]">
              <li>
                <a href="tel:+351919519732" className="hover:text-[var(--accent)]">
                  919 519 732
                </a>
              </li>
              <li>
                <a href="mailto:clubetenisesaf@gmail.com" className="hover:text-[var(--accent)]">
                  clubetenisesaf@gmail.com
                </a>
              </li>
              <li className="text-white/60">Av. João Duarte, 405 · 4750-175 Barcelos</li>
            </ul>
          </div>
        </div>
        <div className="flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 text-[12px] text-white/60 md:flex-row">
          <span>
            © {new Date().getFullYear()} Clube de Ténis ESAF. Todos os direitos reservados.
          </span>
          <span className="font-mono uppercase tracking-[0.12em]">
            “Cada ponto é uma nova oportunidade.”
          </span>
        </div>
      </div>
    </footer>
  );
}
