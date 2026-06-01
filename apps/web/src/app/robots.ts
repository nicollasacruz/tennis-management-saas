import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/i18n/config';

// Páginas privadas (autenticadas) — não devem ser indexadas.
const privateSegments = [
  'login',
  'dashboard',
  'alunos',
  'pagamentos',
  'planos',
  'presencas',
  'atividades',
  'equipa',
  'comunicacoes',
  'whatsapp',
];
const prefixes = ['/pt', '/en', '/es'];

export default function robots(): MetadataRoute.Robots {
  const disallow = prefixes.flatMap((p) =>
    privateSegments.map((s) => `${p}/${s}`),
  );

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow,
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
