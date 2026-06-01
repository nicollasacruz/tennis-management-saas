import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { OnboardingService } from './onboarding.service';

// Rotas PÚBLICAS (sem JwtAuthGuard). Servem o apex (clubtenispro.com) onde
// qualquer pessoa cria a sua escola. O TenantContextMiddleware é soft, então
// a ausência de tenant aqui é esperada.
@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly onboarding: OnboardingService) {}

  @Get('slug')
  checkSlug(@Query('slug') slug: string) {
    return this.onboarding.checkSlug(slug ?? '');
  }

  @Post('checkout')
  checkout(@Body() dto: CreateCheckoutDto) {
    return this.onboarding.createCheckout(dto);
  }

  // Conclusão simulada do pagamento (substitui o webhook Stripe no modo mock).
  @Post('mock/complete')
  mockComplete(@Body('sessionId') sessionId: string) {
    return this.onboarding.mockComplete(sessionId);
  }
}
