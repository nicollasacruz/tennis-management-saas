export const DEFAULT_DDI = '+351';

export function normalizeDdi(value: string | null | undefined): string {
  const digits = (value ?? '').replace(/\D/g, '');
  return digits ? `+${digits.slice(0, 4)}` : DEFAULT_DDI;
}

export function joinPhone(ddi: string, number: string): string {
  const digits = number.replace(/\D/g, '');
  return digits ? `${normalizeDdi(ddi)} ${digits}` : '';
}

export function splitPhone(value: string | null | undefined): {
  ddi: string;
  number: string;
} {
  const trimmed = (value ?? '').trim();

  if (!trimmed) {
    return { ddi: DEFAULT_DDI, number: '' };
  }

  const parts = trimmed.split(/\s+/);
  if (parts.length >= 2 && /^\+?\d+$/.test(parts[0])) {
    return {
      ddi: normalizeDdi(parts[0]),
      number: parts.slice(1).join('').replace(/\D/g, ''),
    };
  }

  const digits = trimmed.replace(/\D/g, '');
  if (digits.startsWith('351') && digits.length > 9) {
    return { ddi: '+351', number: digits.slice(3) };
  }

  if (trimmed.startsWith('+')) {
    const match = trimmed.match(/^\+(\d{1,4})(.*)$/);
    if (match) {
      return { ddi: `+${match[1]}`, number: match[2].replace(/\D/g, '') };
    }
  }

  return { ddi: DEFAULT_DDI, number: digits };
}
