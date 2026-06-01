// Abstração de provedor de cobrança. A implementação real é Stripe (assinatura
// mensal); o mock permite demonstrar o fluxo sem conta Stripe.

export const BILLING_PROVIDER = 'BILLING_PROVIDER';

export interface CreateCheckoutInput {
  onboardingSessionId: string;
  slug: string;
  schoolName: string;
  adminEmail: string;
  successUrl: string;
  cancelUrl: string;
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
}

export interface BillingProvider {
  readonly name: string;
  createCheckoutSession(input: CreateCheckoutInput): Promise<CheckoutSession>;
}
