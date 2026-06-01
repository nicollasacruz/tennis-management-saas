# Transformacao SaaS com jwilder/nginx-proxy

## Contexto

O produto atual e uma aplicacao monolingue em portugues para a gestao operacional e financeira da ESAF: alunos, planos, mensalidades, presencas, recibos PDF, equipa, dashboard e comunicacoes por email/WhatsApp.

A transformacao pretendida e converter este produto numa plataforma SaaS para escolas e clubes, mantendo a VPS atual e o `jwilder/nginx-proxy` como reverse proxy central, porque existem outras aplicacoes no mesmo servidor que dependem desse modelo.

## Objetivos

- Suportar varios clientes no mesmo produto, com isolamento por tenant.
- Usar subdominios conhecidos no MVP e deixar a aplicacao preparada para wildcard.
- Manter compatibilidade com `jwilder/nginx-proxy` e `letsencrypt-nginx-proxy-companion`.
- Preparar o caminho para pedido de demonstracao, trial, provisioning automatico e subscricoes Stripe.
- Evitar misturar pagamentos SaaS com mensalidades dos alunos.

## Fora de escopo nesta fase

- Trocar `jwilder/nginx-proxy` por Traefik, Caddy ou Kubernetes.
- Criar stacks Docker independentes por cliente.
- Implementar custom domains de clientes.
- Implementar Stripe antes do isolamento multi-tenant estar concluido.
- Reescrever a UI publica completa.

## Dominio e subdominios

Dominio base escolhido:

```txt
tenis.esaf.run.place
```

Subdominios iniciais:

```txt
tenis.esaf.run.place
app.tenis.esaf.run.place
demo.tenis.esaf.run.place
esaf.tenis.esaf.run.place
```

Significado:

- `tenis.esaf.run.place`: entrada publica inicial e host com TLS ativo no MVP.
- `app.tenis.esaf.run.place`: portal central, login neutro ou futura listagem de tenants.
- `demo.tenis.esaf.run.place`: ambiente de demonstracao.
- `esaf.tenis.esaf.run.place`: tenant inicial que preserva os dados e operacao ESAF.

Preparacao futura:

```txt
*.tenis.esaf.run.place
```

A aplicacao deve resolver tenants por `Host` desde a primeira fase, mesmo que o proxy comece com uma lista fixa de hosts.

## Estrategia com jwilder/nginx-proxy

O reverse proxy central permanece inalterado. A stack do produto deve apenas publicar variaveis compatíveis com o proxy atual.

Configuracao alvo no `docker-compose.yml` do servico `web`:

```yaml
environment:
  API_BASE_URL: http://tenis-management-api-internal:3000
  NEXT_PUBLIC_API_BASE_URL: /api
  SAAS_ROOT_DOMAIN: ${SAAS_ROOT_DOMAIN}
  VIRTUAL_HOST: ${WEB_VIRTUAL_HOSTS}
  VIRTUAL_PORT: 80
  LETSENCRYPT_HOST: ${WEB_LETSENCRYPT_HOSTS}
  LETSENCRYPT_EMAIL: ${LETSENCRYPT_EMAIL}
```

Variaveis alvo no `.env.example`:

```env
SAAS_ROOT_DOMAIN=tenis.esaf.run.place
WEB_VIRTUAL_HOSTS=tenis.esaf.run.place,app.tenis.esaf.run.place,demo.tenis.esaf.run.place,esaf.tenis.esaf.run.place
WEB_LETSENCRYPT_HOSTS=tenis.esaf.run.place
LETSENCRYPT_EMAIL=admin@esaf.run.place
EVOLUTION_API_VIRTUAL_HOST=tenisevolution.esaf.run.place
```

Esta abordagem evita mexer nas outras apps da VPS. Para adicionar um novo tenant antes de wildcard, adiciona-se o subdominio a `WEB_VIRTUAL_HOSTS` e, apenas depois de o DNS existir e resolver para a VPS, adiciona-se tambem a `WEB_LETSENCRYPT_HOSTS`.

Nota operacional importante: o `letsencrypt-nginx-proxy-companion` tenta emitir um unico certificado para todos os dominios em `LETSENCRYPT_HOST`. Se um dos dominios nao tiver DNS ativo, a emissao inteira falha. Por isso, no MVP, `WEB_LETSENCRYPT_HOSTS` fica limitado a `tenis.esaf.run.place`, que ja resolve para a VPS. Os subdominios preparados podem permanecer em `WEB_VIRTUAL_HOSTS` sem TLS ate o DNS ser criado.

O Evolution fica pausado por defeito nesta fase. No Docker Compose, os servicos `evolution-api` e `evolution-postgres` devem ficar atras de um `profile` chamado `evolution`, para que `docker compose up -d --build` usado no deploy normal nao os religue automaticamente.

## Modelo multi-tenant

Criar um modelo `Tenant` como raiz de isolamento.

Campos iniciais recomendados:

- `id`
- `name`
- `slug`
- `primaryHost`
- `status`: `ACTIVE`, `TRIALING`, `SUSPENDED`, `ARCHIVED`
- `logoUrl`
- `receiptIssuer`
- `receiptSignatureLabel`
- `createdAt`
- `updatedAt`

Adicionar `tenantId` aos modelos de negocio:

- `Plan`
- `Student`
- `SystemUser`
- `Payment`
- `Receipt`
- `Attendance`
- `StudentStatusHistory`
- `Activity`
- `EmailJob`
- `WhatsappJob`

Regras:

- O `tenantId` nunca deve vir livremente do body, query ou header do browser.
- O tenant deve ser resolvido por hostname no login.
- Depois do login, o JWT deve incluir `tenantId`.
- Todas as queries autenticadas devem usar o `tenantId` da sessao.
- Chaves unicas globais devem ser revistas para escopo por tenant.

Exemplos de alteracoes de unicidade:

- `Plan.name` deixa de ser globalmente unico e passa a ser unico por `(tenantId, name)`.
- `Student.email` deixa de ser globalmente unico e passa a ser unico por `(tenantId, email)` quando aplicavel.
- `SystemUser.email` deve ser unico por `(tenantId, email)` para permitir o mesmo email em tenants diferentes, ou global se for decidido que o utilizador e uma identidade central.
- `Receipt.number` deve ser unico por `(tenantId, number)`.

## Resolucao de tenant

Criar um servico de resolucao de tenant no backend.

Entrada:

- `Host` ou `X-Forwarded-Host`.

Saida:

- `tenantId`
- `slug`
- `primaryHost`
- `status`

Regras:

- Em producao, aceitar apenas hosts registados em `Tenant.primaryHost` ou numa tabela futura de dominios.
- Em desenvolvimento, permitir fallback configurado por ambiente, por exemplo `DEFAULT_TENANT_SLUG=esaf`.
- `app.tenis.esaf.run.place` pode funcionar como host neutro e exigir escolha de tenant no futuro.
- `demo.tenis.esaf.run.place` deve resolver para o tenant de demonstracao.

## Autenticacao e autorizacao

O login passa a depender do tenant resolvido por hostname.

Fluxo:

1. Browser acede a `esaf.tenis.esaf.run.place`.
2. Backend resolve `tenantId` pelo hostname.
3. Login procura `SystemUser` por `(tenantId, email)`.
4. JWT inclui `sub`, `tenantId`, `email`, `role` e `fullName`.
5. `JwtStrategy` valida se o utilizador pertence ao tenant do token e esta ativo.
6. Guards e servicos usam `CurrentUser.tenantId`.

Payload recomendado:

```json
{
  "sub": "user_id",
  "tenantId": "tenant_id",
  "email": "admin@exemplo.pt",
  "role": "ADMIN",
  "fullName": "Admin"
}
```

## Isolamento de dados

Todos os servicos devem filtrar por `tenantId`.

Exemplo conceitual:

```ts
this.prisma.student.findMany({
  where: {
    tenantId: user.tenantId
  }
});
```

Operacoes sobre entidades por `id` tambem devem confirmar o tenant:

```ts
this.prisma.student.findFirst({
  where: {
    id,
    tenantId: user.tenantId
  }
});
```

Isto evita que um ID valido de outro tenant seja acedido por acidente.

## Migracao dos dados atuais

A migracao inicial deve:

1. Criar o tenant `esaf`.
2. Associar todos os dados existentes a esse tenant.
3. Criar ou ajustar hosts:
   - `esaf.tenis.esaf.run.place`
   - opcionalmente o host antigo durante transicao.
4. Manter os recibos e numeros existentes dentro do tenant ESAF.

Como o repositorio foi reiniciado do zero, a migracao deve ser feita com Prisma e testada localmente antes do deploy.

## Pedido de demonstracao

Criar um modelo `DemoRequest` para transformar o formulario publico num funil real.

Campos recomendados:

- `id`
- `fullName`
- `email`
- `phone`
- `organizationName`
- `studentEstimate`
- `sports`
- `message`
- `status`: `NEW`, `CONTACTED`, `TRIAL_CREATED`, `CONVERTED`, `ARCHIVED`
- `createdAt`
- `updatedAt`

Fluxo MVP:

1. Visitante submete pedido.
2. API grava `DemoRequest`.
3. Sistema envia email interno.
4. Equipa contacta o lead manualmente.

Fluxo futuro:

1. Pedido cria tenant trial automaticamente.
2. Sistema cria admin inicial.
3. Sistema envia email com acesso.
4. Stripe gere conversao de trial para subscricao paga.

## Stripe

Stripe deve representar a relacao comercial entre a plataforma SaaS e o cliente. Nao deve substituir o modelo atual de mensalidades dos alunos.

Modelos recomendados para fase Stripe:

- `SaasPlan`
- `TenantSubscription`
- `StripeCustomer`
- `StripeSubscription`
- `StripeWebhookEvent`

Eventos Stripe prioritarios:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

Regras:

- Webhooks devem ser idempotentes.
- O estado efetivo do tenant deve derivar da subscricao.
- `Payment` atual continua dedicado aos pagamentos dos alunos.
- O portal Stripe deve permitir atualizar metodo de pagamento e cancelar subscricao.

## Provisioning automatico

Criar um modulo `provisioning` com operacoes idempotentes.

Responsabilidades:

- Reservar slug e host.
- Criar `Tenant`.
- Criar utilizador admin.
- Criar configuracoes iniciais de recibos.
- Criar planos iniciais opcionais.
- Criar dados demo opcionais.
- Enviar email de boas-vindas.

Estados possiveis:

- `PENDING`
- `RUNNING`
- `COMPLETED`
- `FAILED`

No MVP com subdominios conhecidos, o provisioning pode criar tenants apenas para hosts ja configurados no proxy. Quando wildcard estiver ativo, o provisioning pode criar tenants sem alterar `WEB_VIRTUAL_HOSTS`.

## Impacto no frontend

Alteracoes esperadas:

- Remover acoplamento visual forte a ESAF nas areas SaaS.
- Carregar branding por tenant: nome, logo e labels.
- Login continua simples, mas tenant e inferido pelo host.
- Area publica pode ter duas camadas:
  - site comercial do SaaS em `app.tenis.esaf.run.place`;
  - landing do clube em `esaf.tenis.esaf.run.place`.

Para reduzir risco, a primeira fase pode manter a UI atual e apenas introduzir tenant/branding por baixo.

## Fases de implementacao

### Fase 1: Base de infra e tenant

- Parametrizar `docker-compose.yml` com `WEB_VIRTUAL_HOSTS`, `WEB_LETSENCRYPT_HOSTS` e `SAAS_ROOT_DOMAIN`.
- Criar `Tenant`.
- Criar tenant inicial `esaf`.
- Adicionar `tenantId` aos modelos de negocio.
- Migrar dados existentes para `esaf`.
- Resolver tenant por hostname.
- Incluir `tenantId` no JWT.
- Filtrar queries por tenant nos modulos existentes.

### Fase 2: Pedido de demonstracao

- Criar `DemoRequest`.
- Ligar formulario publico a API real.
- Enviar notificacao interna por email.
- Criar vista interna simples para pedidos.

### Fase 3: Provisioning

- Criar modulo `provisioning`.
- Criar tenant demo/trial automaticamente.
- Criar admin inicial.
- Enviar email de acesso.

### Fase 4: Stripe

- Criar modelos de subscricao SaaS.
- Integrar Stripe Checkout.
- Integrar webhooks.
- Criar Customer Portal.
- Suspender ou limitar tenants sem subscricao ativa.

### Fase 5: Wildcard e escala operacional

- Ativar DNS wildcard.
- Emitir certificado wildcard por DNS challenge ou solucao equivalente.
- Simplificar `WEB_VIRTUAL_HOSTS` para wildcard quando o proxy/certificados suportarem.
- Preparar custom domains, se o mercado justificar.

## Riscos e mitigacoes

- Vazamento de dados entre tenants: mitigar com filtros obrigatorios por `tenantId`, revisao de todas as queries e testes direcionados.
- Quebra de login: mitigar mantendo fallback local `DEFAULT_TENANT_SLUG=esaf`.
- Conflito com outras apps na VPS: mitigar mantendo `jwilder/nginx-proxy` e alterando apenas variaveis da stack deste produto.
- Certificados wildcard: adiar para fase posterior; comecar com hosts explicitos.
- Confusao entre pagamentos dos alunos e billing SaaS: manter dominios e modelos separados.
- Migracao de dados existente: testar em copia local e garantir tenant `esaf` antes de deploy.

## Criterios de aceitacao da Fase 1

- `docker-compose.yml` nao contem hosts fixos ESAF para o web; usa variaveis.
- `esaf.tenis.esaf.run.place` resolve para o tenant ESAF.
- Login em host ESAF gera JWT com `tenantId`.
- Alunos, planos, pagamentos, presencas, recibos, equipa, atividades e jobs ficam isolados por tenant.
- Dados existentes continuam acessiveis no tenant ESAF apos migracao.
- `.env.example` documenta os hosts iniciais e o dominio base.
- O sistema continua funcional em desenvolvimento local com fallback de tenant.
