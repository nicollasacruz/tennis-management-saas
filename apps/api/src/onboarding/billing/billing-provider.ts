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
