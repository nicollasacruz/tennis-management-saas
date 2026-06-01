// Slugs que não podem virar subdomínio de tenant (colidem com infra/marketing).
const RESERVED: ReadonlySet<string> = new Set([
  'www', 'app', 'api', 'admin', 'dashboard', 'mail', 'webmail', 'smtp', 'imap',
  'pop', 'static', 'assets', 'cdn', 'status', 'help', 'support', 'docs', 'blog',
  'billing', 'onboarding', 'checkout', 'login', 'signup', 'register', 'account',
  'pay', 'stripe', 'demo', 'test', 'staging', 'dev', 'ns', 'ns1', 'ns2', 'mx',
  'ftp', 'vpn', 'db', 'pgadmin', 'evolution', 'traefik', 'grafana', 'metrics',
  'internal', 'public', 'clubtenispro',
]);

export function isReservedSlug(slug: string): boolean {
  return RESERVED.has(slug);
}
