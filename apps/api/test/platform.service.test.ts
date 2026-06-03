import 'reflect-metadata';
import assert from 'node:assert/strict';
import { TenantStatus } from '@prisma/client';
import { PlatformService } from '../src/platform/platform.service';

async function main() {
  const tenants = new Map<string, any>([
    [
      't_1',
      {
        id: 't_1',
        name: 'Clube A',
        slug: 'clube-a',
        primaryHost: 'clube-a.clubtenispro.com',
        status: TenantStatus.ACTIVE,
        stripeCustomerId: 'cus_1',
        stripeSubscriptionId: 'sub_1',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  ]);

  const prisma = {
    tenant: {
      findMany: async () => [...tenants.values()],
      findUnique: async ({ where }: any) => tenants.get(where.id) ?? null,
      update: async ({ where, data }: any) => {
        const t = { ...tenants.get(where.id), ...data };
        tenants.set(where.id, t);
        return t;
      },
      groupBy: async () => [
        { status: TenantStatus.ACTIVE, _count: { _all: 1 } },
        { status: TenantStatus.SUSPENDED, _count: { _all: 2 } },
      ],
      count: async () => 1,
    },
    student: { count: async () => 5 },
    systemUser: { count: async () => 3 },
  };

  // Billing mock: sem capacidade de subscrição (não expõe getSubscription).
  const billing = { name: 'mock', createCheckoutSession: async () => ({}) };

  const service = new PlatformService(prisma as any, billing as any);

  // Bloquear => SUSPENDED.
  const suspended = await service.suspend('t_1');
  assert.equal(suspended.status, TenantStatus.SUSPENDED);

  // Reativar => ACTIVE.
  const reactivated = await service.reactivate('t_1');
  assert.equal(reactivated.status, TenantStatus.ACTIVE);

  // Arquivar => ARCHIVED.
  const archived = await service.archive('t_1');
  assert.equal(archived.status, TenantStatus.ARCHIVED);

  // Escola inexistente => NotFound.
  await assert.rejects(() => service.suspend('nope'), /não encontrada/);

  // Detalhe inclui contagens; subscrição null (billing mock).
  tenants.set('t_1', { ...tenants.get('t_1'), status: TenantStatus.ACTIVE });
  const detail = await service.getTenant('t_1');
  assert.equal(detail.counts.students, 5);
  assert.equal(detail.counts.systemUsers, 3);
  assert.equal(detail.subscription, null);

  // Métricas: contagens por estado + MRR null (sem Stripe).
  const metrics = await service.metrics();
  assert.equal(metrics.active, 1);
  assert.equal(metrics.suspended, 2);
  assert.equal(metrics.total, 3);
  assert.equal(metrics.mrr, null);

  console.log('platform.service: OK');
}

void main();
