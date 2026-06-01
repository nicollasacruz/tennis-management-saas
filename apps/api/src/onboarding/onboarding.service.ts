import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { OnboardingStatus, SystemUserRole, TenantStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import {
  BILLING_PROVIDER,
  BillingProvider,
  CompletedPayment,
} from './billing/billing-provider';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { isReservedSlug } from './reserved-slugs';

// 3-40 chars, a-z0-9 e hífen interno, sem hífen nas pontas.
const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/;

@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);

  constructor(
    // Cliente base (NÃO isolado por tenant): cria Tenant + SystemUser com
    // tenantId explícito, como o auth/seed.
    private readonly prisma: PrismaService,
    @Inject(BILLING_PROVIDER) private readonly billing: BillingProvider,
  ) {}

  private rootDomain(): string {
    return process.env.SAAS_ROOT_DOMAIN ?? 'localhost';
  }

  private hostFor(slug: string): string {
    return `${slug}.${this.rootDomain()}`;
  }

  private appScheme(): string {
    return (process.env.ONBOARDING_PUBLIC_BASE_URL ?? '').startsWith('http://')
      ? 'http'
      : 'https';
  }

  private publicBase(): string {
    return (
      process.env.ONBOARDING_PUBLIC_BASE_URL ?? `https://${this.rootDomain()}`
    ).replace(/\/$/, '');
  }

  normalizeSlug(raw: string): string {
    return (raw ?? '').trim().toLowerCase();
  }

  async checkSlug(rawSlug: string): Promise<{
    slug: string;
    available: boolean;
    reason?: string;
  }> {
    const slug = this.normalizeSlug(rawSlug);
    if (!SLUG_RE.test(slug)) {
      return {
        slug,
        available: false,
        reason: 'formato inválido (3-40, a-z 0-9 -, sem hífen nas pontas)',
      };
    }
    if (isReservedSlug(slug)) {
      return { slug, available: false, reason: 'slug reservado' };
    }
    const existing = await this.prisma.tenant.findUnique({ where: { slug } });
    if (existing) {
      return { slug, available: false, reason: 'já está em uso' };
    }
    return { slug, available: true };
  }

  async createCheckout(dto: CreateCheckoutDto) {
    const check = await this.checkSlug(dto.slug);
    if (!check.available) {
      throw new BadRequestException(`Slug indisponível: ${check.reason}`);
    }
    const slug = check.slug;
    const passwordHash = await bcrypt.hash(dto.password, 10);

    const session = await this.prisma.onboardingSession.create({
      data: {
        schoolName: dto.schoolName.trim(),
        slug,
        adminName: dto.adminName.trim(),
        adminEmail: dto.adminEmail.trim().toLowerCase(),
        passwordHash,
        provider: this.billing.name,
        status: OnboardingStatus.PENDING,
      },
    });

    const base = this.publicBase();
    const checkout = await this.billing.createCheckoutSession({
      onboardingSessionId: session.id,
      slug,
      schoolName: session.schoolName,
      adminEmail: session.adminEmail,
      successUrl: `${base}/onboarding/sucesso?session={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${base}/onboarding?cancel=1`,
    });

    await this.prisma.onboardingSession.update({
      where: { id: session.id },
      data: { providerSessionId: checkout.sessionId },
    });

    return {
      checkoutUrl: checkout.url,
      sessionId: checkout.sessionId,
      provider: checkout.provider,
    };
  }

  // Provisiona o tenant a partir de um pagamento concluído. Idempotente.
  async provision(payment: CompletedPayment) {
    const session = await this.prisma.onboardingSession.findUnique({
      where: { providerSessionId: payment.sessionId },
    });
    if (!session) {
      throw new NotFoundException('Sessão de onboarding não encontrada');
    }

    if (session.status === OnboardingStatus.COMPLETED && session.createdTenantId) {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: session.createdTenantId },
      });
      if (tenant) return this.result(tenant);
    }

    const taken = await this.prisma.tenant.findUnique({
      where: { slug: session.slug },
    });
    if (taken) {
      await this.prisma.onboardingSession.update({
        where: { id: session.id },
        data: { status: OnboardingStatus.FAILED },
      });
      throw new ConflictException('Slug já foi ocupado entretanto');
    }

    const tenant = await this.prisma.$transaction(async (tx) => {
      const t = await tx.tenant.create({
        data: {
          name: session.schoolName,
          slug: session.slug,
          primaryHost: this.hostFor(session.slug),
          status: TenantStatus.ACTIVE,
          stripeCustomerId: payment.stripeCustomerId ?? null,
          stripeSubscriptionId: payment.stripeSubscriptionId ?? null,
        },
      });
      await tx.systemUser.create({
        data: {
          tenantId: t.id,
          fullName: session.adminName,
          email: session.adminEmail,
          password: session.passwordHash,
          role: SystemUserRole.ADMIN,
          isActive: true,
        },
      });
      await tx.onboardingSession.update({
        where: { id: session.id },
        data: {
          status: OnboardingStatus.COMPLETED,
          createdTenantId: t.id,
          stripeCustomerId: payment.stripeCustomerId ?? null,
        },
      });
      return t;
    });

    this.logger.log(
      `Tenant provisionado slug=${tenant.slug} host=${tenant.primaryHost}`,
    );
    return this.result(tenant);
  }

  // Caminho do mock: completa o pagamento manualmente (no lugar do webhook).
  async mockComplete(sessionId: string) {
    if (this.billing.name !== 'mock') {
      throw new BadRequestException(
        'mock/complete só está disponível com o provider mock',
      );
    }
    if (!sessionId) {
      throw new BadRequestException('sessionId é obrigatório');
    }
    const tail = sessionId.slice(-8);
    return this.provision({
      sessionId,
      stripeCustomerId: `mock_cus_${tail}`,
      stripeSubscriptionId: `mock_sub_${tail}`,
    });
  }

  private result(tenant: { slug: string; primaryHost: string; name: string }) {
    return {
      slug: tenant.slug,
      host: tenant.primaryHost,
      appUrl: `${this.appScheme()}://${tenant.primaryHost}`,
      name: tenant.name,
    };
  }
}
