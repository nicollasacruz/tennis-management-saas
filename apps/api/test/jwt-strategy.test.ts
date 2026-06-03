import 'reflect-metadata';
import assert from 'node:assert/strict';
import { TenantStatus } from '@prisma/client';

process.env.JWT_SECRET = 'test-secret-for-jwt-strategy';

async function main() {
  const { JwtStrategy } = await import('../src/auth/jwt.strategy');

  let tenantStatus: TenantStatus = TenantStatus.ACTIVE;
  let hostTenantId: string | undefined;

  const prisma = {
    systemUser: {
      findFirst: async ({ where }: any) =>
        where.id === 'u_1' && where.tenantId === 't_1'
          ? {
              id: 'u_1',
              tenantId: 't_1',
              email: 'a@esaf.pt',
              fullName: 'Admin',
              role: 'ADMIN',
              isActive: true,
              tenant: { status: tenantStatus },
            }
          : null,
    },
  };
  const tenantContext = { getTenantId: () => hostTenantId };

  const strategy = new JwtStrategy(prisma as any, tenantContext as any);
  const payload = {
    sub: 'u_1',
    tenantId: 't_1',
    email: 'a@esaf.pt',
    role: 'ADMIN',
    fullName: 'Admin',
  };

  // Tenant ACTIVE: sessão válida, sem expor o campo tenant.
  const user = await strategy.validate(payload);
  assert.equal(user.id, 'u_1');
  assert.equal((user as any).tenant, undefined);

  // Tenant TRIALING: também válido.
  tenantStatus = TenantStatus.TRIALING;
  assert.equal((await strategy.validate(payload)).id, 'u_1');

  // Tenant SUSPENDED (bloqueado no gerencial): 401 limpo mesmo com token válido.
  tenantStatus = TenantStatus.SUSPENDED;
  await assert.rejects(() => strategy.validate(payload), /inativa ou indisponível/);

  // Tenant ARCHIVED: idem.
  tenantStatus = TenantStatus.ARCHIVED;
  await assert.rejects(() => strategy.validate(payload), /inativa ou indisponível/);
  tenantStatus = TenantStatus.ACTIVE;

  // Sem tenantId no token: rejeitado.
  await assert.rejects(
    () => strategy.validate({ ...payload, tenantId: '' } as any),
    /sem organização/,
  );

  // Token de outra organização no host atual: rejeitado.
  hostTenantId = 'outro_tenant';
  await assert.rejects(
    () => strategy.validate(payload),
    /não pertence a esta organização/,
  );
  hostTenantId = undefined;

  console.log('jwt-strategy: OK');
}

void main();
