import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { resolveJwtSecret } from '../auth/jwt-secret';
import { OnboardingModule } from '../onboarding/onboarding.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PlatformAuthController } from './platform-auth.controller';
import { PlatformAuthService } from './platform-auth.service';
import { PlatformController } from './platform.controller';
import { PlatformJwtStrategy } from './platform-jwt.strategy';
import { PlatformService } from './platform.service';

@Module({
  imports: [
    PrismaModule,
    OnboardingModule, // reuso do BILLING_PROVIDER (Stripe/mock)
    PassportModule,
    JwtModule.register({
      secret: resolveJwtSecret(),
      signOptions: { expiresIn: '8h' },
    }),
  ],
  controllers: [PlatformAuthController, PlatformController],
  providers: [PlatformAuthService, PlatformService, PlatformJwtStrategy],
})
export class PlatformModule {}
