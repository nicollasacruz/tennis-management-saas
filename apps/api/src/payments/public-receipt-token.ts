import { createHmac, timingSafeEqual } from 'node:crypto';

type PublicReceiptTokenPayload = {
  paymentId: string;
  exp: number;
};

type CreatePublicReceiptTokenInput = {
  paymentId: string;
  expiresAt: Date;
  secret: string;
};

function base64UrlEncode(input: string | Buffer): string {
  return Buffer.from(input).toString('base64url');
}

function base64UrlDecode(input: string): string {
  return Buffer.from(input, 'base64url').toString('utf8');
}

function sign(value: string, secret: string): string {
  return createHmac('sha256', secret).update(value).digest('base64url');
}

export function createPublicReceiptToken(input: CreatePublicReceiptTokenInput): string {
  if (!input.secret) {
    throw new Error('Segredo de recibos públicos não configurado.');
  }

  const payload: PublicReceiptTokenPayload = {
    paymentId: input.paymentId,
    exp: input.expiresAt.getTime(),
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  return `${encodedPayload}.${sign(encodedPayload, input.secret)}`;
}

export function verifyPublicReceiptToken(
  token: string,
  secret: string,
  now = new Date(),
): string | null {
  if (!token || !secret) return null;

  const [encodedPayload, signature, extra] = token.split('.');
  if (!encodedPayload || !signature || extra !== undefined) return null;

  const expectedSignature = sign(encodedPayload, secret);
  const provided = Buffer.from(signature, 'base64url');
  const expected = Buffer.from(expectedSignature, 'base64url');

  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as Partial<PublicReceiptTokenPayload>;
    if (typeof payload.paymentId !== 'string' || typeof payload.exp !== 'number') {
      return null;
    }

    if (payload.exp < now.getTime()) {
      return null;
    }

    return payload.paymentId;
  } catch {
    return null;
  }
}
