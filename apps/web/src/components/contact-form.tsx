'use client';

import { useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';

type Status = 'idle' | 'submitting' | 'success';

export function ContactForm() {
  const t = useTranslations('form');
  const [status, setStatus] = useState<Status>('idle');

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('submitting');
    const formData = new FormData(event.currentTarget);
    const data = Object.fromEntries(formData);
    console.info('Pedido de demonstração:', data);
    setTimeout(() => setStatus('success'), 600);
  }

  if (status === 'success') {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--cream)] p-8 text-center">
        <h3 className="text-xl font-bold text-[var(--ink)]">{t('successTitle')}</h3>
        <p className="mt-2 text-[var(--muted)]">{t('successText')}</p>
      </div>
    );
  }

  const submitting = status === 'submitting';

  return (
    <form
      onSubmit={handleSubmit}
      className="grid grid-cols-1 gap-4 rounded-2xl border border-[var(--border)] bg-[var(--cream)] p-6 md:grid-cols-2"
    >
      <Field label={t('nome')} name="nome" required />
      <Field label={t('email')} name="email" type="email" required />
      <Field label={t('organizacao')} name="organizacao" required />
      <Field label={t('telefone')} name="telefone" type="tel" />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="alunos" className="text-sm font-semibold text-[var(--ink)]">
          {t('alunos')}
        </label>
        <select
          id="alunos"
          name="alunos"
          required
          className="rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[#97ce2a]"
        >
          <option value="">{t('alunosPlaceholder')}</option>
          <option value="1-30">{t('alunos1')}</option>
          <option value="31-100">{t('alunos2')}</option>
          <option value="101-300">{t('alunos3')}</option>
          <option value="300+">{t('alunos4')}</option>
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="categoria" className="text-sm font-semibold text-[var(--ink)]">
          {t('categoria')}
        </label>
        <select
          id="categoria"
          name="categoria"
          required
          className="rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[#97ce2a]"
        >
          <option value="">{t('categoriaPlaceholder')}</option>
          <option value="escola">{t('catEscola')}</option>
          <option value="clube">{t('catClube')}</option>
          <option value="coach">{t('catCoach')}</option>
          <option value="adaptado">{t('catAdaptado')}</option>
          <option value="rede">{t('catRede')}</option>
        </select>
      </div>
      <div className="md:col-span-2 flex flex-col gap-1.5">
        <label htmlFor="mensagem" className="text-sm font-semibold text-[var(--ink)]">
          {t('mensagem')}
        </label>
        <textarea
          id="mensagem"
          name="mensagem"
          rows={4}
          placeholder={t('mensagemPlaceholder')}
          className="rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[#97ce2a]"
        />
      </div>
      <label className="md:col-span-2 flex items-start gap-2 text-sm text-[var(--muted)]">
        <input type="checkbox" name="privacidade" required className="mt-1 h-4 w-4 accent-[#97ce2a]" />
        <span>{t('privacidade')}</span>
      </label>
      <div className="md:col-span-2">
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-[var(--ink)] px-6 py-3 font-bold text-white transition-colors hover:bg-[var(--ink-soft)] disabled:opacity-60 md:w-auto"
        >
          {submitting ? t('submitting') : t('submit')}
        </button>
      </div>
    </form>
  );
}

type FieldProps = {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
};

function Field({ label, name, type = 'text', required }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-sm font-semibold text-[var(--ink)]">
        {label}
        {required ? <span className="text-[#97ce2a]"> *</span> : null}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        className="rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[#97ce2a]"
      />
    </div>
  );
}
