/**
 * Resolve o segredo do JWT. O fallback de desenvolvimento só é usado quando
 * NODE_ENV === 'development' e JWT_SECRET não está definido. Em staging ou
 * produção, lança erro para nunca usar um segredo conhecido/público.
 */
function resolveJwtSecret(): string {
  const devFallbackSecret = 'esaf-dev-secret-not-for-development';
  const secret = process.env.JWT_SECRET?.trim();

  if (secret) {
    return secret;
  }

  if (process.env.NODE_ENV !== 'development') {
    throw new Error(
      'JWT_SECRET não definido. Defina a variável de ambiente JWT_SECRET.',
    );
  }

  return devFallbackSecret;
}

export { resolveJwtSecret };
