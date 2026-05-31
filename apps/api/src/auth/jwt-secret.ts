// Fallback APENAS para desenvolvimento. Em produção o segredo tem de vir do ambiente.
const DEV_FALLBACK_SECRET = 'esaf-dev-secret-not-for-production';

/**
 * Resolve o segredo do JWT. Em produção, exige `JWT_SECRET` (lança se ausente)
 * para nunca usar um segredo conhecido/público. Em dev, usa um fallback local.
 */
export function resolveJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();

  if (secret) {
    return secret;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'JWT_SECRET não definido. Defina JWT_SECRET no ambiente de produção.',
    );
  }

  return DEV_FALLBACK_SECRET;
}
