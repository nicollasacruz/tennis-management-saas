import { locales, type Locale } from './routing';

export { locales };
export type { Locale };

export const localeLabels: Record<Locale, string> = {
  pt: 'Português',
  en: 'English',
  es: 'Español',
};

export const localeShort: Record<Locale, string> = {
  pt: 'PT',
  en: 'EN',
  es: 'ES',
};

/** Caminho público de cada locale (localePrefix 'always'). Usado em sitemap/hreflang. */
export const localeHref: Record<Locale, string> = {
  pt: '/pt',
  en: '/en',
  es: '/es',
};

/** Locale BCP47 regional para html lang e hreflang (SEO). */
export const localeToBcp47: Record<Locale, string> = {
  pt: 'pt-PT',
  en: 'en-GB',
  es: 'es-ES',
};

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tenis.esaf.run.place';
