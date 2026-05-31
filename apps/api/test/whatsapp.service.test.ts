import 'reflect-metadata';
import assert from 'node:assert/strict';
import { WhatsappService } from '../src/whatsapp/whatsapp.service';

type Creds = { instanceId: string; instanceToken: string } | null;

function makeService(opts: { baseUrl?: string; tenantId?: string; creds: Creds }) {
  const config = {
    get: (key: string) =>
      key === 'EVOLUTION_GO_BASE_URL' ? opts.baseUrl : undefined,
  } as any;
  const tenantContext = {
    getTenantIdOrThrow: () => {
      if (!opts.tenantId) throw new Error('Operação sem contexto de tenant.');
      return opts.tenantId;
    },
  } as any;
  const whatsappConfig = {
    getSendCredentials: async () => opts.creds,
  } as any;
  return new WhatsappService(config, tenantContext, whatsappConfig);
}

const payload = {
  number: '910000001',
  type: 'document',
  url: 'https://exemplo/recibo.pdf',
  filename: 'recibo.pdf',
} as any;

async function main() {
  // Sem credenciais do tenant → erro claro
  await assert.rejects(
    makeService({ baseUrl: 'http://evo', tenantId: 't1', creds: null }).sendDocument(payload),
    /não configurado para esta organização/i,
  );

  // Sem base URL global → erro
  await assert.rejects(
    makeService({
      baseUrl: undefined,
      tenantId: 't1',
      creds: { instanceId: 'i', instanceToken: 'tok' },
    }).sendDocument(payload),
    /EVOLUTION_GO_BASE_URL/,
  );

  // Com credenciais → usa instanceId/token do tenant no envio
  let captured: { url: string; init: any } | null = null;
  const originalFetch = global.fetch;
  global.fetch = (async (url: string, init: any) => {
    captured = { url, init };
    return { ok: true, json: async () => ({ success: true }) } as any;
  }) as any;

  try {
    const result = await makeService({
      baseUrl: 'http://evo',
      tenantId: 't1',
      creds: { instanceId: 'INST', instanceToken: 'TOK' },
    }).sendDocument(payload);

    assert.equal(result.delivered, true);
    assert.ok(captured, 'fetch deveria ter sido chamado');
    assert.equal(captured!.url, 'http://evo/send/media');
    assert.equal(captured!.init.headers.apikey, 'TOK');
    assert.ok(String(captured!.init.body).includes('"id":"INST"'));
  } finally {
    global.fetch = originalFetch;
  }

  console.log('whatsapp.service: OK');
}

void main();
