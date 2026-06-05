# Verificação — Fase 2 Multitenant: Isolamento + WhatsApp por Tenant

Referência: execução `2026-05-31-isolamento-multitenant-whatsapp-fase-2.md`.

## Comandos e resultados

```bash
npm --workspace apps/api run test
# SUCESSO — inclui test/tenant-scope.test.ts, test/whatsapp.service.test.ts e test/jwt-secret.test.ts

npm --workspace apps/api run typecheck
# SUCESSO (tsc --noEmit, sem erros)

npm --workspace apps/web run typecheck
# SUCESSO

npm run build
# SUCESSO — API (nest build) e Web (next build); rota /whatsapp presente

docker compose build api
# SUCESSO

docker compose run --rm api npm run prisma:deploy
# SUCESSO — aplicada a migração 20260531120000_add_tenant_scope_to_business

docker compose run --rm api npm run prisma:seed
# SUCESSO — uniques compostas e tenantId aceites

docker compose up -d api
# SUCESSO — boot sem erros (0 errors; warnings apenas de SMTP/pgadmin)
# GET /api/health -> {"service":"clubtenispro-api","status":"ok"}
```

## Isolamento end-to-end (via X-Forwarded-Host)

Nota: o `fetch` do Node remove o header `Host` (header proibido pela spec). Em produção o
nginx-proxy define `X-Forwarded-Host`; os testes usaram esse header. Criado um segundo
tenant `demo` (`demo.tenis.clubtenispro.com`) com admin próprio.

| Verificação | Resultado |
|---|---|
| Login demo (host demo) | 200, tenantId `tenant_demo` |
| Login demo (host demo) | 200, tenantId do demo |
| `GET /students` (demo) | `[Inês Duarte, João Matos, Rita Nunes]` (3) |
| `GET /students` (demo) | `[]` — não vê dados do demo |
| `GET /dashboard/summary` (demo) | `activeStudents = 3` (agregação isolada) |
| `GET /whatsapp/config` (demo) | 200, `configured:false`, `instanceName:"demo"` |
| `GET /students` com token demo no host demo | **401** (mismatch host↔token) |

## Falhas conhecidas / notas
- A porta do Postgres não é publicada no host; migração/seed corridos via Docker (caminho de produção).
- O tenant `demo` foi criado apenas no ambiente local de testes (não versionado).
- `instanceToken` é guardado em claro na BD — cifrar em repouso fica como endurecimento futuro.

## Riscos residuais
- Hosts neutros/sem tenant resolvido não servem dados (a extension lança sem contexto) — comportamento desejado.
- Novos tenants precisam de DNS+TLS do seu host antes de uso real (preparado nas fases anteriores).
