'use client';

import { useLocale } from 'next-intl';
import { useTransition } from 'react';
import { usePathname, useRouter } from '@/i18n/navigation';
import { locales, localeShort } from '@/i18n/config';

export function LanguageSwitcher() {
  const active = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  function change(locale: string) {
    if (locale === active) return;
    startTransition(() => {
      // Navega para o mesmo caminho noutro locale (muda o prefixo /en, /es).
      router.replace(pathname, { locale });
    });
  }

  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-[var(--border)] bg-[var(--cream)] p-0.5">
      {locales.map((l) => (
        <button
          key={l}
          type="button"
          disabled={pending}
          onClick={() => change(l)}
          aria-pressed={active === l}
          className={`rounded-md px-2 py-1 text-[11px] font-bold tracking-wide transition-colors disabled:opacity-60 ${
            active === l
              ? 'bg-[var(--ink)] text-white'
              : 'text-[var(--muted)] hover:bg-[var(--accent-soft)] hover:text-[var(--ink)]'
          }`}
        >
          {localeShort[l]}
        </button>
      ))}
    </div>
  );
}
