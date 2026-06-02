import { Injectable, Logger } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import {
  BillingProvider,
  CheckoutSession,
  CreateCheckoutInput,
} from './billing-provider';

// Provedor de cobrança simulado: imita o Stripe Checkout sem conta real.
// O "checkout" aponta para uma página de pagamento fake no web; a conclusão é
// disparada por POST /api/onboarding/mock/complete (no lugar do webhook Stripe).
@Injectable()
export class MockBillingProvider implements BillingProvider {
  readonly name = 'mock';
  private readonly logger = new Logger(MockBillingProvider.name);

  async createCheckoutSession(
    input: CreateCheckoutInput,
  ): Promise<CheckoutSession> {
    const sessionId = `mock_cs_${randomBytes(12).toString('hex')}`;
    const url = input.payUrl.replace(
      '{CHECKOUT_SESSION_ID}',
      encodeURIComponent(sessionId),
    );
    this.logger.log(
      `(mock) checkout criado slug=${input.slug} session=${sessionId}`,
    );
    return { provider: this.name, sessionId, url };
  }
}
