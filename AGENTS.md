# ClubTenisPro

Sistema de gestão de pagamentos, presenças e emissão de recibos para a Clube de Ténis Demo. A aplicação é monolíngue em português: comentários de código, documentação e interface do utilizador estão todos em português de Portugal.

## Visão geral da arquitetura

O projeto segue uma arquitetura monorepo simples com `npm workspaces`:

- **`apps/api`** — Backend REST em NestJS + Prisma + PostgreSQL.
- **`apps/web`** — Frontend em Next.js 16 (App Router) + React 19 + Tailwind CSS v4.

A aplicação frontend usa o App Router do Next.js. As páginas públicas (`/`, `/login`) são separadas das páginas autenticadas através do route group `(app)`, que partilham um layout com navegação (top nav + mobile drawer). O frontend comunica com a API via rewrites do Next.js (`/api/*` → serviço backend).

## Stack tecnológica

| Camada | Tecnologia |
|--------|-----------|
| Frontend | Next.js 16, React 19, TypeScript 5, Tailwind CSS v4 |
| Backend | NestJS 10, Prisma 5, TypeScript 5 |
| Base de dados | PostgreSQL 16 |
| Auth | JWT (Passport.js), bcrypt |
| Data fetching | TanStack Query (React Query) v5 |
| Ícones | lucide-react |
| PDFs | pdf-lib |
| Infra | Docker Compose |

## Estrutura do código

```
├── package.json              # Root do workspace npm
├── tsconfig.base.json        # Configuração base TypeScript
├── docker-compose.yml        # Stack completa (postgres + api + web)
├── .env.example              # Variáveis de ambiente de exemplo
├── apps/
│   ├── api/
│   │   ├── src/
│   │   │   ├── main.ts                 # Entrypoint NestJS
│   │   │   ├── app.module.ts           # Módulo raiz
│   │   │   ├── prisma/
│   │   │   │   ├── prisma.service.ts   # PrismaClient injectable
│   │   │   │   └── prisma.module.ts
│   │   │   ├── auth/                   # Login JWT, strategy, guard, decorator @CurrentUser
│   │   │   ├── students/               # CRUD alunos + histórico de status + categoria etária
│   │   │   ├── plans/                  # CRUD planos
│   │   │   ├── payments/               # Pagamentos, liquidação, recibos PDF, cobranças mensais
│   │   │   ├── system-users/           # Utilizadores internos (equipa técnica)
│   │   │   ├── dashboard/              # Resumo estatístico
│   │   │   └── attendances/            # Matriz de presenças
│   │   ├── prisma/
│   │   │   ├── schema.prisma           # Modelo de dados Prisma
│   │   │   ├── seed.ts                 # Dados de demonstração
│   │   │   ├── create-admin.js         # CLI para criar/promover admin
│   │   │   ├── delete-payments-month.js
│   │   │   └── migrations/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── nest-cli.json
│   └── web/
│       ├── src/
│       │   ├── app/
│       │   │   ├── page.tsx            # Landing page pública
│       │   │   ├── login/page.tsx      # Página de login
│       │   │   ├── layout.tsx          # Root layout (providers)
│       │   │   ├── globals.css         # Tailwind CSS v4 + tema customizado
│       │   │   └── (app)/              # Route group autenticado
│       │   │       ├── layout.tsx      # Layout com navegação (top nav + drawer mobile)
│       │   │       ├── dashboard/page.tsx
│       │   │       ├── alunos/page.tsx
│       │   │       ├── alunos/novo/page.tsx
│       │   │       ├── alunos/[id]/editar/page.tsx
│       │   │       ├── planos/page.tsx
│       │   │       ├── planos/novo/page.tsx
│       │   │       ├── pagamentos/page.tsx
│       │   │       ├── pagamentos/novo/page.tsx
│       │   │       ├── pagamentos/[id]/editar/page.tsx
│       │   │       ├── equipa/page.tsx
│       │   │       ├── equipa/novo/page.tsx
│       │   │       └── presencas/page.tsx
│       │   ├── components/
│       │   │   ├── auth-provider.tsx   # React Context para auth + localStorage
│       │   │   └── query-provider.tsx  # QueryClientProvider
│       │   ├── lib/
│       │   │   ├── api.ts              # apiRequest helper + login
│       │   │   ├── query-client.ts     # QueryClient com staleTime 5min
│       │   │   └── utils.ts            # Formatadores de moeda/data + constantes
│       │   └── types/index.ts          # Tipos TypeScript partilhados
│       ├── package.json
│       ├── tsconfig.json
│       ├── next.config.ts              # output: 'standalone' + rewrites /api
│       └── postcss.config.mjs
```

## Comandos de build e desenvolvimento

Comandos disponíveis no root do projeto:

```bash
# Instalar dependências de todos os workspaces
npm install

# Gerar cliente Prisma
npm run db:generate

# Correr migrações Prisma (dev)
npm run db:migrate

# Seed de dados de demonstração
npm run db:seed

# Desenvolvimento local (correr em terminais separados)
npm run dev:api     # API em http://localhost:3000
npm run dev:web     # Web em http://localhost:5173

# Build de produção de todos os workspaces
npm run build

# Lint e typecheck
npm run lint
npm run typecheck
```

Comandos específicos do `apps/api`:

```bash
npm --workspace apps/api run start:dev
npm --workspace apps/api run prisma:generate
npm --workspace apps/api run prisma:migrate
npm --workspace apps/api run prisma:deploy    # Migrações em produção
npm --workspace apps/api run prisma:seed
npm --workspace apps/api run user:create-admin -- --name "Admin" --email admin@demo.clubtenispro.com --password "senha"
npm --workspace apps/api run payments:delete-month
```

### Docker Compose

```bash
# Copiar ambiente
cp .env.example .env

# Subir stack completa (sem seed)
docker compose up --build -d

# Subir com dados de demonstração
RUN_SEED_ON_BOOT=true docker compose up --build -d

# URLs padrão
# Frontend: http://localhost:8080
# API:      http://localhost:8080/api
```

O container da API executa automaticamente `prisma migrate deploy` no arranque. O seed só corre se `RUN_SEED_ON_BOOT=true`.

## Convenções de código

### Idioma
- Todo o código, comentários e mensagens de erro estão em **português de Portugal**.
- Nomes de variáveis e funções usam camelCase em português (ex: `competencyMonth`, `fullName`, `responsibleName`).

### Tipos e validação
- O backend usa DTOs com `class-validator` + `class-transformer`.
- Propriedades obrigatórias usam `!` (definite assignment assertion) nos DTOs.
- Validações comuns: `@IsString()`, `@IsEmail()`, `@IsDateString()`, `@MaxLength()`, `@IsEnum()`.
- O NIF português é validado com regex `^\d{9}$`.
- Telefone é obrigatório para emissão de recibos.
- Menores de idade exigem `responsibleName` e `responsibleTaxId`.

### Moeda
- Todos os valores monetários são armazenados em **cents** (inteiro) para evitar problemas de ponto flutuante. Ex: €65,00 = `6500`.
- A formatação para apresentação usa `Intl.NumberFormat('pt-PT', { currency: 'EUR', style: 'currency' })`.
- Acréscimo de treino físico: `PHYSICAL_TRAINING_SURCHARGE_CENTS = 500` (€5).

### Datas
- O frontend lida com datas como strings `YYYY-MM-DD` e meses como `YYYY-MM`.
- O backend converte para objetos `Date` e usa `class-transformer` quando necessário.
- As datas de presença são tratadas como UTC date-only (`Date.UTC(ano, mês-1, dia)`).

### Organização de módulos NestJS
- Cada domínio tem o seu próprio módulo: `students.module.ts`, `students.controller.ts`, `students.service.ts`.
- DTOs ficam dentro de `dto/` dentro do módulo.
- Todos os controladores (exceto auth) usam `@UseGuards(JwtAuthGuard)`.

### Frontend Next.js
- O frontend usa o App Router com route group `(app)` para páginas autenticadas.
- Todos os componentes de página e de cliente que usam hooks devem ter `'use client'` no topo.
- Data fetching via `@tanstack/react-query` usando `apiRequest<T>()` helper.
- Invalidação de queries após mutações: `queryClient.invalidateQueries({ queryKey: ['students'] })`.
- As chamadas à API passam pelo rewrite do Next.js (`/api/*`). A variável pública é `NEXT_PUBLIC_API_BASE_URL`.

### Estilos
- Tailwind CSS v4 com `@import "tailwindcss"` e `@theme inline`.
- Paleta de cores customizada: fundo `#f4f7ed`, texto `#183223`, acento `#c6f05c`.
- Fontes: Manrope (sans-serif) e IBM Plex Mono (monospace).
- Scrollbars customizados via CSS puro (`::-webkit-scrollbar`).

## Modelo de dados (Prisma)

Principais modelos:

- **Plan** — Planos de mensalidade (nome, valor em cents, número de sessões).
- **Student** — Alunos (dados pessoais, fiscais, plano atual, estado ativo/inativo, dados do responsável para menores, categoria etária calculada a partir da data de nascimento, histórico de inscrições).
- **SystemUser** — Utilizadores internos (admin, treinadores, financeiro, secretaria).
- **Payment** — Pagamentos mensais (estado: PENDING, PAID, OVERDUE; método: MBWAY, CASH, BANK_TRANSFER, CARD).
- **Receipt** — Recibos emitidos automaticamente quando um pagamento é liquidado.
- **Attendance** — Registo de presenças por dia (unique: studentId + attendanceDate).
- **StudentStatusHistory** — Histórico de ativação/desativação de alunos com colapso de round-trip no mesmo dia.

Enums importantes:
- `PaymentStatus`: `PENDING`, `PAID`, `OVERDUE`
- `PaymentMethod`: `MBWAY`, `CASH`, `BANK_TRANSFER`, `CARD`
- `SystemUserRole`: `ADMIN`, `HEAD_COACH`, `COACH`, `FINANCE`, `DESK`
- `FirstMonthBillingPolicy`: `PRORATA`, `FULL_WITH_MAKEUP`
- `StudentSex`: `FEMALE`, `MALE`, `OTHER`

## Autenticação e segurança

- Autenticação baseada em JWT com `passport-jwt`.
- Token expira em **8 horas**.
- Passwords hasheadas com **bcrypt** (salt rounds: 10).
- CORS configurado via variável `FRONTEND_ORIGIN` (pode ser `*` ou lista de origins separadas por vírgula).
- O token e dados do utilizador são guardados em `localStorage` no frontend (chaves: `token`, `user`).
- Em caso de 401, o frontend limpa o localStorage e redireciona para `/login`.
- Todos os endpoints (exceto login) exigem o header `Authorization: Bearer <token>`.
- O decorator `@CurrentUser` extrai o payload JWT do request.

## Geração de recibos PDF

Quando um pagamento passa para o estado `PAID`, um recibo é criado automaticamente com número sequencial:

```
Formato: REC-YYYYMM-SEQUENCE
Exemplo: REC-202603-0001
```

O PDF é gerado com `pdf-lib` e inclui:
- Logo da escola (carregado de URL externa via `BRAND_LOGO_URL`)
- Dados de faturação (nome, NIF, telefone)
- Descrição da cobrança
- Bloco de assinatura
- Rodapé com paginação

O endpoint para download é: `GET /api/payments/:id/receipt.pdf`

Para menores de idade, os dados fiscais do responsável são usados no recibo. Se não existirem dados fiscais completos, a emissão do recibo falha com `BadRequestException`.

## Cobranças mensais

O sistema permite gerar cobranças mensais automaticamente para todos os alunos ativos com plano atribuído e matrícula válida. O valor base é a mensalidade do plano, com um acréscimo de **500 cents (€5)** se o aluno fizer treino físico (`doesPhysicalTraining`).

Endpoint: `POST /api/payments/generate-current-month`

A data de vencimento é calculada com base na data de início da matrícula. Se a data canónica for anterior à data de geração, usa a data de geração.

## Variáveis de ambiente

As variáveis obrigatórias estão definidas em `.env.example`:

```
POSTGRES_DB=clubtenispro
POSTGRES_USER=clubtenispro
POSTGRES_PASSWORD=...
DATABASE_URL=postgresql://.../clubtenispro?schema=public
PORT=3000
FRONTEND_ORIGIN=http://localhost:8080
WEB_PORT=8080
RUN_SEED_ON_BOOT=false
RECEIPT_ISSUER=Clube de Ténis Demo
RECEIPT_SIGNATURE_LABEL=Direção Clube Demo
BRAND_LOGO_URL=https://...
```

No frontend (`apps/web/.env.local`):
```
NEXT_PUBLIC_API_BASE_URL=/api
```

Em desenvolvimento local (sem Docker), pode ser necessário apontar diretamente para a API:
```
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api
```

## Estratégia de testes

O projeto **não possui suite de testes automatizados** atualmente. Não existem configurações de Jest, Vitest, Playwright ou outras ferramentas de teste.

## Considerações de deploy

- A stack é concebida para correr numa única VPS via Docker Compose.
- O serviço `web` usa Next.js `output: 'standalone'` e expõe a porta 80 via `node server.js`.
- O serviço `api` expõe a porta 3000 internamente; no Docker Compose usa `expose` em vez de `ports`.
- O frontend faz proxy/reverse para a API através dos rewrites do Next.js (`/api/*`).
- A rede externa `reverse-proxy` é usada em produção para integração com nginx-proxy + Let's Encrypt.
- O comando de criação de admin (`user:create-admin`) é idempotente por email: se o utilizador já existir, é promovido a `ADMIN`, reativado e a password é atualizada.

## Notas para agentes de código

- **Manter a língua portuguesa** em todos os textos visíveis ao utilizador, mensagens de erro e comentários.
- **Usar cents para dinheiro** sempre que guardar ou transmitir valores monetários.
- **Validar NIF com 9 dígitos** quando adicionar campos fiscais; telefone obrigatório para recibos.
- **Proteger endpoints com `@UseGuards(JwtAuthGuard)`** exceto rotas de autenticação públicas.
- Ao modificar o schema Prisma, correr `npm run db:generate` e criar uma migração com `npm run db:migrate`.
- No frontend, usar `'use client'` quando necessário (hooks, event handlers). Data fetching via TanStack Query.
- Invalidar queries relevantes após mutações para manter a UI sincronizada.
- O layout autenticado `app/(app)/layout.tsx` já gere redirecionamento para `/login` quando não há utilizador autenticado.
