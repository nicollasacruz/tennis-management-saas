// Abstração de provedor de cobrança. A implementação real é Stripe (assinatura
// mensal); o mock permite demonstrar o fluxo sem conta Stripe.

export const BILLING_PROVIDER = 'BILLING_PROVIDER';

export interface CreateCheckoutInput {
  onboardingSessionId: string;
  slug: string;
  schoolName: string;
  adminEmail: string;
  payUrl: string;
  successUrl: string;
  cancelUrl: string;
  // Código de idioma de duas letras (pt/en/es) para localizar o Stripe Checkout.
  locale?: string;
}

export interface CheckoutSession {
  provider: string;
  sessionId: string;
  url: string;
}

export interface CompletedPayment {
  sessionId: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  // Invoice da primeira cobrança da assinatura (para anexar o PDF ao email).
  invoiceId?: string;
}

// Anexo simples (evita acoplar o billing ao módulo de email).
export interface InvoiceDocument {
  filename: string;
  content: Buffer;
  contentType: string;
}

// Estado da assinatura, normalizado a partir do Stripe. Usado no painel
// gerencial (visão por escola) e na aba "Conta" de cada tenant.
export interface SubscriptionInfo {
  status: string; // active | past_due | canceled | trialing | ...
  currentPeriodEnd: string | null; // ISO
  amount: number | null; // cents (preço recorrente)
  currency: string | null;
  interval: string | null; // 'month'
  productName: string | null;
}

// Capacidades extra disponíveis apenas no provedor real (Stripe). O mock não
// implementa — quem consome verifica com `supportsSubscriptions()`.
export interface SubscriptionBillingProvider {
  getSubscription(subscriptionId: string): Promise<SubscriptionInfo | null>;
  // Devolve a URL do Stripe Customer Portal para o cliente gerir a faturação.
  createBillingPortalSession(
    customerId: string,
    returnUrl: string,
  ): Promise<string>;
}

export function supportsSubscriptions(
  provider: BillingProvider,
): provider is BillingProvider & SubscriptionBillingProvider {
  return (
    typeof (provider as Partial<SubscriptionBillingProvider>).getSubscription ===
      'function' &&
    typeof (provider as Partial<SubscriptionBillingProvider>)
      .createBillingPortalSession === 'function'
  );
}

export interface BillingProvider {
  readonly name: string;
  createCheckoutSession(input: CreateCheckoutInput): Promise<CheckoutSession>;
}

export interface WebhookBillingProvider extends BillingProvider {
  constructEvent(rawBody: Buffer, signature: string): unknown;
  extractCompletedPayment(event: unknown): CompletedPayment | null;
  // Baixa o PDF da invoice Stripe para anexar ao email de boas-vindas.
  fetchInvoicePdf(invoiceId: string): Promise<InvoiceDocument | null>;
}
