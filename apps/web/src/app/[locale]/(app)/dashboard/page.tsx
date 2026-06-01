'use client';

import React from 'react';
import { Link } from '@/i18n/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import {
  DashboardAgingBucket,
  DashboardSummary,
  DashboardYearly,
  PaymentMethod,
} from '@/types';
import {
  Users,
  Receipt,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Percent,
  CircleDollarSign,
  UserPlus,
  UserMinus,
  Minus,
  Info,
} from 'lucide-react';

const PALETTE = ['#97ce2a', '#bdd383', '#4c5f2e', '#8d5c10', '#566857', '#183223'];

const METHOD_LABEL: Record<PaymentMethod, string> = {
  MBWAY: 'MB WAY',
  CASH: 'Numerário',
  BANK_TRANSFER: 'Transferência',
  CARD: 'Cartão',
};

function HelpTip({ text }: { text: string }) {
  return (
    <span
      tabIndex={0}
      role="button"
      aria-label={text}
      title={text}
      className="relative inline-flex items-center group outline-none cursor-help"
    >
      <Info className="w-3.5 h-3.5 text-[#566857] hover:text-[#183223] transition-colors" />
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 z-20 w-56 px-2.5 py-2 rounded-md bg-[#183223] text-white text-xs leading-snug shadow-lg opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity normal-case font-normal tracking-normal"
      >
        {text}
      </span>
    </span>
  );
}

function formatPct(p: number): string {
  if (!isFinite(p)) return '—';
  const sign = p > 0 ? '+' : '';
  return `${sign}${(p * 100).toFixed(1)}%`;
}

function GrowthBadge({ pct }: { pct: number }) {
  const Icon = pct > 0.0001 ? TrendingUp : pct < -0.0001 ? TrendingDown : Minus;
  const tone =
    pct > 0.0001
      ? 'bg-[#eaf5d3] text-[#4c5f2e] border-[#bdd383]'
      : pct < -0.0001
        ? 'bg-[#fbe9d6] text-[#8d5c10] border-[#e6c79a]'
        : 'bg-[#eef3df] text-[#566857] border-[#d9e5c1]';
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-semibold ${tone}`}
    >
      <Icon className="w-3 h-3" />
      {formatPct(pct)}
    </span>
  );
}

function GrowthRow({
  label,
  current,
  previous,
  pct,
  formatter,
  hint,
}: {
  label: string;
  current: string;
  previous: string;
  pct: number;
  formatter?: string;
  hint?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2 p-3 rounded-lg bg-white/60 border border-[#d9e5c1]">
      <div className="flex flex-col min-w-0 flex-1">
        <span className="text-[0.7rem] uppercase font-bold tracking-wider text-[#566857] flex items-center gap-1.5">
          {label}
          {hint && <HelpTip text={hint} />}
        </span>
        <span className="text-sm sm:text-base font-semibold text-[#183223] flex flex-wrap items-baseline gap-x-1.5">
          <span>{current}</span>
          <span className="text-xs sm:text-sm font-normal text-[#566857]">
            vs {previous} {formatter}
          </span>
        </span>
      </div>
      <GrowthBadge pct={pct} />
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  tone = 'default',
  hint,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  tone?: 'default' | 'warning' | 'success';
  hint?: string;
}) {
  const valueTone =
    tone === 'warning'
      ? 'text-[#8d5c10]'
      : tone === 'success'
        ? 'text-[#4c5f2e]'
        : 'text-[#183223]';
  return (
    <div className="flex flex-col gap-2 min-h-[110px] sm:min-h-[120px] p-3 sm:p-4 rounded-xl bg-[rgba(252,253,247,0.98)] border border-[#d9e5c1] hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(76,95,46,0.06)] transition-all min-w-0">
      <span className="text-[0.65rem] sm:text-[0.7rem] font-bold uppercase tracking-wider text-[#566857] flex items-start gap-1.5">
        <span className="line-clamp-2">{label}</span>
        {hint && <HelpTip text={hint} />}
      </span>
      <strong className={`text-[clamp(1.05rem,2vw,1.7rem)] leading-tight break-words ${valueTone}`}>
        {value}
      </strong>
      {sub && <p className="text-xs sm:text-sm text-[#566857] m-0 line-clamp-2">{sub}</p>}
      <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-[#bdd383] mt-auto" />
    </div>
  );
}

function Card({
  title,
  description,
  children,
  action,
  hint,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-4 p-4 sm:p-5 rounded-2xl bg-[rgba(252,253,247,0.98)] border border-[#d9e5c1]">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex flex-col gap-1.5 min-w-0">
          <h2 className="text-[clamp(1.05rem,1.6vw,1.25rem)] leading-tight m-0 flex items-center gap-1.5">
            {title}
            {hint && <HelpTip text={hint} />}
          </h2>
          {description && <p className="text-sm text-[#566857] m-0">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function YearlyBars({ data }: { data: DashboardYearly['months'] }) {
  const max = Math.max(
    1,
    ...data.map((m) => Math.max(m.chargedCents, m.collectedCents)),
  );
  const w = 720;
  const h = 220;
  const padL = 44;
  const padB = 28;
  const padT = 10;
  const innerW = w - padL - 8;
  const innerH = h - padT - padB;
  const barGroupW = innerW / data.length;
  const barW = (barGroupW - 6) / 2;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(max * t));

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto">
      {ticks.map((tick) => {
        const y = padT + innerH - (tick / max) * innerH;
        return (
          <g key={tick}>
            <line
              x1={padL}
              x2={w - 4}
              y1={y}
              y2={y}
              stroke="#d9e5c1"
              strokeDasharray="3 3"
            />
            <text x={padL - 6} y={y + 3} fontSize="9" textAnchor="end" fill="#566857">
              {(tick / 100).toFixed(0)}€
            </text>
          </g>
        );
      })}
      {data.map((m, i) => {
        const x0 = padL + i * barGroupW + 3;
        const hCharged = (m.chargedCents / max) * innerH;
        const hCollected = (m.collectedCents / max) * innerH;
        return (
          <g key={m.month}>
            <rect
              x={x0}
              y={padT + innerH - hCharged}
              width={barW}
              height={hCharged}
              fill="#bdd383"
              rx="2"
            />
            <rect
              x={x0 + barW + 2}
              y={padT + innerH - hCollected}
              width={barW}
              height={hCollected}
              fill="#4c5f2e"
              rx="2"
            />
            <text
              x={x0 + barW + 1}
              y={h - 8}
              fontSize="10"
              textAnchor="middle"
              fill="#566857"
            >
              {m.label}
            </text>
          </g>
        );
      })}
      <g transform={`translate(${padL}, 0)`}>
        <rect x="0" y="0" width="10" height="8" fill="#bdd383" />
        <text x="14" y="7" fontSize="9" fill="#566857">
          Cobrado
        </text>
        <rect x="62" y="0" width="10" height="8" fill="#4c5f2e" />
        <text x="76" y="7" fontSize="9" fill="#566857">
          Recolhido
        </text>
      </g>
    </svg>
  );
}

function StudentsLine({ data }: { data: DashboardYearly['months'] }) {
  // saldo de alunos por mês (acumulado: novos - saídas), começando em 0
  const series: number[] = [];
  let acc = 0;
  for (const m of data) {
    acc += m.newStudents - m.churned;
    series.push(acc);
  }
  const minV = Math.min(0, ...series);
  const maxV = Math.max(1, ...series);
  const span = maxV - minV || 1;
  const w = 720;
  const h = 180;
  const padL = 36;
  const padB = 22;
  const padT = 10;
  const innerW = w - padL - 8;
  const innerH = h - padT - padB;
  const stepX = innerW / Math.max(1, data.length - 1);

  const points = series
    .map((v, i) => {
      const x = padL + i * stepX;
      const y = padT + innerH - ((v - minV) / span) * innerH;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto">
      {[0, 0.5, 1].map((t) => {
        const v = Math.round(minV + span * t);
        const y = padT + innerH - t * innerH;
        return (
          <g key={t}>
            <line x1={padL} x2={w - 4} y1={y} y2={y} stroke="#d9e5c1" strokeDasharray="3 3" />
            <text x={padL - 4} y={y + 3} fontSize="9" textAnchor="end" fill="#566857">
              {v >= 0 ? `+${v}` : v}
            </text>
          </g>
        );
      })}
      <polyline points={points} fill="none" stroke="#97ce2a" strokeWidth="2" />
      {series.map((v, i) => {
        const x = padL + i * stepX;
        const y = padT + innerH - ((v - minV) / span) * innerH;
        return <circle key={i} cx={x} cy={y} r="3" fill="#4c5f2e" />;
      })}
      {data.map((m, i) => (
        <text
          key={m.month}
          x={padL + i * stepX}
          y={h - 6}
          fontSize="10"
          textAnchor="middle"
          fill="#566857"
        >
          {m.label}
        </text>
      ))}
    </svg>
  );
}

function Donut({
  segments,
}: {
  segments: Array<{ label: string; value: number; color: string }>;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  const r = 60;
  const cx = 80;
  const cy = 80;
  const stroke = 22;
  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-[160px] text-sm text-[#566857]">
        Sem dados
      </div>
    );
  }
  const cumulative = segments.reduce<number[]>((arr, seg) => {
    const prev = arr.length === 0 ? 0 : arr[arr.length - 1];
    arr.push(prev + seg.value);
    return arr;
  }, []);
  return (
    <div className="flex items-center gap-4 flex-wrap justify-center sm:justify-start">
      <svg viewBox="0 0 160 160" className="w-[140px] h-[140px] sm:w-[160px] sm:h-[160px] shrink-0">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#eef3df" strokeWidth={stroke} />
        {segments.map((seg, i) => {
          if (seg.value === 0) return null;
          const frac = seg.value / total;
          const dash = 2 * Math.PI * r * frac;
          const gap = 2 * Math.PI * r - dash;
          const startAcc = i === 0 ? 0 : cumulative[i - 1];
          const offset = -2 * Math.PI * r * (startAcc / total);
          return (
            <circle
              key={seg.label}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth={stroke}
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={offset}
              transform={`rotate(-90 ${cx} ${cy})`}
            />
          );
        })}
        <text x={cx} y={cy - 2} textAnchor="middle" fontSize="11" fill="#566857">
          Total
        </text>
        <text
          x={cx}
          y={cy + 14}
          textAnchor="middle"
          fontSize="14"
          fontWeight="700"
          fill="#183223"
        >
          {total}
        </text>
      </svg>
      <ul className="flex flex-col gap-1.5 text-sm">
        {segments.map((seg) => {
          const pct = total ? (seg.value / total) * 100 : 0;
          return (
            <li key={seg.label} className="flex items-center gap-2 text-[#183223]">
              <span
                className="inline-block w-3 h-3 rounded-sm"
                style={{ backgroundColor: seg.color }}
              />
              <span className="font-medium">{seg.label}</span>
              <span className="text-[#566857]">
                {seg.value} · {pct.toFixed(0)}%
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function HBars({
  rows,
}: {
  rows: Array<{ label: string; value: number; sub?: string; color?: string }>;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="flex flex-col gap-2.5">
      {rows.map((r) => {
        const pct = (r.value / max) * 100;
        return (
          <li key={r.label} className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-[#183223]">{r.label}</span>
              <span className="text-[#566857]">{r.sub ?? r.value}</span>
            </div>
            <div className="h-2 bg-[#eef3df] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${pct}%`,
                  backgroundColor: r.color ?? '#97ce2a',
                }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export default function DashboardPage() {
  const { data: dashboard, isLoading } = useQuery<DashboardSummary>({
    queryKey: ['dashboard'],
    queryFn: () => apiRequest('/dashboard/summary'),
  });
  const { data: yearly } = useQuery<DashboardYearly>({
    queryKey: ['dashboard', 'yearly'],
    queryFn: () => apiRequest('/dashboard/yearly'),
  });

  if (isLoading || !dashboard) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="text-[#566857] font-semibold">A carregar dashboard...</span>
      </div>
    );
  }

  const collectionPct = (dashboard.collectionRate * 100).toFixed(0);
  const yearCollectionPct = (dashboard.yearCollectionRate * 100).toFixed(0);

  const methodSegments = dashboard.methodMix
    .filter((m) => m.count > 0)
    .map((m, i) => ({
      label: METHOD_LABEL[m.method],
      value: m.count,
      color: PALETTE[i % PALETTE.length],
    }));

  const agingOrder: DashboardAgingBucket[] = ['0-30', '31-60', '61-90', '90+'];
  const agingColors: Record<DashboardAgingBucket, string> = {
    '0-30': '#bdd383',
    '31-60': '#97ce2a',
    '61-90': '#8d5c10',
    '90+': '#a13838',
  };
  const agingRows = agingOrder.map((b) => ({
    label: `${b} dias`,
    value: dashboard.aging[b].amountCents,
    sub: `${dashboard.aging[b].count} · ${formatCurrency(dashboard.aging[b].amountCents)}`,
    color: agingColors[b],
  }));

  const planRows = dashboard.planBreakdown.slice(0, 6).map((p) => ({
    label: p.planName,
    value: p.activeStudents,
    sub: `${p.activeStudents} alunos · ${formatCurrency(p.monthlyFeeCents)}/mês`,
  }));

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      {/* KPI grid — mês */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="Receita Mensal Prevista"
          value={formatCurrency(dashboard.projectedMonthlyRevenueCents)}
          sub={`Ano: ${formatCurrency(dashboard.yearChargedCents)}`}
          icon={TrendingUp}
          hint="Soma de todos os pagamentos com mês de competência igual ao mês corrente, independentemente de estarem pagos. Representa a receita esperada (faturada)."
        />
        <StatCard
          label="Recolhido Este Mês"
          value={formatCurrency(dashboard.collectedThisMonthCents)}
          sub={`${dashboard.receiptsIssued} recibos · Ano: ${formatCurrency(dashboard.yearCollectedCents)}`}
          icon={Receipt}
          tone="success"
          hint="Soma dos pagamentos efetivamente liquidados (status PAID) com data de pagamento neste mês. Dinheiro real entrado em caixa."
        />
        <StatCard
          label="Taxa de Cobrança (Mês)"
          value={`${collectionPct}%`}
          sub={`Ano: ${yearCollectionPct}%`}
          icon={Percent}
          tone={dashboard.collectionRate >= 0.8 ? 'success' : 'warning'}
          hint="Taxa de Cobrança = Recolhido ÷ Previsto. Mostra que % do que foi faturado já foi efetivamente recebido. Ideal acima de 80%."
        />
        <StatCard
          label="Pendente / Em Atraso"
          value={formatCurrency(dashboard.pendingAmountCents)}
          sub={`${dashboard.overdueCount} pagamentos em atraso`}
          icon={AlertTriangle}
          tone="warning"
          hint="Total a receber: pagamentos com status PENDING (a vencer) + OVERDUE (vencidos não pagos). Quanto maior, maior o risco financeiro."
        />
        <StatCard
          label="Alunos Ativos"
          value={String(dashboard.activeStudents)}
          sub={`${dashboard.activeTechnicalUsers} utilizadores técnicos`}
          icon={Users}
          hint="Alunos com flag isActive=true. Base de cálculo para ARPU e capacidade do clube."
        />
        <StatCard
          label="Ticket Médio (Mês)"
          value={formatCurrency(dashboard.avgTicketCents)}
          icon={CircleDollarSign}
          hint="Ticket Médio = total recolhido no mês ÷ nº de pagamentos liquidados. Valor médio de cada transação."
        />
        <StatCard
          label="Novos Alunos (Mês)"
          value={String(dashboard.newStudentsThisMonth)}
          icon={UserPlus}
          tone="success"
          hint="Alunos criados no sistema desde o início do mês."
        />
        <StatCard
          label="Saídas (Mês)"
          value={String(dashboard.churnedThisMonth)}
          sub={`Presenças: ${dashboard.attendancesThisMonth.tennis} ténis · ${dashboard.attendancesThisMonth.physical} físico`}
          icon={UserMinus}
          tone={dashboard.churnedThisMonth > 0 ? 'warning' : 'default'}
          hint="Churn: alunos desativados (isActive passou a false) no mês corrente. Em conjunto com novos, dá o saldo líquido."
        />
      </div>

      {/* Growth */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card
          title="Crescimento — Alunos"
          description="Variação face a período anterior."
        >
          <div className="flex flex-col gap-2">
            <GrowthRow
              label="MoM — Mês vs mês anterior"
              current={String(dashboard.growth.students.activeNow)}
              previous={String(dashboard.growth.students.activeMonthAgo)}
              pct={dashboard.growth.students.momPct}
              hint="MoM (Month-over-Month): variação entre alunos ativos no fim deste mês e fim do mês imediatamente anterior. Indica ritmo de curto prazo."
            />
            <GrowthRow
              label="YoY — Year over Year"
              current={String(dashboard.growth.students.activeNow)}
              previous={String(dashboard.growth.students.activeYearAgo)}
              pct={dashboard.growth.students.yoyPct}
              hint="YoY (Year-over-Year): variação face ao mesmo mês do ano anterior. Remove sazonalidade e mostra crescimento real."
            />
            <GrowthRow
              label="YTD — Year to Date"
              current={String(dashboard.growth.students.activeNow)}
              previous={String(dashboard.growth.students.activeYearStart)}
              pct={dashboard.growth.students.ytdPct}
              hint="YTD (Year-to-Date): variação acumulada desde 1 de Janeiro deste ano até hoje."
            />
            <div className="flex items-center justify-between flex-wrap gap-2 text-sm text-[#566857] px-3 pt-1">
              <span className="inline-flex items-center gap-1.5">
                YTD: <strong className="text-[#4c5f2e]">+{dashboard.growth.students.addedYTD}</strong> novos ·{' '}
                <strong className="text-[#8d5c10]">-{dashboard.growth.students.churnedYTD}</strong> saídas
                <HelpTip text="Total de entradas (novos alunos + reativações) e saídas (desativações) registadas no histórico de status desde 1 de Janeiro." />
              </span>
              <span className="inline-flex items-center gap-1.5">
                Saldo:{' '}
                <strong className="text-[#183223]">
                  {dashboard.growth.students.netNewYTD >= 0 ? '+' : ''}
                  {dashboard.growth.students.netNewYTD}
                </strong>
                <HelpTip text="Saldo líquido = novos − saídas. Mostra o ganho efetivo de alunos no período." />
              </span>
            </div>
          </div>
        </Card>

        <Card
          title="Crescimento — Receita"
          description="Recolhido face a período anterior + ARPU."
        >
          <div className="flex flex-col gap-2">
            <GrowthRow
              label="MoM — Mês vs mês anterior"
              current={formatCurrency(dashboard.growth.revenue.monthCollectedCents)}
              previous={formatCurrency(dashboard.growth.revenue.prevMonthCollectedCents)}
              pct={dashboard.growth.revenue.momPct}
              hint="MoM (Month-over-Month): receita recolhida no mês corrente vs mês anterior. Útil para detetar quedas/picos imediatos."
            />
            <GrowthRow
              label="YoY — Year over Year"
              current={formatCurrency(dashboard.growth.revenue.monthCollectedCents)}
              previous={formatCurrency(
                dashboard.growth.revenue.sameMonthLastYearCollectedCents,
              )}
              pct={dashboard.growth.revenue.yoyPct}
              hint="YoY (Year-over-Year): recolhido no mês atual vs mesmo mês do ano passado. Compara desempenho ano-sobre-ano sem efeito sazonal."
            />
            <GrowthRow
              label="YTD — Year to Date"
              current={formatCurrency(dashboard.growth.revenue.ytdCollectedCents)}
              previous={formatCurrency(dashboard.growth.revenue.priorYtdCollectedCents)}
              pct={dashboard.growth.revenue.ytdPct}
              hint="YTD (Year-to-Date): acumulado de Janeiro até hoje vs igual janela do ano anterior. Tendência anual em curso."
            />
            <GrowthRow
              label="ARPU — Receita média por aluno"
              current={formatCurrency(dashboard.growth.revenue.arpuMonthCents)}
              previous={formatCurrency(dashboard.growth.revenue.arpuPrevMonthCents)}
              pct={dashboard.growth.revenue.arpuMomPct}
              hint="ARPU (Average Revenue Per User): recolhido do mês ÷ alunos ativos. Mede o valor monetário médio que cada aluno gera. Subir ARPU sem subir alunos = upsell/upgrade de planos."
            />
          </div>
        </Card>
      </div>

      {/* Receita anual */}
      {yearly && yearly.months.length > 0 && (
        <Card
          title="Receita — últimos 12 meses"
          description="Cobrado vs recolhido por mês de competência/liquidação."
          hint="Barra clara = previsto (faturado pelo mês de competência). Barra escura = recolhido (efetivamente recebido pela data de pagamento). Diferença grande = défice de cobrança."
        >
          <div className="overflow-x-auto -mx-1 px-1">
            <div className="min-w-[560px]">
              <YearlyBars data={yearly.months} />
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Aging */}
        <Card
          title="Aging de Pendentes"
          description="Distribuição de valores por dias desde o vencimento."
          hint="Aging: classifica dívidas por idade (0-30, 31-60, 61-90, 90+ dias após vencimento). Quanto mais à direita, menor a probabilidade de cobrança."
        >
          <HBars rows={agingRows} />
        </Card>

        {/* Mix método */}
        <Card
          title="Mix de Métodos (Mês)"
          description="Pagamentos liquidados no mês corrente."
          hint="Distribuição de pagamentos liquidados por método (MB Way, numerário, transferência, cartão). Útil para reconciliação e logística de cobrança."
        >
          <Donut segments={methodSegments} />
        </Card>
      </div>

      {/* Saldo alunos + planos */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-4">
        {yearly && yearly.months.length > 0 && (
          <Card
            title="Saldo de Alunos — 12 meses"
            description="Acumulado de novos menos saídas (movimentos do histórico)."
            hint="Linha do saldo líquido cumulativo (entradas − saídas) ao longo dos últimos 12 meses. Subindo = a base cresce; descendo = perde mais do que ganha."
          >
            <div className="overflow-x-auto -mx-1 px-1">
              <div className="min-w-[520px]">
                <StudentsLine data={yearly.months} />
              </div>
            </div>
          </Card>
        )}
        <Card
          title="Distribuição por Plano"
          description="Alunos ativos por plano atual."
          hint="Quantidade de alunos ativos por plano. Permite identificar planos populares e calcular receita potencial (mensalidade × alunos)."
        >
          {planRows.length === 0 ? (
            <p className="text-sm text-[#566857]">Sem alunos com plano associado.</p>
          ) : (
            <HBars rows={planRows} />
          )}
        </Card>
      </div>

      {/* Top devedores + recentes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card
          title="Top Devedores"
          description="Maior tempo desde o vencimento."
          hint="Lista de pagamentos pendentes/em atraso ordenados pela data de vencimento mais antiga. Foco prioritário de cobrança."
          action={
            <Link
              href="/pagamentos"
              className="flex items-center gap-1 text-sm font-semibold text-[#183223] hover:text-[#97ce2a] transition-colors"
            >
              Ver todos <ArrowRight className="w-4 h-4" />
            </Link>
          }
        >
          {dashboard.topDebtors.length === 0 ? (
            <p className="text-sm text-[#566857]">Sem pagamentos pendentes.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {dashboard.topDebtors.map((d) => (
                <li
                  key={d.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg bg-white/60 border border-[#d9e5c1]"
                >
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="font-semibold text-[#183223] truncate">{d.studentName}</span>
                    <span className="text-xs text-[#8d5c10]">
                      {d.daysLate > 0 ? `${d.daysLate} dias em atraso` : 'A vencer'}
                    </span>
                  </div>
                  <span className="font-mono font-semibold text-[#183223] shrink-0 text-sm sm:text-base">
                    {formatCurrency(d.amountCents)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          title="Pagamentos Recentes"
          description="Últimos pagamentos liquidados."
          action={
            <Link
              href="/pagamentos"
              className="flex items-center gap-1 text-sm font-semibold text-[#183223] hover:text-[#97ce2a] transition-colors"
            >
              Ver todos <ArrowRight className="w-4 h-4" />
            </Link>
          }
        >
          <div className="flex flex-col gap-2">
            {dashboard.recentPayments.length === 0 ? (
              <p className="text-sm text-[#566857]">Nenhum pagamento recente.</p>
            ) : (
              dashboard.recentPayments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg bg-white/60 border border-[#d9e5c1]"
                >
                  <div className="flex flex-col gap-1 min-w-0 flex-1">
                    <span className="font-semibold text-[#183223] truncate">{payment.studentName}</span>
                    <span className="text-xs text-[#566857] truncate">
                      {payment.receiptNumber ? `Recibo ${payment.receiptNumber}` : 'Sem recibo'}
                    </span>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="font-mono font-semibold text-[#183223] text-sm sm:text-base">
                      {formatCurrency(payment.amountCents)}
                    </span>
                    <span className="text-xs text-[#566857] whitespace-nowrap">
                      {formatDateTime(payment.paidAt)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Ações rápidas */}
      <Card title="Ações Rápidas" description="Atalhos para tarefas comuns.">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <QuickCard href="/alunos/novo" title="Novo Aluno" description="Registar aluno no sistema" />
          <QuickCard href="/pagamentos/novo" title="Novo Pagamento" description="Registar pagamento manual" />
          <QuickCard href="/presencas" title="Presenças" description="Marcar presenças de hoje" />
          <QuickCard href="/pagamentos" title="Cobranças" description="Gerar mensalidades" />
        </div>
      </Card>
    </div>
  );
}

function QuickCard({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col gap-1 min-h-[90px] p-4 border border-[#d9e5c1] rounded-lg bg-white/60 text-left hover:-translate-y-0.5 hover:border-[#bdd383] hover:shadow-[0_4px_12px_rgba(76,95,46,0.06)] hover:bg-white/90 transition-all"
    >
      <strong className="text-base text-[#183223]">{title}</strong>
      <span className="text-sm text-[#566857]">{description}</span>
    </Link>
  );
}
