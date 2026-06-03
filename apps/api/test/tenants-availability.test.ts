import 'reflect-metadata';
import assert from 'node:assert/strict';
import { TenantStatus } from '@prisma/client';
import { TenantsService } from '../src/tenants/tenants.service';

async function main() {
  function buildService(tenant: any) {
    const prisma = {
      tenant: {
        findUnique: async ({ where }: any) =>
          where.primaryHost === tenant.primaryHost ? tenant : null,
        findUniqueOrThrow: async () => tenant,
      },
    };
    // Billing mock sem suporte a subscrições.
    const billing = { name: 'mock', createCheckoutSession: async () => ({}) };
    return new TenantsService(prisma as any, billing as any);
  }

  const base = {
    id: 't_1',
    name: 'Clube A',
    slug: 'clube-a',
    primaryHost: 'clube-a.clubtenispro.com',
    stripeSubscriptionId: null,
    stripeCustomerId: null,
  };

  // Escola ACTIVE: login resolve normalmente.
  const active = buildService({ ...base, status: TenantStatus.ACTIVE });
  const resolved = await active.resolveByHost('clube-a.clubtenispro.com');
  assert.equal(resolved.id, 't_1');

  // Escola SUSPENDED: bloqueada (não resolve => login impossível).
  const suspended = buildService({ ...base, status: TenantStatus.SUSPENDED });
  await assert.rejects(
    () => suspended.resolveByHost('clube-a.clubtenispro.com'),
    /inativa ou indisponível/,
  );

  // Escola ARCHIVED: também bloqueada.
  const archived = buildService({ ...base, status: TenantStatus.ARCHIVED });
  await assert.rejects(
    () => archived.resolveByHost('clube-a.clubtenispro.com'),
    /inativa ou indisponível/,
  );

  // getSubscription: sem assinatura/Stripe => configured false.
  const subResult = await active.getSubscription('t_1');
  assert.equal(subResult.configured, false);
  assert.equal(subResult.subscription, null);

  // Portal de faturação indisponível com billing mock.
  await assert.rejects(
    () => active.createBillingPortal('t_1'),
    /indisponível/,
  );

  console.log('tenants-availability: OK');
}

void main();
