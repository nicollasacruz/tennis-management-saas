# Plano — Fase 2 Multitenant: Isolamento de Dados + WhatsApp por Tenant

## Objetivo

Completar o isolamento multitenant iniciado na Fase 1: associar todos os modelos de
negócio a um `tenantId` e garantir que todas as queries autenticadas e os workers de
fila ficam isolados por organização. Em paralelo, permitir que cada tenant configure a
sua própria instância Evolution (WhatsApp), com painel no frontend.

## Âmbito

Incluído:
- `tenantId` em Plan, Student, Payment, Receipt, Attendance, Activity, StudentStatusHistory, EmailJob, WhatsappJob.
- Uniques por tenant: `Plan(tenantId,name)`, `Student(tenantId,email)`, `Receipt(tenantId,number)`.
- Contexto de tenant por request (AsyncLocalStorage) + middleware global.
- Extension Prisma que injeta `tenantId` automaticamente nas queries dos modelos isolados.
- Stamp explícito de `tenantId` nas escritas (segurança em tempo de compilação).
- Filas: `tenantId` em cada job; worker processa cada job no contexto do seu tenant.
- WhatsApp por tenant: modelo `TenantWhatsappConfig`, endpoints `GET/PUT /whatsapp/config` (ADMIN), envio resolve a instância do tenant.
- Painel WhatsApp no frontend.
- Verificação JWT host↔token (impede reutilizar token entre hosts).

Excluído (próximas fases):
- Provisionamento automático de tenants / formulário de demo.
- Stripe.
- Criação automática de instância Evolution + QR code de ligação (apenas armazenamento manual de credenciais por agora).
- Wildcard DNS.

## Arquitetura

- **`TenantContext`** (`src/tenants/tenant-context.ts`): `AsyncLocalStorage<{ tenantId }>`.
- **`TenantContextMiddleware`** (global): resolve tenant pelo host e executa o request dentro do contexto. Resolução suave (rotas públicas/health seguem sem tenant).
- **Cliente Prisma base** (`PrismaService`): conexão, raw SQL e workers (escape-hatch explícito).
- **Cliente isolado** (`TENANT_DB`, `src/prisma/tenant-scope.ts`): `base.$extends(...)` que injeta `tenantId` no `where`/`data`. Modelos de negócio injetam `TENANT_DB`; as call-sites `this.prisma.x` ficam iguais.
- Reads/updates/deletes/aggregates → isolados automaticamente pela extension. Writes (`create`/`createMany`/`upsert.create`) → `tenantId` explícito via `TenantContext` (o tipo do Prisma exige-o) + extension como rede de segurança.
- Workers (`mail-queue`, `whatsapp-queue`): claim global (raw SQL), processamento em `tenantContext.run({ tenantId: job.tenantId }, ...)`.

## Etapas

1. Schema + migração `20260531120000_add_tenant_scope_to_business` (nullable → backfill `tenant_demo` → NOT NULL → FK → índices) + `TenantWhatsappConfig` + enum `WhatsappConnectionStatus`.
2. `TenantContext` + middleware + `TenantsService.tryResolveFromHeaders` + verificação host↔token no `JwtStrategy`.
3. Extension (`tenant-scope.ts`) + provider `TENANT_DB` no `PrismaModule` + troca de injeção nos serviços de negócio + stamp explícito nas escritas.
4. Filas: `tenantId` no enqueue + `run(job.tenantId)` no processamento; `communications.service` isolado + guard de tenant no retry.
5. WhatsApp por tenant: `TenantWhatsappConfigService`, endpoints, `RolesGuard`/`@Roles`, resolução no `WhatsappService`.
6. Seed (stamp + uniques compostas + config demo a partir do env) + `.env.example`.
7. Painel WhatsApp no `apps/web` (`/whatsapp`).
8. Testes (`tenant-scope`, `whatsapp.service`) + typecheck + build + migração Docker + isolamento e2e.

## Ficheiros-chave

- `apps/api/prisma/schema.prisma`, `apps/api/prisma/migrations/20260531120000_*/migration.sql`
- `apps/api/src/tenants/tenant-context.ts`, `tenant-context.middleware.ts`, `tenants.service.ts`, `src/app.module.ts`
- `apps/api/src/prisma/tenant-scope.ts`, `prisma.module.ts`
- Serviços (`TENANT_DB`): students, plans, payments (+billing), attendances, activities, dashboard, communications
- Filas: `mail/mail-queue.service.ts`, `whatsapp/whatsapp-queue.service.ts`
- WhatsApp: `whatsapp/tenant-whatsapp-config.service.ts`, `whatsapp.service.ts`, `whatsapp.controller.ts`, `whatsapp.module.ts`
- Auth: `auth/jwt.strategy.ts`, `auth/roles.guard.ts`, `auth/roles.decorator.ts`
- Frontend: `apps/web/src/app/(app)/whatsapp/page.tsx`, `lib/api.ts`, `types/index.ts`, `app/(app)/layout.tsx`
