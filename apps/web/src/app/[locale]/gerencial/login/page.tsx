'use client';

import React, { FormEvent, useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { ShieldCheck } from 'lucide-react';
import { platformLogin } from '@/lib/platform-api';

export default function GerencialLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await platformLogin(email, password);
      router.replace('/gerencial');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Credenciais inválidas');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0f1c14] p-5">
      <div className="w-full max-w-[420px] rounded-[20px] border border-white/10 bg-[#13251a] p-8 shadow-[0_16px_48px_rgba(0,0,0,0.4)]">
        <div className="mb-6 text-center">
          <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[rgba(198,240,92,0.18)]">
            <ShieldCheck className="h-7 w-7 text-[#c6f05c]" />
          </span>
          <h1 className="mb-1 text-[1.5rem] font-extrabold text-white">
            Painel Gerencial
          </h1>
          <p className="text-sm text-white/50">Acesso do dono da plataforma</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <div className="rounded-lg border border-[rgba(244,128,108,0.3)] bg-[rgba(244,128,108,0.12)] px-4 py-3 text-sm font-semibold text-[#f4886c]">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label
              htmlFor="email"
              className="text-sm font-semibold text-white/80"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="dono@clubtenispro.com"
              required
              autoFocus
              className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#c6f05c]"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label
              htmlFor="password"
              className="text-sm font-semibold text-white/80"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#c6f05c]"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="mt-2 min-h-[48px] w-full rounded-lg bg-[#c6f05c] text-base font-bold text-[#0f1c14] transition-colors hover:bg-[#b6e84a] disabled:opacity-60"
          >
            {isLoading ? 'A entrar...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
