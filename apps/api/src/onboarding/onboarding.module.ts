import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { BILLING_PROVIDER } from './billing/billing-provider';
import { MockBillingProvider } from './billing/mock-billing.provider';
import { StripeBillingProvider } from './billing/stripe-billing.provider';
import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from './onboarding.service';

@Module({
  imports: [PrismaModule],
  controllers: [OnboardingController],
  providers: [
    OnboardingService,
    {
      // Stripe quando há chave configurada; caso contrário, mock para a demo.
      provide: BILLING_PROVIDER,
      useFactory: () =>
        process.env.STRIPE_SECRET_KEY
          ? new StripeBillingProvider()
          : new MockBillingProvider(),
    },
  ],
})
export class OnboardingModule {}
