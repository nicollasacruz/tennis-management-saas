import { Injectable, Logger } from '@nestjs/common';
import {
  BillingProvider,
  CheckoutSession,
  CompletedPayment,
  CreateCheckoutInput,
} from './billing-provider';

// Implementação real do Stripe (assinatura mensal). O pacote `stripe` é
// carregado em runtime para NÃO ser dependência obrigatória no modo mock.
// Para ativar em produção:
//   npm --workspace apps/api install stripe
//   STRIPE_SECRET_KEY=sk_live_/sk_test_...
//   STRIPE_PRICE_ID=price_...            (preço recorrente mensal)
//   STRIPE_WEBHOOK_SECRET=whsec_...
@Injectable()
export class StripeBillingProvider implements BillingProvider {
  readonly name = 'stripe';
  private readonly logger = new Logger(StripeBillingProvider.name);
  private readonly stripe: any;
  private readonly priceId = process.env.STRIPE_PRICE_ID;

  constructor() {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Stripe = require('stripe');
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-06-20',
    });
    this.logger.log('Stripe billing provider ativo');
  }

  async createCheckoutSession(
    input: CreateCheckoutInput,
  ): Promise<CheckoutSession> {
    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: this.priceId, quantity: 1 }],
      customer_email: input.adminEmail,
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      metadata: {
        onboardingSessionId: input.onboardingSessionId,
        slug: input.slug,
      },
      subscription_data: { metadata: { slug: input.slug } },
    });
    return { provider: this.name, sessionId: session.id, url: session.url };
  }

  // Usado pelo endpoint de webhook (requer raw body). Verifica a assinatura.
  constructEvent(rawBody: Buffer, signature: string): any {
    return this.stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  }

  extractCompletedPayment(event: any): CompletedPayment | null {
    if (event?.type !== 'checkout.session.completed') return null;
    const s = event.data.object;
    return {
      sessionId: s.id,
      stripeCustomerId: s.customer ?? undefined,
      stripeSubscriptionId: s.subscription ?? undefined,
    };
  }
}
