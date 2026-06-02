# Onboarding Stripe Rápido Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar onboarding SaaS rápido com Stripe Checkout alojado para o plano mensal de 39,90 euros.

**Architecture:** O frontend mantém uma página curta de captura e resumo. A API cria sessões de checkout via provider de billing, recebe webhook Stripe, provisiona tenant/admin e expõe um endpoint público de resultado para a página de sucesso.

**Tech Stack:** Next.js 16, React 19, NestJS 10, Prisma 5, Stripe SDK, TypeScript.

---

### Task 1: Backend Stripe e Resultado

**Files:**
- Modify: `apps/api/src/main.ts`
- Modify: `apps/api/src/onboarding/billing/billing-provider.ts`
- Modify: `apps/api/src/onboarding/billing/mock-billing.provider.ts`
- Modify: `apps/api/src/onboarding/billing/stripe-billing.provider.ts`
- Modify: `apps/api/src/onboarding/dto/create-checkout.dto.ts`
- Modify: `apps/api/src/onboarding/onboarding.controller.ts`
- Modify: `apps/api/src/onboarding/onboarding.service.ts`
- Create: `apps/api/test/onboarding.service.test.ts`
- Create: `apps/api/test/stripe-billing.provider.test.ts`

- [ ] Add failing tests for checkout URLs, result lookup and Stripe provider payload.
- [ ] Enable raw request body for Stripe webhook validation.
- [ ] Add optional locale to checkout DTO and pass a localized mock pay URL.
- [ ] Add Stripe webhook handling and result lookup in OnboardingService.
- [ ] Validate `STRIPE_PRICE_ID` before creating Stripe sessions.

### Task 2: Frontend Onboarding UI

**Files:**
- Modify: `apps/web/src/app/[locale]/onboarding/page.tsx`
- Modify: `apps/web/src/app/[locale]/onboarding/pay/page.tsx`
- Modify: `apps/web/src/app/[locale]/onboarding/sucesso/page.tsx`

- [ ] Replace the plain onboarding form with a compact conversion-first layout matching the existing app UI.
- [ ] Show the monthly plan summary: 39,90 euros, cobrança imediata, sem teste grátis.
- [ ] Keep slug availability validation and clear errors.
- [ ] Make success page poll the API result endpoint when it receives a Stripe session id.
- [ ] Keep mock payment page functional for local mode.

### Task 3: Configuração e Verificação

**Files:**
- Modify: `.env.example`
- Modify: `docker-compose.yml`
- Modify: `apps/api/package.json`
- Modify: `package-lock.json`

- [ ] Add Stripe dependency to the API workspace.
- [ ] Add documented Stripe environment variables.
- [ ] Pass Stripe env vars into the API container.
- [ ] Run API tests and typecheck.
- [ ] Build web/API and smoke-test local endpoints.
