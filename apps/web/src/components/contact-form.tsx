'use client';

import { useState, type FormEvent } from 'react';

type Status = 'idle' | 'submitting' | 'success';

export function ContactForm() {
  const [status, setStatus] = useState<Status>('idle');

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('submitting');
    setTimeout(() => setStatus('success'), 600);
  }

  if (status === 'success') {
    return (
      <div className="rounded-2xl border border-[#d9e5c1] bg-white/70 p-8 text-center">
        <h3 className="text-xl font-bold text-[#183223]">Pedido enviado</h3>
        <p className="mt-2 text-[#566857]">
          Obrigado pelo teu interesse. Entraremos em contacto em breve.
        </p>
      </div>
    );
  }

  const submitting = status === 'submitting';

  return (
    <form
      onSubmit={handleSubmit}
      className="grid grid-cols-1 gap-4 rounded-2xl border border-[#d9e5c1] bg-white/70 p-6 md:grid-cols-2"
    >
      <Field label="Nome completo" name="nome" required />
      <Field label="E-mail" name="email" type="email" required />
      <Field label="Telefone" name="telefone" type="tel" />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="modalidade" className="text-sm font-semibold text-[#183223]">
          Modalidade de interesse
        </label>
        <select
          id="modalidade"
          name="modalidade"
          required
          className="rounded-lg border border-[#d9e5c1] bg-white px-3 py-2 text-sm text-[#183223] outline-none focus:border-[#97ce2a]"
        >
          <option value="">Seleciona uma opção</option>
          <option value="convencional">Ténis Convencional</option>
          <option value="adaptado">Ténis Adaptado</option>
          <option value="escolinhas">Escolinhas</option>
        </select>
      </div>
      <Field label="Idade do candidato (se menor)" name="idade" type="number" min={3} max={99} />
      <div className="md:col-span-2 flex flex-col gap-1.5">
        <label htmlFor="mensagem" className="text-sm font-semibold text-[#183223]">
          Mensagem
        </label>
        <textarea
          id="mensagem"
          name="mensagem"
          rows={4}
          className="rounded-lg border border-[#d9e5c1] bg-white px-3 py-2 text-sm text-[#183223] outline-none focus:border-[#97ce2a]"
        />
      </div>
      <label className="md:col-span-2 flex items-start gap-2 text-sm text-[#566857]">
        <input
          type="checkbox"
          name="privacidade"
          required
          className="mt-1 h-4 w-4 accent-[#97ce2a]"
        />
        <span>Concordo com a política de privacidade.</span>
      </label>
      <div className="md:col-span-2">
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-[#183223] px-6 py-3 font-bold text-white transition-colors hover:bg-[#24410b] disabled:opacity-60 md:w-auto"
        >
          {submitting ? 'A enviar…' : 'Enviar Pedido de Inscrição'}
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
  min?: number;
  max?: number;
};

function Field({ label, name, type = 'text', required, min, max }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-sm font-semibold text-[#183223]">
        {label}
        {required ? <span className="text-[#97ce2a]"> *</span> : null}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        min={min}
        max={max}
        className="rounded-lg border border-[#d9e5c1] bg-white px-3 py-2 text-sm text-[#183223] outline-none focus:border-[#97ce2a]"
      />
    </div>
  );
}
