import type { SendMailInput } from './mail.service';

export type SerializedMailAttachment = {
  filename: string;
  contentBase64: string;
  contentType?: string;
};

export type SerializedMailPayload = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  attachments?: SerializedMailAttachment[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`Payload de email inválido: ${field}.`);
  }
  return value;
}

export function serializeMailPayload(input: SendMailInput): SerializedMailPayload {
  const payload: SerializedMailPayload = {
    to: input.to,
    subject: input.subject,
    text: input.text,
  };

  if (input.html !== undefined) {
    payload.html = input.html;
  }

  if (input.attachments !== undefined) {
    payload.attachments = input.attachments.map((attachment) => {
      const serialized: SerializedMailAttachment = {
        filename: attachment.filename,
        contentBase64: attachment.content.toString('base64'),
      };

      if (attachment.contentType !== undefined) {
        serialized.contentType = attachment.contentType;
      }

      return serialized;
    });
  }

  return payload;
}

export function deserializeMailPayload(payload: unknown): SendMailInput {
  if (!isRecord(payload)) {
    throw new Error('Payload de email inválido.');
  }

  const attachmentsValue = payload.attachments;
  if (attachmentsValue !== undefined && !Array.isArray(attachmentsValue)) {
    throw new Error('Payload de email inválido: anexos.');
  }

  const attachments = Array.isArray(attachmentsValue)
    ? attachmentsValue.map((attachment) => {
        if (!isRecord(attachment)) {
          throw new Error('Payload de email inválido: anexos.');
        }

        return {
          filename: requireString(attachment.filename, 'filename'),
          content: Buffer.from(
            requireString(attachment.contentBase64, 'contentBase64'),
            'base64',
          ),
          contentType:
            typeof attachment.contentType === 'string'
              ? attachment.contentType
              : undefined,
        };
      })
    : undefined;

  return {
    to: requireString(payload.to, 'to'),
    subject: requireString(payload.subject, 'subject'),
    text: requireString(payload.text, 'text'),
    html: typeof payload.html === 'string' ? payload.html : undefined,
    attachments,
  };
}

export function buildRetryDate(
  failedAttempts: number,
  baseDate = new Date(),
  baseDelaySeconds = 60,
  maxDelaySeconds = 3600,
): Date {
  const safeAttempts = Math.max(1, failedAttempts);
  const delaySeconds = Math.min(
    baseDelaySeconds * 2 ** (safeAttempts - 1),
    maxDelaySeconds,
  );
  return new Date(baseDate.getTime() + delaySeconds * 1000);
}

export function normalizeMailJobError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.slice(0, 2000);
}

export function parseBool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

export function parsePositiveInt(
  value: string | undefined,
  fallback: number,
): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

export function normalizeQueueError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.slice(0, 2000);
}
