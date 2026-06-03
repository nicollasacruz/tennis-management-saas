import { Injectable, Logger } from '@nestjs/common';
import {
  CheckoutSession,
  CompletedPayment,
  CreateCheckoutInput,
  InvoiceDocument,
  SubscriptionBillingProvider,
  SubscriptionInfo,
  WebhookBillingProvider,
} from './billing-provider';

// Implementação real do Stripe (assinatura mensal). O pacote `stripe` é
// carregado em runtime para NÃO ser dependência obrigatória no modo mock.
// Para ativar em produção:
//   npm --workspace apps/api install stripe
//   STRIPE_SECRET_KEY=sk_live_/sk_test_...
//   STRIPE_PRICE_ID=price_...            (preço recorrente mensal)
//   STRIPE_WEBHOOK_SECRET=whsec_...
@Injectable()
export class StripeBillingProvider
  implements WebhookBillingProvider, SubscriptionBillingProvider
{
  readonly name = 'stripe';
  private readonly logger = new Logger(StripeBillingProvider.name);
  private readonly stripe: any;
  private readonly priceId = process.env.STRIPE_PRICE_ID;

  constructor() {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY é obrigatório para activar o Stripe.');
    }
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Stripe = require('stripe');
    // Sem apiVersion fixa: usa a versão fixada pelo próprio SDK, evitando drift
    // contra uma data antiga embutida no código.
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    this.logger.log('Stripe billing provider ativo');
  }

  // Stripe Checkout aceita códigos como 'pt'/'en'/'es' ou 'auto'.
  private checkoutLocale(locale?: string): string {
    const code = (locale ?? '').trim().toLowerCase();
    return ['pt', 'en', 'es'].includes(code) ? code : 'auto';
  }

  async createCheckoutSession(
    input: CreateCheckoutInput,
  ): Promise<CheckoutSession> {
    if (!this.priceId) {
      throw new Error('STRIPE_PRICE_ID é obrigatório para activar o Stripe.');
    }

    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      locale: this.checkoutLocale(input.locale),
      line_items: [{ price: this.priceId, quantity: 1 }],
      customer_email: input.adminEmail,
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      client_reference_id: input.onboardingSessionId,
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
    // Só provisiona quando o primeiro pagamento da assinatura foi cobrado
    // (ou dispensado). Evita criar a escola num checkout não pago.
    if (s.payment_status && !['paid', 'no_payment_required'].includes(s.payment_status)) {
      return null;
    }
    return {
      sessionId: s.id,
      stripeCustomerId: s.customer ?? undefined,
      stripeSubscriptionId: s.subscription ?? undefined,
      invoiceId: s.invoice ?? undefined,
    };
  }

  // Baixa o PDF da invoice (primeira cobrança da assinatura). Best-effort:
  // qualquer falha devolve null para não bloquear o provisionamento.
  async fetchInvoicePdf(invoiceId: string): Promise<InvoiceDocument | null> {
    try {
      const invoice = await this.stripe.invoices.retrieve(invoiceId);
      const url: string | undefined = invoice?.invoice_pdf;
      if (!url) return null;
      const res = await fetch(url);
      if (!res.ok) {
        this.logger.warn(`Download da invoice ${invoiceId} falhou: HTTP ${res.status}`);
        return null;
      }
      const content = Buffer.from(await res.arrayBuffer());
      const number = invoice?.number ?? invoiceId;
      return {
        filename: `fatura-${number}.pdf`,
        content,
        contentType: 'application/pdf',
      };
    } catch (err) {
      this.logger.warn(
        `Não foi possível obter o PDF da invoice ${invoiceId}: ${
          err instanceof Error ? err.message : 'erro'
        }`,
      );
      return null;
    }
  }

  // Estado da assinatura (para o painel gerencial e a aba Conta). Best-effort:
  // devolve null se a assinatura não existir ou o Stripe falhar.
  async getSubscription(subscriptionId: string): Promise<SubscriptionInfo | null> {
    try {
      const sub = await this.stripe.subscriptions.retrieve(subscriptionId, {
        expand: ['items.data.price.product'],
      });
      const price = sub?.items?.data?.[0]?.price;
      const product = price?.product;
      return {
        status: sub?.status ?? 'unknown',
        currentPeriodEnd: sub?.current_period_end
          ? new Date(sub.current_period_end * 1000).toISOString()
          : null,
        amount: typeof price?.unit_amount === 'number' ? price.unit_amount : null,
        currency: price?.currency ?? null,
        interval: price?.recurring?.interval ?? null,
        productName:
          product && typeof product === 'object' && 'name' in product
            ? (product.name as string)
            : null,
      };
    } catch (err) {
      this.logger.warn(
        `Não foi possível obter a assinatura ${subscriptionId}: ${
          err instanceof Error ? err.message : 'erro'
        }`,
      );
      return null;
    }
  }

  async createBillingPortalSession(
    customerId: string,
    returnUrl: string,
  ): Promise<string> {
    const session = await this.stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
    return session.url;
  }
}
