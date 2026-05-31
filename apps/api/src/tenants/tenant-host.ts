type RequestHostHeaders = {
  host?: string | string[] | null;
  xForwardedHost?: string | string[] | null;
};

function firstHeaderValue(value: string | string[] | null | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

export function normalizeTenantHost(value: string | null | undefined): string | null {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  const firstHost = trimmed.split(',')[0]?.trim();
  const withoutProtocol = firstHost.replace(/^https?:\/\//i, '');
  const withoutPath = withoutProtocol.split('/')[0];
  const withoutPort = withoutPath.replace(/:\d+$/, '');
  const normalized = withoutPort.toLowerCase();

  return normalized || null;
}

export function resolveRequestHost(headers: RequestHostHeaders): string | null {
  return (
    normalizeTenantHost(firstHeaderValue(headers.xForwardedHost)) ??
    normalizeTenantHost(firstHeaderValue(headers.host))
  );
}

export function extractTenantSlugFromHost(host: string | null, rootDomain: string): string | null {
  const normalizedHost = normalizeTenantHost(host);
  const normalizedRootDomain = normalizeTenantHost(rootDomain);

  if (!normalizedHost || !normalizedRootDomain || normalizedHost === normalizedRootDomain) {
    return null;
  }

  const suffix = `.${normalizedRootDomain}`;

  if (!normalizedHost.endsWith(suffix)) {
    return null;
  }

  const slug = normalizedHost.slice(0, -suffix.length);

  return slug.includes('.') || !slug ? null : slug;
}
