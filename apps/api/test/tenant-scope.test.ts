import assert from 'node:assert/strict';
import {
  applyTenantScopeArgs,
  isTenantScopedModel,
} from '../src/prisma/tenant-scope';

const T = 'tenant_x';

// Modelos isolados vs. fora do isolamento
assert.equal(isTenantScopedModel('Student'), true);
assert.equal(isTenantScopedModel('Payment'), true);
assert.equal(isTenantScopedModel('SystemUser'), true);
assert.equal(isTenantScopedModel('Tenant'), false);
assert.equal(isTenantScopedModel('TenantWhatsappConfig'), false);
assert.equal(isTenantScopedModel(undefined), false);

// findMany sem where → injeta where { tenantId }
assert.deepEqual(applyTenantScopeArgs('findMany', undefined, T), {
  where: { tenantId: T },
});

// findMany com where existente → faz merge mantendo o resto dos args
assert.deepEqual(
  applyTenantScopeArgs(
    'findMany',
    { where: { isActive: true }, orderBy: { name: 'asc' } },
    T,
  ),
  { where: { isActive: true, tenantId: T }, orderBy: { name: 'asc' } },
);

// findUnique por id → adiciona tenantId ao where (extendedWhereUnique do Prisma 5)
assert.deepEqual(applyTenantScopeArgs('findUnique', { where: { id: 'abc' } }, T), {
  where: { id: 'abc', tenantId: T },
});
assert.deepEqual(
  applyTenantScopeArgs('findUniqueOrThrow', { where: { id: 'abc' } }, T),
  { where: { id: 'abc', tenantId: T } },
);

// update / delete → where isolado, data preservada
assert.deepEqual(
  applyTenantScopeArgs('update', { where: { id: 'abc' }, data: { name: 'x' } }, T),
  { where: { id: 'abc', tenantId: T }, data: { name: 'x' } },
);
assert.deepEqual(applyTenantScopeArgs('delete', { where: { id: 'abc' } }, T), {
  where: { id: 'abc', tenantId: T },
});

// create → stamp em data
assert.deepEqual(applyTenantScopeArgs('create', { data: { name: 'x' } }, T), {
  data: { name: 'x', tenantId: T },
});

// createMany → stamp em cada linha (array) e no objeto único
assert.deepEqual(
  applyTenantScopeArgs('createMany', { data: [{ a: 1 }, { a: 2 }] }, T),
  { data: [{ a: 1, tenantId: T }, { a: 2, tenantId: T }] },
);
assert.deepEqual(applyTenantScopeArgs('createMany', { data: { a: 1 } }, T), {
  data: { a: 1, tenantId: T },
});

// upsert → where + create isolados, update preservado
assert.deepEqual(
  applyTenantScopeArgs(
    'upsert',
    { where: { id: 'abc' }, create: { name: 'x' }, update: { name: 'y' } },
    T,
  ),
  {
    where: { id: 'abc', tenantId: T },
    create: { name: 'x', tenantId: T },
    update: { name: 'y' },
  },
);

// count / aggregate / groupBy → merge no where
assert.deepEqual(applyTenantScopeArgs('count', { where: { status: 'PAID' } }, T), {
  where: { status: 'PAID', tenantId: T },
});
assert.deepEqual(
  applyTenantScopeArgs(
    'aggregate',
    { _sum: { amountCents: true }, where: { status: 'PAID' } },
    T,
  ),
  { _sum: { amountCents: true }, where: { status: 'PAID', tenantId: T } },
);

console.log('tenant-scope: OK');
