export type WhatsappDocumentPayload = {
  number: string;
  type: 'document';
  url: string;
  filename: string;
  caption?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`Payload de WhatsApp inválido: ${field}.`);
  }

  return value;
}

export function normalizeWhatsappNumber(value: string | null | undefined): string | null {
  const digits = (value ?? '').replace(/\D/g, '');
  if (!digits) return null;

  const withoutInternationalPrefix = digits.startsWith('00')
    ? digits.slice(2)
    : digits;

  if (/^9\d{8}$/.test(withoutInternationalPrefix)) {
    return `351${withoutInternationalPrefix}`;
  }

  if (/^3519\d{8}$/.test(withoutInternationalPrefix)) {
    return withoutInternationalPrefix;
  }

  return null;
}

export function serializeWhatsappPayload(
  input: WhatsappDocumentPayload,
): WhatsappDocumentPayload {
  const payload: WhatsappDocumentPayload = {
    number: input.number,
    type: 'document',
    url: input.url,
    filename: input.filename,
  };

  if (input.caption !== undefined) {
    payload.caption = input.caption;
  }

  return payload;
}

export function deserializeWhatsappPayload(payload: unknown): WhatsappDocumentPayload {
  if (!isRecord(payload)) {
    throw new Error('Payload de WhatsApp inválido.');
  }

  const type = requireString(payload.type, 'type');
  if (type !== 'document') {
    throw new Error('Payload de WhatsApp inválido: type.');
  }

  return {
    number: requireString(payload.number, 'number'),
    type: 'document',
    url: requireString(payload.url, 'url'),
    filename: requireString(payload.filename, 'filename'),
    caption: typeof payload.caption === 'string' ? payload.caption : undefined,
  };
}
