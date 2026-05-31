# Verificacao: migracao SaaS multitenant fase 1

## Comandos executados

```bash
npm --workspace apps/api run test
```

Resultado: sucesso.

```bash
npm --workspace apps/api run typecheck
```

Resultado: sucesso.

```bash
npm --workspace apps/web run typecheck
```

Resultado: sucesso.

```bash
npm run build
```

Resultado: sucesso. A API compilou com NestJS e a Web compilou com Next.js.

```bash
docker compose build api
```

Resultado: sucesso. A imagem local da API foi reconstruida com a nova migracao.

```bash
docker compose run --rm api npm run prisma:deploy
```

Resultado: sucesso. A migracao `20260531100000_add_tenant_foundation` foi aplicada na base local atraves da rede Docker.

```bash
docker compose run --rm api npm run prisma:seed
```

Resultado: sucesso. O seed executou sem erros; em container de producao nao cria utilizadores de demonstracao por causa de `NODE_ENV=production`.

```bash
docker compose run --rm api npm run user:create-admin -- --name "Admin Teste" --email admin@esaf.local --password esaf123 --tenant esaf
```

Resultado: sucesso. O script criou um admin local no tenant `esaf`.

## Evidencias de base de dados

```sql
select slug, "primaryHost", status from "Tenant" order by slug;
```

Resultado observado:

```txt
slug | primaryHost                | status
esaf | esaf.tenis.esaf.run.place  | ACTIVE
```

## Falhas conhecidas

- `npm --workspace apps/api run prisma:deploy` executado a partir do host falhou de forma intermitente contra `postgres.tenis-management-saas.orb.local`. A conectividade TCP chegou a responder, mas o Prisma devolveu `P1001` em nova tentativa.
- A validacao final da migracao foi feita pelo caminho Docker (`api -> postgres`), que e o caminho usado em producao.

## Riscos residuais

- A fase 1 ainda nao isola todos os dados de negocio por tenant; apenas estabelece tenant no login, JWT e utilizadores internos.
- Endpoints de planos, alunos, pagamentos, recibos, presencas, atividades e comunicacoes continuam a precisar de filtros por `tenantId`.
