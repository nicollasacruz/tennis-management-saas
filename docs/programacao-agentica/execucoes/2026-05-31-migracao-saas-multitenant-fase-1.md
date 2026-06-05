# Execucao: migracao SaaS multitenant fase 1

## Referencia

- Plano: `docs/programacao-agentica/planos/2026-05-31-migracao-saas-multitenant-fase-1.md`
- Spec: `docs/superpowers/specs/2026-05-30-saas-jwilder-multitenant-design.md`

## Alteracoes realizadas

- Criado o modelo `Tenant` no Prisma com `slug`, `primaryHost`, `status` e campos iniciais de recibo.
- Adicionado `tenantId` a `SystemUser` com unicidade por `(tenantId, email)`.
- Criada a migracao `20260531100000_add_tenant_foundation`, que cria o tenant inicial `demo` e associa utilizadores existentes.
- Criado modulo `TenantsModule` com resolucao por `Host` e `X-Forwarded-Host`.
- Alterado login para resolver tenant antes de validar credenciais.
- Alterado JWT para incluir `tenantId`.
- Alterada validacao JWT para confirmar que o utilizador pertence ao tenant do token.
- Ajustada gestao de equipa para criar e listar utilizadores dentro do tenant da sessao.
- Ajustado `seed.ts` e `create-admin.js` para operar sobre o tenant `demo`.
- Atualizado `docker-compose.yml` para passar variaveis SaaS ao `api` e usar hosts configuraveis no `web`.
- Atualizado `.env.example` com `SAAS_ROOT_DOMAIN`, `DEFAULT_TENANT_SLUG`, `WEB_VIRTUAL_HOSTS`, `WEB_LETSENCRYPT_HOSTS` e `LETSENCRYPT_EMAIL`.
- Adicionado teste de normalizacao e extracao de tenant a partir do host.
- Mantida a correcao de `.dockerignore` para excluir artefactos `.next` e `*.tsbuildinfo` do contexto Docker.
- Adicionados `profiles: ["evolution"]` aos servicos `evolution-api` e `evolution-postgres`, mantendo o Evolution fora do deploy padrao.
- Atualizado o host configurado do Evolution para `tenisevolution.clubtenispro.com`.
- Limitado `WEB_LETSENCRYPT_HOSTS` a `tenis.clubtenispro.com`, porque os subdominios `app`, `demo` e `demo` ainda nao tinham DNS ativo e bloqueavam a emissao do certificado.

## Desvios ao plano

- A validacao de `prisma migrate deploy` a partir do host falhou de forma intermitente contra `postgres.tenis-management-saas.orb.local`.
- A migracao foi validada com sucesso dentro da rede Docker atraves de `docker compose run --rm api npm run prisma:deploy`, que replica melhor o caminho de producao.
- O seed executado dentro do container nao criou utilizadores de demonstracao porque o container corre com `NODE_ENV=production`. O script `create-admin` foi validado criando um admin local de teste no tenant `demo`.
- O primeiro deploy com subdominios em `WEB_LETSENCRYPT_HOSTS` falhou a emissao TLS para o conjunto completo, porque `app.tenis.clubtenispro.com` ainda devolvia `NXDOMAIN`. A correcao foi manter esses hosts apenas em `WEB_VIRTUAL_HOSTS` e emitir certificado inicialmente apenas para `tenis.clubtenispro.com`.

## Pendencias

- Isolar os restantes modelos de negocio por `tenantId`: planos, alunos, pagamentos, recibos, presencas, atividades e filas de comunicacao.
- Criar fluxo de pedido de demonstracao.
- Preparar provisionamento automatico de tenant trial.
- Integrar Stripe para subscricoes SaaS, separado dos pagamentos dos alunos.
- Criar DNS para `app.tenis.clubtenispro.com`, `demo.tenis.clubtenispro.com` e `demo.tenis.clubtenispro.com` antes de os adicionar a `WEB_LETSENCRYPT_HOSTS`.
