'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function Success() {
  const params = useSearchParams();
  const host = params.get('host') ?? '';
  const appUrl = params.get('appUrl') || (host ? `https://${host}` : '');

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6 py-12 text-center">
      <div className="text-5xl">🎾</div>
      <h1 className="text-2xl font-bold">A sua escola está pronta!</h1>
      <p className="text-sm text-gray-500">
        O endereço já está ativo. Faça login com o email e a palavra-passe que
        definiu.
      </p>
      {appUrl && (
        <a
          href={appUrl}
          className="rounded-md bg-emerald-600 px-4 py-2.5 font-medium text-white"
        >
          Ir para {host}
        </a>
      )}
    </main>
  );
}

export default function SuccessPage() {
  return (
    <Suspense>
      <Success />
    </Suspense>
  );
}
