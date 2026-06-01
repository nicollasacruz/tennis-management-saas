import 'reflect-metadata';
import assert from 'node:assert/strict';
import { EvolutionApiService } from '../src/whatsapp/evolution-api.service';

function makeService() {
  const config = {
    get: (key: string) => {
      if (key === 'EVOLUTION_API_BASE_URL') return 'http://evo';
      if (key === 'EVOLUTION_API_KEY') return 'GLOBAL';
      return undefined;
    },
  } as any;

  return new EvolutionApiService(config);
}

async function main() {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const originalFetch = global.fetch;

  global.fetch = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });

    if (url.endsWith('/instance/fetchInstances')) {
      return { ok: true, json: async () => [] } as any;
    }

    if (url.endsWith('/instance/create')) {
      return {
        ok: true,
        json: async () => ({
          instance: {
            instanceName: 'tenant-esaf',
            instanceId: 'uuid-1',
            status: 'connecting',
          },
          hash: 'TOKEN',
        }),
      } as any;
    }

    return {
      ok: true,
      json: async () => ({
        qrcode: {
          base64: 'abc123',
          code: 'qr-text',
        },
      }),
    } as any;
  }) as any;

  try {
    const result = await makeService().createOrConnectInstance({
      instanceName: 'tenant-esaf',
      instanceToken: 'TOKEN',
    });

    assert.equal(result.instanceName, 'tenant-esaf');
    assert.equal(result.instanceId, 'uuid-1');
    assert.equal(result.instanceToken, 'TOKEN');
    assert.equal(result.status, 'CONNECTING');
    assert.equal(result.qrCodeBase64, 'data:image/png;base64,abc123');
    assert.equal(result.qrCodeText, 'qr-text');
    assert.equal(calls[0].url, 'http://evo/instance/fetchInstances');
    assert.equal(calls[1].url, 'http://evo/instance/create');
    assert.equal(calls[2].url, 'http://evo/instance/connect/tenant-esaf');
    assert.equal((calls[0].init.headers as Record<string, string>).apikey, 'GLOBAL');
  } finally {
    global.fetch = originalFetch;
  }

  calls.length = 0;
  global.fetch = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });

    return {
      ok: true,
      json: async () => ({
        status: 'SUCCESS',
        error: false,
        response: { message: 'Instance logged out' },
      }),
    } as any;
  }) as any;

  try {
    await makeService().logoutInstance('tenant-esaf');

    assert.equal(calls[0].url, 'http://evo/instance/logout/tenant-esaf');
    assert.equal(calls[0].init.method, 'DELETE');
    assert.equal((calls[0].init.headers as Record<string, string>).apikey, 'GLOBAL');
  } finally {
    global.fetch = originalFetch;
  }

  calls.length = 0;
  global.fetch = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });

    return {
      ok: true,
      json: async () => [
        {
          id: 'uuid-1',
          name: 'tenant-esaf',
          connectionStatus: 'open',
          ownerJid: '351910607636@s.whatsapp.net',
          number: null,
          token: 'TOKEN',
        },
      ],
    } as any;
  }) as any;

  try {
    const status = await makeService().getInstanceStatus('tenant-esaf');

    assert.deepEqual(status, {
      instanceId: 'uuid-1',
      phoneNumber: '351910607636',
      status: 'CONNECTED',
    });
    assert.equal(calls[0].url, 'http://evo/instance/fetchInstances');
  } finally {
    global.fetch = originalFetch;
  }

  console.log('evolution-api.service: OK');
}

void main();
