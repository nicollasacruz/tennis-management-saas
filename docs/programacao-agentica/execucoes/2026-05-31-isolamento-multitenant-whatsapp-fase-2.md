# Execução — Fase 2 Multitenant: Isolamento + WhatsApp por Tenant

Referência: `docs/programacao-agentica/planos/2026-05-31-isolamento-multitenant-whatsapp-fase-2.md`

## Alterações implementadas

### Base de dados / schema
- Adicionado `tenantId` (obrigatório, FK `Tenant` ON DELETE RESTRICT) a Plan, Student, Payment, Receipt, Attendance, Activity, StudentStatusHistory, EmailJob, WhatsappJob.
- Uniques agora por tenant: `Plan(tenantId,name)`, `Student(tenantId,email)`, `Receipt(tenantId,number)`. Mantido `Receipt.paymentId` único global.
- Índices `tenantId` (e `(tenantId,status,scheduledAt)` nas filas).
- Novo enum `WhatsappConnectionStatus` e modelo `TenantWhatsappConfig` (1-1 com Tenant).
- Migração `20260531120000_add_tenant_scope_to_business`: coluna nullable → backfill `tenant_esaf` → NOT NULL → FK/índices, seguindo o padrão da migração da Fase 1.

### Isolamento (backend)
- `TenantContext` (AsyncLocalStorage) e `TenantContextMiddleware` global em `AppModule`.
- `TenantsService.tryResolveFromHeaders` (resolução suave que não lança).
- `JwtStrategy` injeta `TenantContext` e rejeita token cujo `tenantId` difira do tenant do host.
- `tenant-scope.ts`: extension Prisma (`$allModels.$allOperations`) que injeta `tenantId` em where/data dos modelos isolados; lança se uma operação isolada correr sem contexto. Provider `TENANT_DB` no `PrismaModule` (`@Global`).
- Serviços de negócio passam a injetar `TENANT_DB` (call-sites inalteradas). Escritas (`create`/`createMany`/`upsert.create`) recebem `tenantId` explícito via `TenantContext` (exigido pelos tipos do Prisma; a extension mantém-se como rede de segurança).
- `SystemUser` incluído no conjunto isolado para que o dashboard conte utilizadores por tenant (auth/equipa continuam no cliente base com filtro explícito).

### Filas
- `mail-queue` e `whatsapp-queue`: enqueue grava `tenantId` (do contexto); o worker mantém o claim global (raw SQL) mas processa cada job dentro de `tenantContext.run({ tenantId: job.tenantId }, ...)`.
- `communications.service` isolado via `TENANT_DB`; `retry` valida que o job pertence ao tenant antes de reenfileirar.

### WhatsApp por tenant
- `TenantWhatsappConfigService` (cliente base + filtro explícito por tenant): leitura mascarada, upsert idempotente (token só muda quando enviado).
- Endpoints `GET /whatsapp/config` (autenticado) e `PUT /whatsapp/config` (ADMIN via `RolesGuard`/`@Roles`).
- `WhatsappService.sendDocument` resolve a instância (instanceId/token) do tenant atual; `EVOLUTION_GO_BASE_URL` continua global (servidor partilhado).
- Seed migra a instância global (env) para a config do esaf; `.env.example` documenta que `EVOLUTION_GO_INSTANCE_ID/TOKEN` passam a ser fallback/seed.

### Frontend
- Nova página `/whatsapp` (painel): vê estado/instância, grava config (apenas ADMIN) e envia teste. Item de navegação adicionado.

### Endurecimento de segurança (repo público)
- Removido o segredo JWT hardcoded público (`'esaf-secret-key-change-in-production'`). Novo `auth/jwt-secret.ts#resolveJwtSecret`: em produção **lança** se `JWT_SECRET` ausente; em dev usa fallback local. Usado por `auth.module.ts` (assinatura) e `jwt.strategy.ts` (verificação).
- `.env.example` documenta `JWT_SECRET` como obrigatório em produção.
- **Ação de deploy**: garantir `JWT_SECRET` no `.env` do VPS antes do próximo deploy (caso contrário a API não arranca). Tokens emitidos com o fallback antigo deixam de ser válidos.

## Desvios em relação ao plano
- Em vez de a extension também tratar findUnique por pós-verificação do resultado, usou-se o `extendedWhereUnique` (GA no Prisma 5): `tenantId` é fundido no `where` de findUnique/update/delete diretamente.
- Como os tipos do Prisma exigem `tenantId` nas escritas, optou-se por stamp explícito nas escritas (em vez de depender só da extension) — mais seguro em tempo de compilação. A extension continua a stampar como defesa.

## Pendentes (próximas fases)
- Criação/ligação automática de instância Evolution + QR code no painel.
- Formulário de demo + provisionamento automático de tenants.
- Stripe (subscrição SaaS separada das mensalidades).
- Wildcard DNS/TLS para novos tenants.
- Considerar cifrar `instanceToken` em repouso.
