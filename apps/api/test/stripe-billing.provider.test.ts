import 'reflect-metadata';
import assert from 'node:assert/strict';
import Module from 'node:module';

async function main() {
  const previousSecret = process.env.STRIPE_SECRET_KEY;
  const previousPrice = process.env.STRIPE_PRICE_ID;
  process.env.STRIPE_SECRET_KEY = 'sk_test_local';
  delete process.env.STRIPE_PRICE_ID;

  const originalLoad = (Module as any)._load;
  let capturedPayload: any = null;

  (Module as any)._load = function patchedLoad(request: string) {
    if (request === 'stripe') {
      return class StripeMock {
        checkout = {
          sessions: {
            create: async (payload: any) => {
              capturedPayload = payload;
              return { id: 'cs_test_123', url: 'https://checkout.stripe.test/cs_test_123' };
            },
          },
        };
        webhooks = {
          constructEvent: () => ({
            type: 'checkout.session.completed',
            data: {
              object: {
                id: 'cs_test_123',
                customer: 'cus_123',
                subscription: 'sub_123',
              },
            },
          }),
        };
      };
    }
    return originalLoad.apply(this, arguments as any);
  };

  try {
    const { StripeBillingProvider } = await import('../src/onboarding/billing/stripe-billing.provider');

    await assert.rejects(
      async () =>
        new StripeBillingProvider().createCheckoutSession({
          onboardingSessionId: 'onb_1',
          slug: 'clube',
          schoolName: 'Clube',
          adminEmail: 'admin@clube.pt',
          successUrl: 'https://app/sucesso',
          cancelUrl: 'https://app/cancelar',
          payUrl: 'https://app/pay',
        } as any),
      /STRIPE_PRICE_ID/,
    );

    process.env.STRIPE_PRICE_ID = 'price_mensal_3990';
    const provider = new StripeBillingProvider();
    const session = await provider.createCheckoutSession({
      onboardingSessionId: 'onb_1',
      slug: 'clube',
      schoolName: 'Clube',
      adminEmail: 'admin@clube.pt',
      successUrl: 'https://app/sucesso',
      cancelUrl: 'https://app/cancelar',
      payUrl: 'https://app/pay',
    } as any);

    assert.equal(session.sessionId, 'cs_test_123');
    assert.equal(session.url, 'https://checkout.stripe.test/cs_test_123');
    assert.equal(capturedPayload.mode, 'subscription');
    assert.deepEqual(capturedPayload.line_items, [
      { price: 'price_mensal_3990', quantity: 1 },
    ]);
    assert.equal(capturedPayload.customer_email, 'admin@clube.pt');
    assert.equal(capturedPayload.locale, 'auto');
    assert.equal(capturedPayload.metadata.onboardingSessionId, 'onb_1');
    assert.equal(capturedPayload.subscription_data.metadata.slug, 'clube');

    const ptSession = await provider.createCheckoutSession({
      onboardingSessionId: 'onb_2',
      slug: 'clube',
      schoolName: 'Clube',
      adminEmail: 'admin@clube.pt',
      successUrl: 'https://app/sucesso',
      cancelUrl: 'https://app/cancelar',
      payUrl: 'https://app/pay',
      locale: 'pt',
    } as any);
    assert.equal(ptSession.sessionId, 'cs_test_123');
    assert.equal(capturedPayload.locale, 'pt');

    const payment = provider.extractCompletedPayment(
      provider.constructEvent(Buffer.from('{}'), 'assinatura'),
    );
    assert.deepEqual(payment, {
      sessionId: 'cs_test_123',
      stripeCustomerId: 'cus_123',
      stripeSubscriptionId: 'sub_123',
      invoiceId: undefined,
    });

    // Guarda de payment_status: checkout não pago não provisiona.
    assert.equal(
      provider.extractCompletedPayment({
        type: 'checkout.session.completed',
        data: { object: { id: 'cs_x', payment_status: 'unpaid' } },
      }),
      null,
    );
    assert.deepEqual(
      provider.extractCompletedPayment({
        type: 'checkout.session.completed',
        data: {
          object: { id: 'cs_y', payment_status: 'paid', customer: 'cus_y' },
        },
      }),
      {
        sessionId: 'cs_y',
        stripeCustomerId: 'cus_y',
        stripeSubscriptionId: undefined,
        invoiceId: undefined,
      },
    );
    // Captura o id da invoice quando presente (para anexar o PDF).
    assert.equal(
      provider.extractCompletedPayment({
        type: 'checkout.session.completed',
        data: {
          object: { id: 'cs_z', payment_status: 'paid', invoice: 'in_z' },
        },
      })?.invoiceId,
      'in_z',
    );
    // Evento irrelevante é ignorado.
    assert.equal(
      provider.extractCompletedPayment({ type: 'invoice.paid', data: { object: {} } }),
      null,
    );
  } finally {
    (Module as any)._load = originalLoad;
    if (previousSecret === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = previousSecret;
    if (previousPrice === undefined) delete process.env.STRIPE_PRICE_ID;
    else process.env.STRIPE_PRICE_ID = previousPrice;
  }

  console.log('stripe-billing.provider: OK');
}

void main();
