# ClubTenisPro

Sistema pequeno de gestão de pagamentos e emissão de recibos para a clubes de ténis.

## Stack

- Frontend: React + Vite
- Backend: NestJS + Prisma
- Base de dados: PostgreSQL
- Infra: Docker Compose para deploy numa VPS

## Funcionalidades

- cadastro de alunos e planos
- cadastro da equipe técnica e users internos do sistema
- dados fiscais do aluno e do responsável para menores
- registo de pagamentos com estado pago, pendente e em atraso
- emissão de recibos em PDF
- dashboard com visão mensal
- seed opcional para ambientes de demonstração

## Executar em Docker

1. Copie o ficheiro de ambiente:

```bash
cp .env.example .env
```

2. Suba a stack:

```bash
docker compose up --build -d
```

Por padrão, a produção sobe sem seed. Se quiser carregar dados de demonstração num ambiente local ou de staging:

```bash
RUN_SEED_ON_BOOT=true docker compose up --build -d
```

Se já tinha uma base PostgreSQL criada em testes anteriores e quer reaplicar as migrações do zero:

```bash
docker compose down -v
docker compose up --build -d
```

3. Aceda ao sistema:

- Frontend: `http://localhost:8080`
- API: `http://localhost:8080/api`

## Seed manual

Se precisar executar o seed manualmente:

```bash
docker compose exec api npm run prisma:seed
```

## Criar admin em produção

Dentro do serviço `api` já em execução:

```bash
docker compose exec api npm run user:create-admin -- --name "Admin Demo" --email admin@demo.clubtenispro.com --password "troque-esta-password"
```

Alternativa usando variáveis de ambiente para evitar gravar a password no histórico:

```bash
docker compose exec \
  -e ADMIN_NAME="Admin Demo" \
  -e ADMIN_EMAIL="admin@demo.clubtenispro.com" \
  -e ADMIN_PASSWORD="troque-esta-password" \
  api \
  npm run user:create-admin
```

O comando é idempotente por email: se o utilizador já existir, ele é promovido para `ADMIN`, reativado e a password é atualizada.

## Desenvolvimento local

Depois de instalar o Node.js 20+:

```bash
npm install
npm run db:generate
npm run dev:api
npm run dev:web
```

Sugestão para a API em desenvolvimento: usar `apps/web/.env.local` com `VITE_API_BASE_URL=http://localhost:3000/api`.

## CI/CD (GitHub Actions)

O repositório inclui o workflow `.github/workflows/ci-cd.yml` com:

- **CI** em `pull_request` e `push` para `main`:
  - `npm ci`
  - `npm run lint`
  - `npm run typecheck`
  - `npm run build`
- **CD** em `push` para `main`:
  - deploy via SSH para o servidor
  - `docker compose up -d --build`
  - `prisma migrate deploy` explícito
  - health check com 12 tentativas (60s total)
  - rollback automático se o health check falhar

### Secrets necessários

Configurar os seguintes secrets no repositório:

- `DEPLOY_HOST` — host/IP da VPS
- `DEPLOY_USER` — utilizador SSH
- `DEPLOY_SSH_KEY` — chave privada SSH
- `DEPLOY_PORT` — porta SSH (ex.: `22`)
- `DEPLOY_PATH` — diretório da aplicação no servidor (onde está o `docker-compose.yml`)
