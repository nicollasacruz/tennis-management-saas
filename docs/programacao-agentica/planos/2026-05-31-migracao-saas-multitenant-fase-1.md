# Migracao SaaS Multitenant Fase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar a fundacao multitenant para resolver tenant por host e autenticar utilizadores com `tenantId`.

**Architecture:** Esta fase mantem uma unica base de dados PostgreSQL e acrescenta `Tenant` como raiz de isolamento. O login passa a resolver o tenant a partir do hostname e o JWT passa a transportar `tenantId`; o isolamento completo das queries de negocio sera feito em fases seguintes.

**Tech Stack:** NestJS, Prisma, PostgreSQL, JWT, npm workspaces, tsx para testes simples.

---

## Escopo

Incluido nesta fase:

- Criar o modelo `Tenant`.
- Associar `SystemUser` ao tenant para permitir login por tenant.
- Resolver tenant por `Host`/`X-Forwarded-Host`.
- Incluir `tenantId` no JWT e no utilizador autenticado.
- Ajustar seed e script de criacao de admin para o tenant inicial `esaf`.
- Manter compatibilidade com `jwilder/nginx-proxy` e subdominios conhecidos.

Fora desta fase:

- Isolar todos os modelos de negocio por `tenantId`.
- Stripe.
- Provisionamento automatico completo.
- Pedido de demonstracao.
- Wildcard DNS operacional.

## Ficheiros

- Criar: `apps/api/src/tenants/tenant-host.ts`
- Criar: `apps/api/src/tenants/tenants.service.ts`
- Criar: `apps/api/src/tenants/tenants.module.ts`
- Criar: `apps/api/test/tenant-host.test.ts`
- Modificar: `apps/api/prisma/schema.prisma`
- Modificar: `apps/api/src/app.module.ts`
- Modificar: `apps/api/src/auth/auth.controller.ts`
- Modificar: `apps/api/src/auth/auth.service.ts`
- Modificar: `apps/api/src/auth/jwt.strategy.ts`
- Modificar: `apps/api/prisma/seed.ts`
- Modificar: `apps/api/prisma/create-admin.js`
- Modificar: `apps/api/package.json`
- Modificar: `.env.example`
- Criar: `docs/programacao-agentica/execucoes/2026-05-31-migracao-saas-multitenant-fase-1.md`
- Criar: `docs/programacao-agentica/verificacoes/2026-05-31-migracao-saas-multitenant-fase-1.md`

## Tarefas

### Task 1: Resolver host de tenant

- [ ] Escrever teste falhado para normalizar hosts com porta, `x-forwarded-host` com varios valores e subdominio dentro de `SAAS_ROOT_DOMAIN`.
- [ ] Executar `npm --workspace apps/api run test` e confirmar falha por modulo inexistente.
- [ ] Implementar `tenant-host.ts` com funcoes puras.
- [ ] Executar testes e confirmar sucesso.

### Task 2: Modelo Prisma inicial

- [ ] Adicionar enum `TenantStatus`.
- [ ] Adicionar modelo `Tenant`.
- [ ] Adicionar `tenantId` obrigatorio a `SystemUser`.
- [ ] Trocar unicidade global de `SystemUser.email` por `@@unique([tenantId, email])`.
- [ ] Gerar migracao Prisma para criar tenant `esaf` e associar utilizadores existentes.
- [ ] Executar `npm run db:generate`.

### Task 3: Servico de tenants

- [ ] Criar `TenantsService` para procurar tenant por host.
- [ ] Permitir fallback por `DEFAULT_TENANT_SLUG` em desenvolvimento.
- [ ] Registar `TenantsModule` no `AppModule`.
- [ ] Usar mensagens de erro em portugues de Portugal.

### Task 4: Login e JWT com tenant

- [ ] Alterar `AuthController` para passar headers ao login.
- [ ] Alterar `AuthService.validateUser` para procurar por `(tenantId, email)`.
- [ ] Alterar payload JWT para incluir `tenantId`.
- [ ] Alterar `JwtStrategy` para validar utilizador por `(id, tenantId)`.

### Task 5: Seed e admin

- [ ] Ajustar `seed.ts` para criar/upsert tenant `esaf`.
- [ ] Ajustar utilizadores de demonstracao para `tenantId`.
- [ ] Ajustar `create-admin.js` para criar/promover admin dentro do tenant configurado.

### Task 6: Documentacao e verificacao

- [ ] Atualizar `.env.example` com `SAAS_ROOT_DOMAIN` e `DEFAULT_TENANT_SLUG`.
- [ ] Registar execucao em `docs/programacao-agentica/execucoes/`.
- [ ] Executar `npm --workspace apps/api run test`.
- [ ] Executar `npm --workspace apps/api run typecheck`.
- [ ] Executar `npm run build`.
- [ ] Registar evidencias em `docs/programacao-agentica/verificacoes/`.

## Riscos

- A migracao Prisma precisa preservar utilizadores existentes criando o tenant `esaf` antes de tornar `tenantId` obrigatorio.
- O isolamento total ainda nao fica completo nesta fase; endpoints autenticados passam a saber o tenant, mas queries de negocio ainda precisam de refatoracao posterior.
- Hosts neutros como `app.tenis.esaf.run.place` podem exigir fluxo de escolha de tenant numa fase seguinte.
