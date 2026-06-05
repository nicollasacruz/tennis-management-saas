import { Prisma } from '@prisma/client';
import type { TenantContext } from '../tenants/tenant-context';
import type { PrismaService } from './prisma.service';

/** Token de injeção do cliente Prisma já isolado por tenant. */
export const TENANT_DB = 'TENANT_DB';

/**
 * Modelos isolados por tenant quando acedidos pelo cliente isolado (TENANT_DB).
 * `Tenant` e `TenantWhatsappConfig` ficam de fora (resolvem/configuram o próprio
 * tenant via cliente base). `SystemUser` está incluído porque o dashboard conta
 * utilizadores pelo cliente isolado; auth, resolução de tenant e a gestão de
 * equipa continuam a usar o cliente base com filtros `tenantId` explícitos.
 */
export const TENANT_SCOPED_MODELS: ReadonlySet<string> = new Set([
  'Plan',
  'Student',
  'Payment',
  'Receipt',
  'Attendance',
  'Activity',
  'StudentStatusHistory',
  'EmailJob',
  'WhatsappJob',
  'SystemUser',
  'Court',
  'ClassSlot',
  'ClassEnrollment',
  'ClassException',
]);

/**
 * Operações que aceitam `where`. Graças ao `extendedWhereUnique` (GA no Prisma 5),
 * findUnique/update/delete aceitam filtros escalares extra junto da chave única,
 * por isso `tenantId` pode ser fundido no `where` de todas elas.
 */
const WHERE_OPERATIONS: ReadonlySet<string> = new Set([
  'findUnique',
  'findUniqueOrThrow',
  'findFirst',
  'findFirstOrThrow',
  'findMany',
  'count',
  'aggregate',
  'groupBy',
  'update',
  'updateMany',
  'delete',
  'deleteMany',
]);

export function isTenantScopedModel(model: string | undefined): boolean {
  return !!model && TENANT_SCOPED_MODELS.has(model);
}

function stampMany(data: unknown, tenantId: string): unknown {
  if (Array.isArray(data)) {
    return data.map((row) => ({ ...(row as object), tenantId }));
  }

  return { ...(data as object), tenantId };
}

/**
 * Injeta `tenantId` nos argumentos de uma operação Prisma. Função pura para ser
 * testável sem base de dados.
 */
export function applyTenantScopeArgs(
  operation: string,
  args: Record<string, unknown> | undefined,
  tenantId: string,
): Record<string, unknown> {
  const next: Record<string, unknown> = { ...(args ?? {}) };

  if (WHERE_OPERATIONS.has(operation)) {
    next.where = { ...((next.where as object) ?? {}), tenantId };
  }

  if (operation === 'create') {
    next.data = { ...((next.data as object) ?? {}), tenantId };
  }

  if (operation === 'createMany') {
    next.data = stampMany(next.data, tenantId);
  }

  if (operation === 'upsert') {
    next.where = { ...((next.where as object) ?? {}), tenantId };
    next.create = { ...((next.create as object) ?? {}), tenantId };
  }

  return next;
}

/**
 * Extension do Prisma que isola automaticamente os modelos de negócio pelo
 * tenant ativo no contexto. Operações sobre modelos isolados sem tenant no
 * contexto falham por desenho (apenas o cliente base é exceção, usado pelos
 * workers e pela resolução de tenant).
 */
export function tenantScopeExtension(getTenantId: () => string | undefined) {
  return Prisma.defineExtension({
    name: 'tenant-scope',
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!isTenantScopedModel(model)) {
            return query(args);
          }

          const tenantId = getTenantId();
          if (!tenantId) {
            throw new Error(
              `Operação '${operation}' em '${model}' sem contexto de tenant.`,
            );
          }

          const scopedArgs = applyTenantScopeArgs(
            operation,
            args as Record<string, unknown>,
            tenantId,
          );
          return query(scopedArgs);
        },
      },
    },
  });
}

export function createTenantScopedClient(
  base: PrismaService,
  tenantContext: TenantContext,
) {
  return base.$extends(tenantScopeExtension(() => tenantContext.getTenantId()));
}

export type TenantPrisma = ReturnType<typeof createTenantScopedClient>;

/** Cliente transacional do cliente isolado por tenant (usado em `$transaction`). */
export type TenantTx = Omit<
  TenantPrisma,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;
