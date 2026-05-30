# CI/CD e Ambiente da VPS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrigir o workflow de CI/CD e criar o `.env` inicial no clone da VPS sem sobrescrever segredos existentes.

**Architecture:** O workflow passa a validar o caminho de deploy, correr testes de API, evitar health check por porta publica fixa e remover a migracao Prisma duplicada. O PostgreSQL desta stack fica interno ao Docker, sem publicar a porta `5432` na VPS. O `.env` da VPS e criado a partir do ambiente antigo quando disponivel, preservando segredos e ajustando apenas valores operacionais do novo SaaS.

**Tech Stack:** GitHub Actions, Docker Compose, NestJS, Prisma, Next.js, jwilder/nginx-proxy, Ubuntu VPS.

---

### Task 1: Corrigir workflow CI/CD

**Files:**
- Modify: `.github/workflows/ci-cd.yml`

- [ ] **Step 1: Adicionar testes da API ao CI**

Inserir apos o passo `Typecheck`:

```yaml
      - name: Testes API
        run: npm --workspace apps/api run test
```

- [ ] **Step 2: Validar `DEPLOY_PATH` antes do deploy**

No job `deploy`, expor o secret como variavel de ambiente e validar antes de `cd`:

```yaml
    env:
      DEPLOY_PATH: ${{ secrets.DEPLOY_PATH }}
```

Script:

```sh
if [ -z "${DEPLOY_PATH:-}" ]; then
  echo "DEPLOY_PATH nao configurado."
  exit 1
fi

cd "$DEPLOY_PATH"
```

- [ ] **Step 3: Remover dependencia de `WEB_PORT` no health check**

Substituir o health check HTTP por um comando executado dentro do container `web`:

```sh
docker compose exec -T web node -e "fetch('http://127.0.0.1/api/health').then((res) => { if (res.status !== 200) process.exit(1); }).catch(() => process.exit(1));"
```

- [ ] **Step 4: Remover migracao Prisma duplicada do workflow**

Remover estes comandos do script de deploy porque a API ja executa `prisma migrate deploy` no arranque do container:

```sh
docker compose exec -T api npx prisma migrate deploy
```

- [ ] **Step 5: Rever diff**

Executar:

```bash
git diff -- .github/workflows/ci-cd.yml
```

Esperado: diff apenas no workflow.

### Task 2: Criar `.env` no servidor

**Files:**
- Modify: `docker-compose.yml`
- Remote create: `/root/projects/tennis-management-saas/.env`

- [ ] **Step 1: Verificar estado remoto**

Executar:

```bash
ssh root@62.169.28.198 "test -f /root/projects/tennis-management-saas/.env && echo NEW_ENV_EXISTS || echo NEW_ENV_MISSING"
```

Esperado antes da criacao: `NEW_ENV_MISSING`.

- [ ] **Step 2: Manter PostgreSQL interno**

Remover a publicacao de porta do servico `postgres`:

```yaml
  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_USER: ${POSTGRES_USER}
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 5
    volumes:
      - postgres_data:/var/lib/postgresql/data
```

- [ ] **Step 3: Criar `.env` preservando segredos antigos**

Executar comando remoto que copia `/root/projects/tenis-management/.env` quando existir e ajusta valores do novo SaaS:

```bash
ssh root@62.169.28.198 "cd /root/projects/tennis-management-saas && cp /root/projects/tenis-management/.env .env && chmod 600 .env"
```

- [ ] **Step 4: Ajustar variaveis operacionais**

Garantir no `.env` remoto:

```env
WEB_PORT=8081
SAAS_ROOT_DOMAIN=tenis.esaf.run.place
WEB_VIRTUAL_HOSTS=app.tenis.esaf.run.place,demo.tenis.esaf.run.place,esaf.tenis.esaf.run.place
WEB_LETSENCRYPT_HOSTS=app.tenis.esaf.run.place,demo.tenis.esaf.run.place,esaf.tenis.esaf.run.place
LETSENCRYPT_EMAIL=nicollasacruz@gmail.com
PUBLIC_API_BASE_URL=https://esaf.tenis.esaf.run.place/api
EVOLUTION_GO_VIRTUAL_HOST=evolution.tenis.esaf.run.place
```

- [ ] **Step 5: Verificar sem imprimir segredos**

Executar:

```bash
ssh root@62.169.28.198 "cd /root/projects/tennis-management-saas && grep -E '^(WEB_PORT|SAAS_ROOT_DOMAIN|WEB_VIRTUAL_HOSTS|WEB_LETSENCRYPT_HOSTS|LETSENCRYPT_EMAIL|PUBLIC_API_BASE_URL|EVOLUTION_GO_VIRTUAL_HOST)=' .env"
```

Esperado: apenas variaveis nao sensiveis.

### Task 3: Validar e versionar

**Files:**
- Modify: `.github/workflows/ci-cd.yml`
- Create: `docs/superpowers/plans/2026-05-30-cicd-env-hardening.md`

- [ ] **Step 1: Validar YAML visualmente**

Executar:

```bash
sed -n '1,140p' .github/workflows/ci-cd.yml
```

Esperado: indentacao valida e passos na ordem correta.

- [ ] **Step 2: Correr testes locais relevantes**

Executar:

```bash
npm --workspace apps/api run test
```

Esperado: testes da API passam.

- [ ] **Step 3: Commit**

Executar:

```bash
git add .github/workflows/ci-cd.yml docs/superpowers/plans/2026-05-30-cicd-env-hardening.md
git commit -m "ci(deploy): reforcar workflow de producao"
```
