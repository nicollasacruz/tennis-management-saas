# Verificacao: migracao SaaS multitenant fase 1

## Comandos executados

```bash
npm --workspace apps/api run test
```

Resultado: sucesso. Inclui teste do cliente `EvolutionApiService` para criação/conexão de instância e QR code.

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
docker compose run --rm api npm run user:create-admin -- --name "Admin Teste" --email admin@demo.clubtenispro.com --password demo123 --tenant demo
```

Resultado: sucesso. O script criou um admin local no tenant `demo`.

```bash
curl -I --max-time 20 https://tenis.clubtenispro.com/
```

Resultado: sucesso em producao sem ignorar TLS.

```txt
HTTP/2 200
server: nginx/1.29.3
strict-transport-security: max-age=31536000
```

```bash
curl -i --max-time 20 https://tenis.clubtenispro.com/api/health
```

Resultado: sucesso em producao sem ignorar TLS.

```json
{"service":"clubtenispro-api","status":"ok","timestamp":"2026-05-31T10:09:08.001Z"}
```

```bash
docker compose config --services
```

Resultado observado apos colocar Evolution em profile:

```txt
postgres
api
pgadmin
web
```

Os servicos `evolution-api` e `evolution-postgres` nao aparecem no deploy padrao; so sobem quando o profile `evolution` for ativado.

```bash
docker compose --profile evolution exec -T evolution-api wget -qO- --header apikey:dev-evolution-global-key http://127.0.0.1:8080/
```

Resultado: sucesso local. A Evolution API v2.1.1 respondeu `status=200`.

## Verificacao GitHub Actions

- Run `26708905100`: sucesso. Validou CI e deploy da fase inicial multitenant.
- Run `26709074691`: sucesso. Validou `profiles` para Evolution e dominio `tenisevolution.clubtenispro.com`.
- Run `26709696276`: sucesso. Validou o ajuste de TLS para emitir certificado apenas para `tenis.clubtenispro.com`.

Commit em producao apos a ultima verificacao:

```txt
6032734
```

## Evidencias de base de dados

```sql
select slug, "primaryHost", status from "Tenant" order by slug;
```

Resultado observado:

```txt
slug | primaryHost                | status
demo | demo.tenis.clubtenispro.com  | ACTIVE
```

## Falhas conhecidas

- `npm --workspace apps/api run prisma:deploy` executado a partir do host falhou de forma intermitente contra `postgres.tenis-management-saas.orb.local`. A conectividade TCP chegou a responder, mas o Prisma devolveu `P1001` em nova tentativa.
- A validacao final da migracao foi feita pelo caminho Docker (`api -> postgres`), que e o caminho usado em producao.
- O primeiro teste TLS de `https://tenis.clubtenispro.com` devolveu certificado de `clubtenispro.com`. A causa foi `WEB_LETSENCRYPT_HOSTS` conter tambem `app.tenis.clubtenispro.com`, `demo.tenis.clubtenispro.com` e `demo.tenis.clubtenispro.com`, que ainda nao tinham DNS ativo. O companion falhou a emissao multi-domain e o nginx manteve o certificado antigo.

## Riscos residuais

- A fase 1 ainda nao isola todos os dados de negocio por tenant; apenas estabelece tenant no login, JWT e utilizadores internos.
- Endpoints de planos, alunos, pagamentos, recibos, presencas, atividades e comunicacoes continuam a precisar de filtros por `tenantId`.
- Os subdominios preparados em `WEB_VIRTUAL_HOSTS` ainda precisam de DNS e TLS antes de serem usados por clientes.
