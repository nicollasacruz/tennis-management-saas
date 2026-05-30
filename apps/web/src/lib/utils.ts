export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api';
export const ESAF_LOGO =
  'https://tiesports.s3.amazonaws.com/clubs/45940/logos/184a0513-da7c-418d-a7e8-a21b1f768fec.png';
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

export function parseEuroToCents(euroString: string): number {
  const normalized = euroString.replace(',', '.');
  const value = parseFloat(normalized);
  if (isNaN(value)) return 0;
  return Math.round(value * 100);
}

export function centsToEuroInput(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',');
}
