import 'reflect-metadata';
import assert from 'node:assert/strict';
import { TenantStatus } from '@prisma/client';
import { OnboardingService } from '../src/onboarding/onboarding.service';

const ONBOARDING_STATUS = {
  PENDING: 'PENDING',
  COMPLETED: 'COMPLETED',
};

function makePrisma() {
  const sessions: any[] = [];
  const tenants: any[] = [];
  const users: any[] = [];

  return {
    sessions,
    tenants,
    users,
    tenant: {
      findUnique: async ({ where }: any) =>
        tenants.find((tenant) => tenant.slug === where.slug || tenant.id === where.id) ??
        null,
      create: async ({ data }: any) => {
        const tenant = {
          id: `tenant_${data.slug}`,
          ...data,
          status: data.status ?? TenantStatus.ACTIVE,
        };
        tenants.push(tenant);
        return tenant;
      },
    },
    systemUser: {
      create: async ({ data }: any) => {
        users.push(data);
        return data;
      },
    },
    onboardingSession: {
      create: async ({ data }: any) => {
        const session = {
          id: `sess_${sessions.length + 1}`,
          ...data,
          createdTenantId: null,
          providerSessionId: null,
        };
        sessions.push(session);
        return session;
      },
      findUnique: async ({ where }: any) =>
        sessions.find(
          (session) =>
            session.providerSessionId === where.providerSessionId ||
            session.id === where.id,
        ) ?? null,
      update: async ({ where, data }: any) => {
        const session = sessions.find((item) => item.id === where.id);
        Object.assign(session, data);
        return session;
      },
    },
    $transaction: async (callback: any) => callback(prisma),
  } as any;
}

const prisma = makePrisma();

async function main() {
  const previousBase = process.env.ONBOARDING_PUBLIC_BASE_URL;
  const previousDomain = process.env.SAAS_ROOT_DOMAIN;
  process.env.ONBOARDING_PUBLIC_BASE_URL = 'http://localhost:8080';
  process.env.SAAS_ROOT_DOMAIN = 'clubtenispro.local';

  const createdInputs: any[] = [];
  const billing = {
    name: 'mock',
    createCheckoutSession: async (input: any) => {
      createdInputs.push(input);
      return {
        provider: 'mock',
        sessionId: 'mock_session_1',
        url: input.payUrl.replace('{CHECKOUT_SESSION_ID}', 'mock_session_1'),
      };
    },
  };

  const sentMails: any[] = [];
  const mailer = {
    send: async (input: any) => {
      sentMails.push(input);
      return { delivered: true };
    },
  };

  try {
    const service = new OnboardingService(prisma, billing as any, mailer as any);
    const checkout = await service.createCheckout({
      schoolName: 'Clube Rápido',
      slug: 'clube-rapido',
      adminName: 'Ana Silva',
      adminEmail: 'ANA@EXEMPLO.PT',
      password: 'segredo123',
      locale: 'pt',
    } as any);

    assert.equal(checkout.provider, 'mock');
    assert.equal(checkout.checkoutUrl, 'http://localhost:8080/pt/onboarding/pay?session=mock_session_1');
    assert.equal(createdInputs[0].successUrl, 'http://localhost:8080/pt/onboarding/sucesso?session={CHECKOUT_SESSION_ID}');
    assert.equal(createdInputs[0].cancelUrl, 'http://localhost:8080/pt/onboarding?cancel=1');

    let result = await (service as any).getCheckoutResult('mock_session_1');
    assert.equal(result.status, ONBOARDING_STATUS.PENDING);

    await service.provision({
      sessionId: 'mock_session_1',
      stripeCustomerId: 'cus_123',
      stripeSubscriptionId: 'sub_123',
    });

    result = await (service as any).getCheckoutResult('mock_session_1');
    assert.equal(result.status, ONBOARDING_STATUS.COMPLETED);
    assert.equal(result.slug, 'clube-rapido');
    assert.equal(result.host, 'clube-rapido.clubtenispro.local');
    assert.equal(result.appUrl, 'http://clube-rapido.clubtenispro.local');
    assert.equal(prisma.users[0].email, 'ana@exemplo.pt');

    // Email de boas-vindas enviado com o link de acesso (mock não anexa fatura).
    assert.equal(sentMails.length, 1);
    assert.equal(sentMails[0].to, 'ana@exemplo.pt');
    assert.match(sentMails[0].text, /clube-rapido\.clubtenispro\.local/);
    assert.equal(sentMails[0].attachments.length, 0);
  } finally {
    if (previousBase === undefined) delete process.env.ONBOARDING_PUBLIC_BASE_URL;
    else process.env.ONBOARDING_PUBLIC_BASE_URL = previousBase;
    if (previousDomain === undefined) delete process.env.SAAS_ROOT_DOMAIN;
    else process.env.SAAS_ROOT_DOMAIN = previousDomain;
  }

  console.log('onboarding.service: OK');
}

void main();
