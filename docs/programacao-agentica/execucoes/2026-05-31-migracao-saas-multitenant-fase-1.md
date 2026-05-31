# Execucao: migracao SaaS multitenant fase 1

## Referencia

- Plano: `docs/programacao-agentica/planos/2026-05-31-migracao-saas-multitenant-fase-1.md`
- Spec: `docs/superpowers/specs/2026-05-30-saas-jwilder-multitenant-design.md`

## Alteracoes realizadas

- Criado o modelo `Tenant` no Prisma com `slug`, `primaryHost`, `status` e campos iniciais de recibo.
- Adicionado `tenantId` a `SystemUser` com unicidade por `(tenantId, email)`.
- Criada a migracao `20260531100000_add_tenant_foundation`, que cria o tenant inicial `esaf` e associa utilizadores existentes.
- Criado modulo `TenantsModule` com resolucao por `Host` e `X-Forwarded-Host`.
- Alterado login para resolver tenant antes de validar credenciais.
- Alterado JWT para incluir `tenantId`.
- Alterada validacao JWT para confirmar que o utilizador pertence ao tenant do token.
- Ajustada gestao de equipa para criar e listar utilizadores dentro do tenant da sessao.
- Ajustado `seed.ts` e `create-admin.js` para operar sobre o tenant `esaf`.
- Atualizado `docker-compose.yml` para passar variaveis SaaS ao `api` e usar hosts configuraveis no `web`.
- Atualizado `.env.example` com `SAAS_ROOT_DOMAIN`, `DEFAULT_TENANT_SLUG`, `WEB_VIRTUAL_HOSTS`, `WEB_LETSENCRYPT_HOSTS` e `LETSENCRYPT_EMAIL`.
- Adicionado teste de normalizacao e extracao de tenant a partir do host.
- Mantida a correcao de `.dockerignore` para excluir artefactos `.next` e `*.tsbuildinfo` do contexto Docker.

## Desvios ao plano

- A validacao de `prisma migrate deploy` a partir do host falhou de forma intermitente contra `postgres.tenis-management-saas.orb.local`.
- A migracao foi validada com sucesso dentro da rede Docker atraves de `docker compose run --rm api npm run prisma:deploy`, que replica melhor o caminho de producao.
- O seed executado dentro do container nao criou utilizadores de demonstracao porque o container corre com `NODE_ENV=production`. O script `create-admin` foi validado criando um admin local de teste no tenant `esaf`.

## Pendencias

- Isolar os restantes modelos de negocio por `tenantId`: planos, alunos, pagamentos, recibos, presencas, atividades e filas de comunicacao.
- Criar fluxo de pedido de demonstracao.
- Preparar provisionamento automatico de tenant trial.
- Integrar Stripe para subscricoes SaaS, separado dos pagamentos dos alunos.
