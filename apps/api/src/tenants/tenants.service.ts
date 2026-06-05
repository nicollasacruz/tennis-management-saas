import {
  BadRequestException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { TenantStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  BillingProvider,
  BILLING_PROVIDER,
  supportsSubscriptions,
} from '../onboarding/billing/billing-provider';
import {
  extractTenantSlugFromHost,
  normalizeTenantHost,
  resolveRequestHost,
} from './tenant-host';
import { UpdateTenantSettingsDto } from './dto/update-tenant-settings.dto';

type HeadersLike = Record<string, string | string[] | undefined>;

@Injectable()
export class TenantsService {
  constructor(
    private prisma: PrismaService,
    @Inject(BILLING_PROVIDER) private readonly billing: BillingProvider,
  ) {}

  async getSettings(tenantId: string) {
    const tenant = await this.prisma.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        slug: true,
        primaryHost: true,
        status: true,
        logoUrl: true,
        receiptIssuer: true,
        receiptSignatureLabel: true,
        updatedAt: true,
      },
    });

    return tenant;
  }

  async updateSettings(tenantId: string, dto: UpdateTenantSettingsDto) {
    const name = this.optionalTrim(dto.name);
    const logoUrl = this.optionalTrim(dto.logoUrl);
    const receiptIssuer = this.optionalTrim(dto.receiptIssuer);
    const receiptSignatureLabel = this.optionalTrim(dto.receiptSignatureLabel);

    if (dto.name !== undefined && !name) {
      throw new BadRequestException('O nome da organização é obrigatório.');
    }

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        ...(dto.name !== undefined ? { name: name! } : {}),
        ...(dto.logoUrl !== undefined ? { logoUrl } : {}),
        ...(dto.receiptIssuer !== undefined ? { receiptIssuer } : {}),
        ...(dto.receiptSignatureLabel !== undefined ? { receiptSignatureLabel } : {}),
      },
    });

    return this.getSettings(tenantId);
  }

  // Visão geral da assinatura do tenant (aba "Conta"). Estado vem do Stripe;
  // `configured: false` quando não há assinatura ou o Stripe está em modo mock.
  async getSubscription(tenantId: string) {
    const tenant = await this.prisma.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      select: { stripeSubscriptionId: true },
    });

    if (!tenant.stripeSubscriptionId || !supportsSubscriptions(this.billing)) {
      return { configured: false, subscription: null };
    }

    const subscription = await this.billing.getSubscription(
      tenant.stripeSubscriptionId,
    );

    return { configured: !!subscription, subscription };
  }

  // Abre o Stripe Customer Portal para o tenant gerir a faturação. Restrito a
  // ADMIN no controlador.
  async createBillingPortal(tenantId: string, returnUrl?: string) {
    if (!supportsSubscriptions(this.billing)) {
      throw new BadRequestException('Gestão de faturação indisponível.');
    }

    const tenant = await this.prisma.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      select: { stripeCustomerId: true, primaryHost: true },
    });

    if (!tenant.stripeCustomerId) {
      throw new BadRequestException(
        'Esta organização não tem cliente Stripe associado.',
      );
    }

    const url = await this.billing.createBillingPortalSession(
      tenant.stripeCustomerId,
      this.resolveReturnUrl(returnUrl, tenant.primaryHost),
    );

    return { url };
  }

  private resolveReturnUrl(
    returnUrl: string | undefined,
    primaryHost: string,
  ): string {
    const fallback = `https://${primaryHost}`;

    if (!returnUrl) {
      return fallback;
    }

    try {
      const parsed = new URL(returnUrl);
      return ['http:', 'https:'].includes(parsed.protocol)
        ? returnUrl
        : fallback;
    } catch {
      return fallback;
    }
  }

  async resolveFromHeaders(headers: HeadersLike) {
    const host = resolveRequestHost({
      host: headers.host,
      xForwardedHost: headers['x-forwarded-host'],
    });

    return this.resolveByHost(host);
  }

  /**
   * Versão suave de resolveFromHeaders: devolve `null` em vez de lançar quando
   * o host não mapeia um tenant. Usada pelo middleware para abrir o contexto
   * de tenant sem bloquear rotas públicas/neutras (ex.: health check).
   */
  async tryResolveFromHeaders(headers: HeadersLike) {
    try {
      return await this.resolveFromHeaders(headers);
    } catch {
      return null;
    }
  }

  async resolveByHost(host: string | null) {
    const normalizedHost = normalizeTenantHost(host);
    const byHost = normalizedHost
      ? await this.prisma.tenant.findUnique({
          where: { primaryHost: normalizedHost },
        })
      : null;

    if (byHost) {
      return this.ensureTenantAvailable(byHost);
    }

    const rootDomain = process.env.SAAS_ROOT_DOMAIN;
    const slugFromHost = rootDomain
      ? extractTenantSlugFromHost(normalizedHost, rootDomain)
      : null;
    const slug = slugFromHost ?? this.defaultTenantSlug();

    if (!slug) {
      throw new UnauthorizedException('Organização não identificada para este acesso.');
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { slug },
    });

    if (!tenant) {
      throw new UnauthorizedException('Organização não encontrada ou indisponível.');
    }

    return this.ensureTenantAvailable(tenant);
  }

  private defaultTenantSlug(): string | null {
    const configured = process.env.DEFAULT_TENANT_SLUG?.trim();

    if (configured) {
      return configured;
    }

    return process.env.NODE_ENV === 'production' ? null : 'demo';
  }

  private ensureTenantAvailable<T extends { status: TenantStatus }>(tenant: T): T {
    if (tenant.status === TenantStatus.ACTIVE || tenant.status === TenantStatus.TRIALING) {
      return tenant;
    }

    throw new UnauthorizedException('Organização inativa ou indisponível.');
  }

  private optionalTrim(value: string | undefined): string | null {
    if (value === undefined) {
      return null;
    }

    const trimmed = value.trim();
    return trimmed || null;
  }
}
