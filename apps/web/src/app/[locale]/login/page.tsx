'use client';

import React, { useState, FormEvent } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/components/auth-provider';
import { LanguageSwitcher } from '@/components/language-switcher';
import { BRAND } from '@/lib/brand';

export default function LoginPage() {
  const t = useTranslations('login');
  const { login, isAuthenticated } = useAuth();
  const router = useRouter();
  const showDemoAccounts = process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_SHOW_DEMO_ACCOUNTS === 'true';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  React.useEffect(() => {
    if (isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await login(email, password);
      router.replace('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('erro'));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div
      className="relative min-h-screen flex items-center justify-center p-5"
      style={{
        background:
          'radial-gradient(circle at 20% 30%, rgba(198, 240, 92, 0.25), transparent 50%), radial-gradient(circle at 80% 70%, rgba(151, 206, 42, 0.15), transparent 50%), #f4f7ed',
      }}
    >
      <div className="absolute right-5 top-5">
        <LanguageSwitcher />
      </div>

      <div className="w-full max-w-[420px] bg-[rgba(252,253,247,0.98)] border border-[#d9e5c1] rounded-[20px] p-8 shadow-[0_16px_48px_rgba(76,95,46,0.14)]">
        <div className="text-center mb-6">
          <span
            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl text-[var(--ink)]"
            style={{
              background: 'linear-gradient(160deg, rgba(198, 240, 92, 0.95), rgba(127, 184, 10, 0.95))',
              border: '1px solid rgba(74, 104, 16, 0.18)',
            }}
          >
            <span className="text-2xl font-black leading-none">TC</span>
          </span>
          <h1 className="text-[1.6rem] font-extrabold mb-1">{BRAND}</h1>
          <p className="text-[#566857]">{t('subtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <div className="px-4 py-3 bg-[#fcebe7] border border-[rgba(160,74,55,0.2)] rounded-lg text-[#914a39] text-sm font-semibold">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label htmlFor="email" className="text-sm font-semibold text-[#183223]">
              {t('email')}
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('emailPlaceholder')}
              required
              autoFocus
              className="px-3 py-2 border border-[#d9e5c1] rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#c6f05c] focus:border-[#97ce2a]"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="password" className="text-sm font-semibold text-[#183223]">
              {t('senha')}
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('senhaPlaceholder')}
              required
              className="px-3 py-2 border border-[#d9e5c1] rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#c6f05c] focus:border-[#97ce2a]"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full min-h-[48px] bg-[#183223] text-white font-semibold rounded-lg hover:bg-[#24410b] transition-colors disabled:opacity-60 text-base mt-2"
          >
            {isLoading ? t('entrando') : t('entrar')}
          </button>
        </form>

        {showDemoAccounts ? (
          <div className="mt-6 pt-5 border-t border-[#d9e5c1] text-center">
            <p className="text-sm text-[#566857] font-semibold mb-3">{t('demoTitle')}</p>
            <ul className="flex flex-col gap-2">
              <li className="text-sm text-[#566857] font-mono bg-black/[0.03] px-3 py-2 rounded-lg">
                ricardo@demo.clubtenispro.com / demo1234
              </li>
              <li className="text-sm text-[#566857] font-mono bg-black/[0.03] px-3 py-2 rounded-lg">
                marta@demo.clubtenispro.com / demo1234
              </li>
              <li className="text-sm text-[#566857] font-mono bg-black/[0.03] px-3 py-2 rounded-lg">
                sofia@demo.clubtenispro.com / demo1234
              </li>
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
