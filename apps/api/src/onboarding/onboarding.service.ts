import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { SystemUserRole, TenantStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  BILLING_PROVIDER,
  BillingProvider,
  CompletedPayment,
  WebhookBillingProvider,
} from './billing/billing-provider';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { isReservedSlug } from './reserved-slugs';

// 3-40 chars, a-z0-9 e hífen interno, sem hífen nas pontas.
const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/;
const ONBOARDING_STATUS = {
  PENDING: 'PENDING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
} as const;

@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);

  constructor(
    // Cliente base (NÃO isolado por tenant): cria Tenant + SystemUser com
    // tenantId explícito, como o auth/seed.
    private readonly prisma: PrismaService,
    @Inject(BILLING_PROVIDER) private readonly billing: BillingProvider,
    private readonly mail: MailService,
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

  private normalizeLocale(locale?: string): string {
    const normalized = (locale ?? 'pt').trim().toLowerCase();
    return /^[a-z]{2}$/.test(normalized) ? normalized : 'pt';
  }

  private localizedPath(path: string, locale?: string): string {
    return `/${this.normalizeLocale(locale)}${path}`;
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
        status: ONBOARDING_STATUS.PENDING,
      },
    });

    const base = this.publicBase();
    const locale = this.normalizeLocale(dto.locale);
    const checkout = await this.billing.createCheckoutSession({
      onboardingSessionId: session.id,
      slug,
      schoolName: session.schoolName,
      adminEmail: session.adminEmail,
      locale,
      payUrl: `${base}${this.localizedPath(
        '/onboarding/pay?session={CHECKOUT_SESSION_ID}',
        locale,
      )}`,
      successUrl: `${base}${this.localizedPath(
        '/onboarding/sucesso?session={CHECKOUT_SESSION_ID}',
        locale,
      )}`,
      cancelUrl: `${base}${this.localizedPath('/onboarding?cancel=1', locale)}`,
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

  async getCheckoutResult(sessionId: string) {
    if (!sessionId) {
      throw new BadRequestException('session é obrigatório');
    }

    const session = await this.prisma.onboardingSession.findUnique({
      where: { providerSessionId: sessionId },
    });

    if (!session) {
      throw new NotFoundException('Sessão de onboarding não encontrada');
    }

    if (
      session.status === ONBOARDING_STATUS.COMPLETED &&
      session.createdTenantId
    ) {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: session.createdTenantId },
      });
      if (tenant) {
        return { status: session.status, ...this.result(tenant) };
      }
    }

    return {
      status: session.status,
      slug: session.slug,
      name: session.schoolName,
    };
  }

  async handleStripeWebhook(rawBody: Buffer | undefined, signature: string) {
    if (this.billing.name !== 'stripe') {
      return { received: true, ignored: true };
    }
    if (!rawBody) {
      throw new BadRequestException('Corpo raw do webhook Stripe em falta');
    }
    if (!signature) {
      throw new BadRequestException('Assinatura Stripe em falta');
    }

    const stripeBilling = this.billing as WebhookBillingProvider;
    let event: unknown;
    try {
      event = stripeBilling.constructEvent(rawBody, signature);
    } catch (err) {
      // Assinatura inválida ou corpo adulterado: 400 (a Stripe não repete).
      this.logger.warn(
        `Webhook Stripe rejeitado: ${
          err instanceof Error ? err.message : 'assinatura inválida'
        }`,
      );
      throw new BadRequestException('Assinatura Stripe inválida');
    }

    const payment = stripeBilling.extractCompletedPayment(event);
    if (payment) {
      await this.provision(payment);
    }

    return { received: true };
  }

  // Provisiona o tenant a partir de um pagamento concluído. Idempotente.
  async provision(payment: CompletedPayment) {
    const session = await this.prisma.onboardingSession.findUnique({
      where: { providerSessionId: payment.sessionId },
    });
    if (!session) {
      throw new NotFoundException('Sessão de onboarding não encontrada');
    }

    if (
      session.status === ONBOARDING_STATUS.COMPLETED &&
      session.createdTenantId
    ) {
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
        data: { status: ONBOARDING_STATUS.FAILED },
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
          status: ONBOARDING_STATUS.COMPLETED,
          createdTenantId: t.id,
          stripeCustomerId: payment.stripeCustomerId ?? null,
        },
      });
      return t;
    });

    this.logger.log(
      `Tenant provisionado slug=${tenant.slug} host=${tenant.primaryHost}`,
    );

    await this.sendWelcomeEmail(
      { adminEmail: session.adminEmail, adminName: session.adminName },
      tenant,
      payment,
    );

    return this.result(tenant);
  }

  // Email de boas-vindas: link de acesso + email de login, com o PDF da invoice
  // em anexo quando o provider suporta. Best-effort: nunca falha o provisionamento.
  private async sendWelcomeEmail(
    admin: { adminEmail: string; adminName: string },
    tenant: { slug: string; primaryHost: string; name: string },
    payment: CompletedPayment,
  ): Promise<void> {
    try {
      const { appUrl } = this.result(tenant);

      const attachments = [] as {
        filename: string;
        content: Buffer;
        contentType: string;
      }[];
      const provider = this.billing as Partial<WebhookBillingProvider>;
      if (payment.invoiceId && typeof provider.fetchInvoicePdf === 'function') {
        const doc = await provider.fetchInvoicePdf(payment.invoiceId);
        if (doc) attachments.push(doc);
      }

      const subject = `A sua escola ${tenant.name} está pronta — Tênis Clube Pro`;
      const text = [
        `Olá ${admin.adminName},`,
        ``,
        `A conta da escola "${tenant.name}" foi criada e a assinatura mensal está ativa.`,
        ``,
        `Aceda em: ${appUrl}`,
        `Email de acesso: ${admin.adminEmail}`,
        `(Use a palavra-passe definida durante o registo.)`,
        ``,
        attachments.length
          ? `Em anexo segue a fatura do primeiro pagamento.`
          : `A fatura do pagamento fica disponível na sua conta Stripe.`,
        ``,
        `Tênis Clube Pro`,
      ].join('\n');
      const html = `
        <p>Olá ${admin.adminName},</p>
        <p>A conta da escola <strong>${tenant.name}</strong> foi criada e a assinatura mensal está ativa.</p>
        <p>
          <a href="${appUrl}" style="display:inline-block;padding:12px 20px;background:#0f1f15;color:#fff;border-radius:10px;font-weight:bold;text-decoration:none">Entrar na sua escola</a>
        </p>
        <p>Endereço: <a href="${appUrl}">${appUrl}</a><br/>
        Email de acesso: <strong>${admin.adminEmail}</strong><br/>
        <span style="color:#566857">Use a palavra-passe definida durante o registo.</span></p>
        <p>${
          attachments.length
            ? 'Em anexo segue a fatura do primeiro pagamento.'
            : 'A fatura do pagamento fica disponível na sua conta Stripe.'
        }</p>
        <p style="color:#566857">Tênis Clube Pro</p>
      `;

      await this.mail.send({
        to: admin.adminEmail,
        subject,
        text,
        html,
        attachments,
      });
    } catch (err) {
      this.logger.warn(
        `Email de boas-vindas não enviado (slug=${tenant.slug}): ${
          err instanceof Error ? err.message : 'erro'
        }`,
      );
    }
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
