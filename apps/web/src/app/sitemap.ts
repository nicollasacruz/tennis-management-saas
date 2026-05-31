import type { MetadataRoute } from 'next';
import { locales, localeHref, SITE_URL } from '@/i18n/config';

const languages = {
  'pt-PT': `${SITE_URL}/pt`,
  'en-GB': `${SITE_URL}/en`,
  'es-ES': `${SITE_URL}/es`,
  'x-default': `${SITE_URL}/pt`,
};

export default function sitemap(): MetadataRoute.Sitemap {
  return locales.map((locale) => ({
    url: `${SITE_URL}${localeHref[locale]}`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: locale === 'pt' ? 1 : 0.9,
    alternates: { languages },
  }));
}
