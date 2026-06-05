export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api';
export const BRAND_LOGO = '/brand-logo.png';
export const PHYSICAL_TRAINING_SURCHARGE_CENTS = 500;

export const currencyFormatter = new Intl.NumberFormat('pt-PT', {
  currency: 'EUR',
  style: 'currency',
});

export const dateFormatter = new Intl.DateTimeFormat('pt-PT', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

export const dateTimeFormatter = new Intl.DateTimeFormat('pt-PT', {
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  month: 'short',
  year: 'numeric',
});

export const monthFormatter = new Intl.DateTimeFormat('pt-PT', {
  month: 'long',
  year: 'numeric',
});

export function formatCurrency(cents: number): string {
  return currencyFormatter.format(cents / 100);
}

export function formatDate(dateString: string): string {
  return dateFormatter.format(new Date(dateString));
}

export function formatDateTime(dateString: string): string {
  return dateTimeFormatter.format(new Date(dateString));
}

export function formatMonth(dateString: string): string {
  return monthFormatter.format(new Date(dateString));
}

export function getCurrentDateValue(): string {
  return new Date().toISOString().split('T')[0];
}

export function getCurrentMonthValue(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// Dias da semana indexados por JS getDay() (0=Dom..6=Sáb).
export const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
export const WEEKDAY_LABELS_LONG = [
  'Domingo',
  'Segunda',
  'Terça',
  'Quarta',
  'Quinta',
  'Sexta',
  'Sábado',
];

// Ordem de exibição começando à segunda-feira.
export const WEEK_DAYS_MON_FIRST = [1, 2, 3, 4, 5, 6, 0];

export function minutesToHHMM(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function hhmmToMinutes(value: string): number {
  const [h, m] = value.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

// Segunda-feira (YYYY-MM-DD) da semana que contém `date`.
export function getMondayOf(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay(); // 0=Dom
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().split('T')[0];
}

// Data YYYY-MM-DD a partir de uma segunda-feira + offset do dia (getDay 0..6).
export function dateForWeekday(mondayIso: string, jsDayOfWeek: number): string {
  const [y, m, d] = mondayIso.split('-').map(Number);
  const base = new Date(Date.UTC(y, m - 1, d));
  const offset = jsDayOfWeek === 0 ? 6 : jsDayOfWeek - 1; // Seg=0..Dom=6
  base.setUTCDate(base.getUTCDate() + offset);
  return base.toISOString().split('T')[0];
}

export function shiftIsoDate(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const base = new Date(Date.UTC(y, m - 1, d));
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().split('T')[0];
}

export function parseEuroToCents(euroString: string): number {
  const normalized = euroString.replace(',', '.');
  const value = parseFloat(normalized);
  if (isNaN(value)) return 0;
  return Math.round(value * 100);
}

export function centsToEuroInput(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',');
}
