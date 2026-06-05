# ClubTenisPro — Frontend Web

Frontend da aplicação ClubTenisPro, construído com [Next.js](https://nextjs.org) (App Router) + React 19 + Tailwind CSS v4.

## Desenvolvimento local

A partir da raiz do monorepo:

```bash
# Instalar dependências de todos os workspaces
npm install

# Iniciar o servidor de desenvolvimento do frontend (http://localhost:5173)
npm run dev:web
```

O frontend espera que a API esteja a correr em `http://localhost:3000`. Para iniciar a API:

```bash
npm run dev:api
```

### Variáveis de ambiente

Criar o ficheiro `apps/web/.env.local` com:

```env
NEXT_PUBLIC_API_BASE_URL=/api
```

Em desenvolvimento local sem Docker, apontar directamente para a API:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api
```

## Estrutura de pastas

```
src/
├── app/
│   ├── page.tsx              # Landing page pública
│   ├── login/page.tsx        # Página de login
│   ├── layout.tsx            # Root layout (providers)
│   ├── globals.css           # Tailwind CSS v4 + tema
│   └── (app)/                # Route group autenticado
│       ├── layout.tsx        # Layout com navegação
│       ├── dashboard/
│       ├── alunos/
│       ├── planos/
│       ├── pagamentos/
│       ├── equipa/
│       └── presencas/
├── components/
│   ├── auth-provider.tsx     # Contexto de autenticação
│   └── query-provider.tsx    # TanStack Query provider
├── lib/
│   ├── api.ts                # Helper apiRequest + login
│   ├── query-client.ts       # Configuração QueryClient
│   └── utils.ts              # Formatadores e constantes
└── types/index.ts            # Tipos TypeScript partilhados
```

## Build de produção

```bash
# Build standalone (usado pelo Docker)
npm --workspace apps/web run build
```

Para mais detalhes sobre a arquitectura e convenções do projecto, consultar o [`AGENTS.md`](../../AGENTS.md) na raiz do repositório.
